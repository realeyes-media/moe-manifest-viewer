import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'bitratePipe',
})
export class BitratePipePipe implements PipeTransform {
  public transform(value: string | number): string | number {
    const convertedBitrate = Math.floor(Number(value) / 1000);
    return convertedBitrate ? convertedBitrate + '  ' + 'Kbps' : value;
  }
}
