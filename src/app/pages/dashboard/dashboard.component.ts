import { Component, AfterViewInit, ElementRef, ViewChild } from '@angular/core';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements AfterViewInit {
  @ViewChild('container') container!: ElementRef;
  @ViewChild('topSection') topSection!: ElementRef;
  @ViewChild('leftPanel') leftPanel!: ElementRef;
  @ViewChild('rightPanel') rightPanel!: ElementRef;
  @ViewChild('bottomPanel') bottomPanel!: ElementRef;

  activeLeftTab = 'watchlist';
  activeRightTab = 'chart';
  activeBottomTab = 'positions';
  
  private isResizingVertical = false;
  private isResizingHorizontal = false;
  private startY = 0;
  private startX = 0;
  private startTopHeight = 0;

  ngAfterViewInit() {
    // Set initial heights
    this.topSection.nativeElement.style.height = '70%';
    this.bottomPanel.nativeElement.style.height = '30%';
    
    // Set initial flex basis for panels
    this.leftPanel.nativeElement.style.flexBasis = '50%';
    this.rightPanel.nativeElement.style.flexBasis = '50%';
    
    this.setupResizeListeners();
  }

  private setupResizeListeners() {
    document.addEventListener('mousemove', this.onMouseMove.bind(this));
    document.addEventListener('mouseup', this.onMouseUp.bind(this));
  }

  startVerticalResize(event: MouseEvent) {
    this.isResizingVertical = true;
    this.startX = event.pageX;
  }

  startHorizontalResize(event: MouseEvent) {
    this.isResizingHorizontal = true;
    this.startY = event.clientY;
    this.startTopHeight = this.topSection.nativeElement.offsetHeight;
  }

  private onMouseMove(event: MouseEvent) {
    if (this.isResizingVertical) {
      const containerWidth = this.topSection.nativeElement.offsetWidth;
      const percentage = (event.pageX / containerWidth) * 100;
      const boundedPercentage = Math.min(Math.max(percentage, 20), 80);
      
      this.leftPanel.nativeElement.style.flexBasis = `${boundedPercentage}%`;
      this.rightPanel.nativeElement.style.flexBasis = `${100 - boundedPercentage}%`;
    }

    if (this.isResizingHorizontal) {
      const containerHeight = this.container.nativeElement.offsetHeight;
      const dy = event.clientY - this.startY;
      const newTopHeight = this.startTopHeight + dy;
      
      let topPercentage = (newTopHeight / containerHeight) * 100;
      topPercentage = Math.min(Math.max(topPercentage, 20), 80);
      
      this.topSection.nativeElement.style.height = `${topPercentage}%`;
      this.bottomPanel.nativeElement.style.height = `${100 - topPercentage}%`;
    }
  }

  private onMouseUp() {
    this.isResizingVertical = false;
    this.isResizingHorizontal = false;
  }

  toggleFullscreen(panel: HTMLElement) {
    panel.classList.toggle('fullscreen');
  }

  isFullscreen(panel: HTMLElement): boolean {
    return panel.classList.contains('fullscreen');
  }
}