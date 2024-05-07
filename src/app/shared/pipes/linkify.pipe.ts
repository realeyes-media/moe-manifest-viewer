import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'linkify',
})
export class LinkifyPipe implements PipeTransform {
  transform(str: string): string {
    //As we want to show parts of the XML that can match with an HTML tag
    //we need to escape those parts and only render as HTML the new <a> tags
    let escapedStr = this.escapeHtml(str);

    return escapedStr.replace(/(https?:\/\/[^\s]+)"/g, (match, url) => {
      return `<a href="${url}" target="_blank">${url}</a>"`;
    });
  }

  private escapeHtml(text: string): string {
    return text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}
