export class DashSegment {
  public url: string;
  public startTime: number;
  public duration: number;
  public qualityIndex: number;
  public loadStatus: string;
  public loadTime?: number;

  constructor(obj: any) {
    this.url = (obj && obj.url) || '';
    this.startTime = (obj && obj.startTime) || 0;
    this.duration = (obj && obj.duration) || 0;
    this.qualityIndex = obj && typeof obj.quality === 'number' ? obj.quality : -1;
    this.loadStatus = (obj && obj.loadStatus) || 'loading';
  }

  public calculateLoadTime(obj: any) {
    if (obj.requestEndDate && obj.requestStartDate) {
      return (this.loadTime = obj ? obj.requestEndDate.getTime() - obj.requestStartDate.getTime() : 0);
    } else {
      return this.startTime;
    }
  }
}
