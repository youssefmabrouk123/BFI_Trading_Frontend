import { Component, AfterViewInit, ElementRef, ViewChild, HostListener } from '@angular/core';

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
  
  isMobile = false;
  isTablet = false;
  
  private isResizingVertical = false;
  private isResizingHorizontal = false;
  private startY = 0;
  private startX = 0;
  private startTopHeight = 0;

  ngAfterViewInit() {
    this.checkScreenSize();
    this.setInitialLayout();
    this.setupResizeListeners();
  }

  @HostListener('window:resize')
  onWindowResize() {
    this.checkScreenSize();
    this.setInitialLayout();
  }

  private checkScreenSize() {
    this.isMobile = window.innerWidth < 768;
    this.isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;
  }

  private setInitialLayout() {
    if (this.isMobile) {
      this.topSection.nativeElement.style.height = 'auto';
      this.bottomPanel.nativeElement.style.height = 'auto';
      this.leftPanel.nativeElement.style.flexBasis = '100%';
      this.rightPanel.nativeElement.style.flexBasis = '100%';
    } else if (this.isTablet) {
      this.topSection.nativeElement.style.height = '60%';
      this.bottomPanel.nativeElement.style.height = '40%';
      this.leftPanel.nativeElement.style.flexBasis = '100%';
      this.rightPanel.nativeElement.style.flexBasis = '100%';
    } else {
      this.topSection.nativeElement.style.height = '70%';
      this.bottomPanel.nativeElement.style.height = '30%';
      this.leftPanel.nativeElement.style.flexBasis = '50%';
      this.rightPanel.nativeElement.style.flexBasis = '50%';
    }
  }

  private setupResizeListeners() {
    document.addEventListener('mousemove', this.onMouseMove.bind(this));
    document.addEventListener('mouseup', this.onMouseUp.bind(this));
    document.addEventListener('touchmove', this.onMouseMove.bind(this), { passive: false });
    document.addEventListener('touchend', this.onMouseUp.bind(this));
  }

  startVerticalResize(event: MouseEvent | TouchEvent) {
    this.isResizingVertical = true;
    this.startX = event instanceof MouseEvent ? event.pageX : event.touches[0].pageX;
  }

  startHorizontalResize(event: MouseEvent | TouchEvent) {
    this.isResizingHorizontal = true;
    this.startY = event instanceof MouseEvent ? event.clientY : event.touches[0].clientY;
    this.startTopHeight = this.topSection.nativeElement.offsetHeight;
  }

  private onMouseMove(event: MouseEvent | TouchEvent) {
    // Si c'est un événement tactile, empêcher le défilement
    if (event instanceof TouchEvent) {
      event.preventDefault();
    }

    if (this.isResizingVertical) {
      const containerWidth = this.topSection.nativeElement.offsetWidth;
      const currentX = event instanceof MouseEvent ? event.pageX : event.touches[0].pageX;
      const percentage = (currentX / containerWidth) * 100;
      const boundedPercentage = Math.min(Math.max(percentage, 20), 80);
      
      this.leftPanel.nativeElement.style.flexBasis = `${boundedPercentage}%`;
      this.rightPanel.nativeElement.style.flexBasis = `${100 - boundedPercentage}%`;
    }

    if (this.isResizingHorizontal) {
      const containerHeight = this.container.nativeElement.offsetHeight;
      const currentY = event instanceof MouseEvent ? event.clientY : event.touches[0].clientY;
      const dy = currentY - this.startY;
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
