import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { StorageService, DefaultViewerName, StoredViewer, LoggerService } from '../../shared';

@Component({
  selector: 'app-viewer-dropdown',
  templateUrl: './viewer-dropdown.component.html',
  styleUrls: ['./viewer-dropdown.component.scss'],
})
export class ViewerDropdownComponent {
  @Output() public loadStoredViewer = new EventEmitter<StoredViewer>();
  @Input() public show = false;

  constructor(public storageService: StorageService, private logger: LoggerService) {}

  public defaultName = () => {
    return DefaultViewerName;
  };

  public storedSelect = (storedViewer: StoredViewer) => {
    this.logger.logs = [];
    this.loadStoredViewer.emit(storedViewer);
    this.storageService.updateViewerTimestamp(storedViewer);
  };

  public removeViewer = (viewer: StoredViewer) => {
    this.storageService.removeViewer(viewer);
  };
}
