import { Component, OnInit, Input } from '@angular/core';
import { ViewerState, CMCDOptions } from '../../shared';
import { CMCDTransitionModes } from '../../shared/utils/cmcd-filter';

@Component({
  selector: 'app-cmcd',
  templateUrl: './cmcd.component.html',
  styleUrls: ['./cmcd.component.scss'],
})
export class CMCDComponent implements OnInit {
  @Input() public viewerState: ViewerState;

  public ngOnInit() {
    if (this.viewerState.cmcdOptions) {
      this.cmcdOptions = this.viewerState.cmcdOptions;
      this.paramsText = this.cmcdOptions.paramsArray?.toString() ?? '';
    } else {
      this.viewerState.setCMCDOptions(this.cmcdOptions);
    }
  }

  public cmcdOptions: CMCDOptions = {
    enabled: true,
    sessionId: '',
    contentId: '',
    transitionMode: CMCDTransitionModes.QUERY,
    paramsArray: [],
  };

  public paramsText: string = 'br,d,ot,tb,bl,dl,mtp,nor,nrr,su,bs,rtp,cid,pr,sf,sid,st,v';

  public toggleCmcdEnabled = (data: boolean) => {
    this.cmcdOptions.enabled = data;
    this.updateMessage = false;
  };

  public updateValue = () => {
    this.updateMessage = false;
  };

  public applyCMCDChanges = (): void => {
    this.cmcdOptions.paramsArray = (this.paramsText ? this.paramsText : this.paramsPlaceHolder).split(',');
    this.viewerState.setCMCDOptions(this.cmcdOptions);
    this.updateMessage = true;
  };

  public paramsPlaceHolder: string = 'br,d,ot,tb,bl,dl,mtp,nor,nrr,su,bs,rtp,cid,pr,sf,sid,st,v';

  public sessionIdPlaceHolder: string = 'Enter Session ID';

  public contentIdPlaceHolder: string = 'Enter Content ID';

  public updateMessage: boolean = false;
}
