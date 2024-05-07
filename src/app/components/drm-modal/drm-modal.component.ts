import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AppService } from 'src/app/shared';
import { DrmInfoType, DrmManagerService, DRMType } from 'src/app/shared/services/drm-manager.service';

@Component({
  selector: 'app-drm-modal',
  templateUrl: './drm-modal.component.html',
  styleUrls: ['./drm-modal.component.scss'],
})
export class DrmModalComponent implements OnInit, OnDestroy {
  public info: DrmInfoType = { drmLicenseUrl: '', drmType: DRMType.WIDEVINE, viewerStateId: '' };
  public DRMType = DRMType;

  private viewerStateId: string;
  private ngUnsubscribe: Subject<void> = new Subject<void>();

  constructor(public appService: AppService, private drmManager: DrmManagerService) {}

  public ngOnInit(): void {
    this.appService.drmModalState.pipe(takeUntil(this.ngUnsubscribe)).subscribe(this.setViewerId);
  }

  public ngOnDestroy() {
    this.closeModal();
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  private setViewerId = (id: string) => {
    this.viewerStateId = id;
    const currentDrmInfo = this.drmManager.getCurrentDrmInfo(id);
    if (currentDrmInfo) {
      this.info = { ...currentDrmInfo };
    } else if (this.drmManager.getCurrentDrmInfo('global')) {
      this.info = { ...this.drmManager.getCurrentDrmInfo('global') };
    }
    this.setDrmStatus();
  };

  private setDrmStatus() {
    this.appService.toggleDrmStateStatus(this.info && this.info.drmLicenseUrl ? true : false);
  }

  public addDrm(data: DrmInfoType) {
    const drmInfo: DrmInfoType = {
      drmLicenseUrl: data.drmLicenseUrl,
      drmType: data.drmType,
      viewerStateId: this.viewerStateId,
      headerName: data?.headerName,
      headerValue: data?.headerValue,
    };
    this.drmManager.setCurrentDrmInfo(this.viewerStateId, drmInfo);
    this.closeModal();
  }

  public closeModal() {
    this.setDrmStatus();
    this.appService.toggleDrmModal(false);
  }
}
