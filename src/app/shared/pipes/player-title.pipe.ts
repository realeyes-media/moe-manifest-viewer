import { Pipe, PipeTransform } from '@angular/core';
import { getVideoPlayerTitle, VideoPlayers } from '../models/video-players';

@Pipe({
  name: 'playerTitle',
})
export class PlayerTitlePipe implements PipeTransform {
  public transform(value: VideoPlayers): string {
    return getVideoPlayerTitle(value);
  }
}
