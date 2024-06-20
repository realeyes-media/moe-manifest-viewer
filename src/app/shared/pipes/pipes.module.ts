import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BitratePipePipe } from './bitrate-pipe.pipe';
import { ManifestText } from './manifest-text.pipe';
import { PlayerTitlePipe } from './player-title.pipe';
import { LinkifyPipe } from './linkify.pipe';

@NgModule({
  declarations: [ManifestText, BitratePipePipe, PlayerTitlePipe, LinkifyPipe],
  imports: [CommonModule],
  exports: [ManifestText, BitratePipePipe, PlayerTitlePipe, LinkifyPipe],
})
export class PipesModule {}
