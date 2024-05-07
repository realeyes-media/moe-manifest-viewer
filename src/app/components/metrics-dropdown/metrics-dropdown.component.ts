import { Component, OnInit, Input, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { Metric } from '../../shared';

@Component({
  selector: 'app-metrics-dropdown',
  templateUrl: './metrics-dropdown.component.html',
  styleUrls: ['./metrics-dropdown.component.scss'],
})
export class MetricsDropdownComponent implements OnInit {
  @Input() public currentMetric: Metric;
  @Input() public metrics: Metric[] | null;
  @Input() public metricType: string;

  @Output() public metricSelect = new EventEmitter<Metric>();
  @Output() public seek = new EventEmitter<Metric>();

  @ViewChild('inputDropdownContainer', { static: false }) public inputDropdownContainer: ElementRef;

  public showMetrics = false;

  constructor() {}

  public ngOnInit() {}

  public setMetricVis = (val: boolean) => {
    this.showMetrics = val;
    return true;
  };

  public metricClick = (metric: Metric): void => {
    this.metricSelect.emit(metric);
    this.inputDropdownContainer.nativeElement.scrollTop = 0;
  };
}
