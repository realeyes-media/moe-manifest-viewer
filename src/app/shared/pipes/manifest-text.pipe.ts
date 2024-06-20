import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ManifestLineObject } from '..';
import { CueType } from '../models/sctce35Types';

export type SubstrIdc = { start: number; end: number }[];
export interface FormattedIndices {
  tag: string;
  idc: SubstrIdc;
}
@Pipe({
  name: 'manifestText',
})
export class ManifestText implements PipeTransform {
  constructor(private domSanitizer: DomSanitizer) {}

  public transform(value: string, textToHighlight: string, lineObj?: ManifestLineObject): string | SafeHtml {
    let replaceArrs: FormattedIndices[] | null = null;
    let htmlStr = value;
    if (lineObj) {
      if (lineObj.media && lineObj.attributes && lineObj.attributes.URI) {
        const uri = lineObj.attributes.URI;
        const indices: FormattedIndices = {
          tag: '<span class="text-url">',
          idc: this.getIndicesFromStr(value, uri),
        };
        if (!replaceArrs) {
          replaceArrs = [indices];
        }
      }
      if (lineObj.str && (lineObj.str.includes('.vtt') || lineObj.str.includes('.webvtt'))) {
        const uri = lineObj.str;
        const indices: FormattedIndices = {
          tag: '<span class="text-url">',
          idc: this.getIndicesFromStr(value, uri),
        };
        if (!replaceArrs) {
          replaceArrs = [indices];
        }
      }
      if (lineObj.str && lineObj.str.includes('#EXT-X-SCTE35:CUE')) {
        const SCTE35: RegExp = /#EXT-X-SCTE35:CUE="([^"]+)/g;
        const uri = SCTE35.exec(lineObj.str);
        if (uri !== null) {
          const indices: FormattedIndices = {
            tag: '<span class="text-url">',
            idc: this.getIndicesFromStr(value, uri[1]),
          };
          if (!replaceArrs) {
            replaceArrs = [indices];
          }
        }
      }
      if (lineObj.str && lineObj.str.includes(`#EXT-X-CUE:TYPE="${CueType.GENERIC_CUE_TYPE_SCTE35}"`)) {
        const CUE: RegExp = /CUE="([^"]+)/g;
        const uri = CUE.exec(lineObj.str);
        if (uri !== null) {
          const indices: FormattedIndices = {
            tag: '<span class="text-url">',
            idc: this.getIndicesFromStr(value, uri[1]),
          };
          if (!replaceArrs) {
            replaceArrs = [indices];
          }
        }
      }
    }

    if (textToHighlight) {
      textToHighlight = textToHighlight.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      let termRegEx: RegExp = /$^/;
      let invalidMatch = false;
      let highlightIndices: FormattedIndices | null = null;
      if (textToHighlight[0] === '/' && textToHighlight[textToHighlight.length - 1] === '/' && textToHighlight.length > 2) {
        const sliced = textToHighlight.slice(1, -1);
        try {
          termRegEx = new RegExp(sliced === '.' ? '.+' : sliced, 'g');
        } catch (e) {
          console.log('invalid regex in pipe');
          invalidMatch = true;
        }
        if (''.match(termRegEx)) {
          invalidMatch = true;
        }
        if (!invalidMatch) {
          highlightIndices = {
            tag: '<span class="text-hightlight">',
            idc: this.getIndicesFromRegex(value, termRegEx),
          };
        }
      } else {
        highlightIndices = {
          tag: '<span class="text-hightlight">',
          idc: this.getIndicesFromStr(value, textToHighlight),
        };
        if (!replaceArrs) {
          replaceArrs = [highlightIndices];
        } else {
          replaceArrs.push(highlightIndices);
        }
      }
      if (highlightIndices) {
        if (!replaceArrs) {
          replaceArrs = [highlightIndices];
        } else {
          replaceArrs.push(highlightIndices);
        }
      }
    }
    if (replaceArrs && replaceArrs.length) {
      htmlStr = this.generateReplacedHtml(htmlStr, ...replaceArrs);
    }
    return this.domSanitizer.bypassSecurityTrustHtml(htmlStr);
  }

  private generateReplacedHtml = (str: string, ...arrs: FormattedIndices[]) => {
    let newStr = '';
    const openTags: string[] = [];
    for (let stringIdx = 0; stringIdx < str.length; stringIdx++) {
      for (const idxMap of arrs) {
        for (const idxPair of idxMap.idc) {
          if (idxPair.start === stringIdx) {
            for (const tag of openTags) {
              newStr += '</span>';
            }
            newStr += idxMap.tag;
            for (const tag of openTags) {
              newStr += tag;
            }
            openTags.push(idxMap.tag);
          }
          if (idxPair.end === stringIdx) {
            const openIndex = openTags.indexOf(idxMap.tag);
            for (const tag of openTags) {
              newStr += '</span>';
            }
            if (openIndex > -1) {
              openTags.splice(openIndex, 1);
            }
            for (const tag of openTags) {
              newStr += tag;
            }
          }
        }
      }
      newStr += str[stringIdx];
    }
    return newStr;
  };

  private getIndicesFromStr = (line: string, term: string): SubstrIdc => {
    const acc: SubstrIdc = [];
    let i = -1;

    while ((i = line.toLowerCase().indexOf(term.toLowerCase(), i + 1)) >= 0) {
      if (!this.isInAnchorTagAttributes(line, i)) {
        acc.push({ start: i, end: i + term.length });
      }
    }

    return acc;
  };

  private isInAnchorTagAttributes = (line: string, index: number): boolean => {
    const startTagIndex = line.lastIndexOf('<a', index);
    const endTagIndex = line.indexOf('</a>', index);

    // Check if the index is within the start and end tags of an anchor tag
    if (startTagIndex !== -1 && endTagIndex !== -1 && startTagIndex < endTagIndex) {
      const closeTagIndex = line.indexOf('>', startTagIndex);
      // Check if the index is inside the tag, but outside the tag's content
      if (index > startTagIndex && index < closeTagIndex) {
        return true; // The index is within the attributes section of the anchor tag
      }
    }

    return false; // The index is not within the attributes section of an anchor tag
  };

  private getIndicesFromRegex = (line: string, regEx: RegExp): SubstrIdc => {
    const splitted = line.split(regEx);
    const matches = line.match(regEx);
    const acc: SubstrIdc = [];
    let accStr = '';
    for (let i = 0; i < splitted.length - 1; i++) {
      acc.push({
        start: accStr.length + splitted[i].length,
        end: accStr.length + splitted[i].length + ((matches && matches[i].length) || 0),
      });
      accStr += splitted[i];
      accStr += matches && matches[i];
    }
    return acc;
  };
}
