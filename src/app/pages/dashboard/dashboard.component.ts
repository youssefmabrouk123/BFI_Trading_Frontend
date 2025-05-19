import { Component, AfterViewInit, ElementRef, ViewChild, HostListener, NgZone, OnInit } from '@angular/core';
import { ThemeService } from 'src/app/services/theme/theme.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, AfterViewInit {
  @ViewChild('container') container!: ElementRef;
  @ViewChild('topSection') topSection!: ElementRef;
  @ViewChild('leftPanel') leftPanel!: ElementRef;
  @ViewChild('rightPanel') rightPanel!: ElementRef;
  @ViewChild('bottomPanel') bottomPanel!: ElementRef;
  @ViewChild('horizontalResizer') horizontalResizer!: ElementRef;
  @ViewChild('verticalResizer') verticalResizer!: ElementRef;

  activeLeftTab = 'markets';
  activeRightTab = 'details';
  activeBottomTab = 'positions';
  currentTheme: string = 'dark';
  isMobile = false;
  isTablet = false;
  
  private isResizingVertical = false;
  private isResizingHorizontal = false;
  private startY = 0;
  private startX = 0;
  private startTopHeight = 0;
  private startLeftWidth = 0;
  private containerHeight = 0;
  private containerWidth = 0;

  constructor(
    private themeService: ThemeService,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    this.themeService.theme$.subscribe(theme => {
      console.log('Dashboard theme updated:', theme);
      this.currentTheme = theme;
    });
  }

  ngAfterViewInit() {
    this.checkScreenSize();
    this.setInitialLayout();
    this.updateContainerDimensions();
    this.setupResizeListeners();
  }

  @HostListener('window:resize')
  onWindowResize() {
    this.checkScreenSize();
    this.setInitialLayout();
    this.updateContainerDimensions();
  }

  private updateContainerDimensions() {
    if (this.container?.nativeElement && this.topSection?.nativeElement) {
      this.containerHeight = this.container.nativeElement.offsetHeight;
      this.containerWidth = this.topSection.nativeElement.offsetWidth;
      console.log('Container dimensions updated:', {
        height: this.containerHeight,
        width: this.containerWidth
      });
    }
  }

  private checkScreenSize() {
    this.isMobile = window.innerWidth < 768;
    this.isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;
    console.log('Screen size:', { isMobile: this.isMobile, isTablet: this.isTablet });
  }

  private setInitialLayout() {
    if (this.topSection?.nativeElement && this.bottomPanel?.nativeElement && this.leftPanel?.nativeElement && this.rightPanel?.nativeElement) {
      if (this.isMobile) {
        this.topSection.nativeElement.style.height = 'auto';
        this.bottomPanel.nativeElement.style.height = '400px';
        this.leftPanel.nativeElement.style.flexBasis = '100%';
        this.rightPanel.nativeElement.style.flexBasis = '100%';
      } else if (this.isTablet) {
        this.topSection.nativeElement.style.height = '60%';
        this.bottomPanel.nativeElement.style.height = '40%';
        this.leftPanel.nativeElement.style.flexBasis = '100%';
        this.rightPanel.nativeElement.style.flexBasis = '100%';
      } else {
        this.topSection.nativeElement.style.height = '65%';
        this.bottomPanel.nativeElement.style.height = '35%';
        this.leftPanel.nativeElement.style.flexBasis = '50%';
        this.rightPanel.nativeElement.style.flexBasis = '50%';
      }

      if (this.horizontalResizer && this.verticalResizer) {
        this.horizontalResizer.nativeElement.style.display = this.isMobile ? 'none' : 'block';
        this.verticalResizer.nativeElement.style.display = (this.isMobile || this.isTablet) ? 'none' : 'block';
      }
      console.log('Initial layout set:', {
        topHeight: this.topSection.nativeElement.style.height,
        bottomHeight: this.bottomPanel.nativeElement.style.height,
        leftWidth: this.leftPanel.nativeElement.style.flexBasis,
        rightWidth: this.rightPanel.nativeElement.style.flexBasis
      });
    }
  }

  private setupResizeListeners() {
    this.ngZone.runOutsideAngular(() => {
      document.addEventListener('mousemove', this.onMouseMove.bind(this));
      document.addEventListener('mouseup', this.onMouseUp.bind(this));
      document.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
      document.addEventListener('touchend', this.onMouseUp.bind(this));
    });
  }

  startVerticalResize(event: MouseEvent | TouchEvent) {
    if (this.isMobile || this.isTablet) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    this.isResizingVertical = true;
    this.startX = event instanceof MouseEvent ? event.pageX : event.touches[0].pageX;
    this.startLeftWidth = this.leftPanel.nativeElement.offsetWidth;
    this.containerWidth = this.topSection.nativeElement.offsetWidth;
    
    document.body.classList.add('resizing');
    
    if (this.verticalResizer) {
      this.verticalResizer.nativeElement.style.opacity = '1';
      this.verticalResizer.nativeElement.style.width = '6px';
    }
    console.log('Start vertical resize:', { startX: this.startX, startLeftWidth: this.startLeftWidth });
  }

  startHorizontalResize(event: MouseEvent | TouchEvent) {
    if (this.isMobile) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    this.isResizingHorizontal = true;
    this.startY = event instanceof MouseEvent ? event.pageY : event.touches[0].pageY; // Changé de clientY à pageY pour cohérence
    this.startTopHeight = this.topSection.nativeElement.offsetHeight;
    this.containerHeight = this.container.nativeElement.offsetHeight;
    
    document.body.classList.add('resizing');
    
    if (this.horizontalResizer) {
      this.horizontalResizer.nativeElement.style.opacity = '1';
      this.horizontalResizer.nativeElement.style.height = '6px';
    }
    console.log('Start horizontal resize:', {
      startY: this.startY,
      startTopHeight: this.startTopHeight,
      containerHeight: this.containerHeight
    });
  }

  private onTouchMove(event: TouchEvent) {
    if (this.isResizingHorizontal || this.isResizingVertical) {
      event.preventDefault();
      this.onMouseMove(event);
    }
  }

  private onMouseMove(event: MouseEvent | TouchEvent) {
    if (this.isResizingVertical) {
      this.handleVerticalResize(event);
    }
    if (this.isResizingHorizontal) {
      this.handleHorizontalResize(event);
    }
  }

  private handleVerticalResize(event: MouseEvent | TouchEvent) {
    const currentX = event instanceof MouseEvent ? event.pageX : event.touches[0].pageX;
    const dx = currentX - this.startX;
    const newWidth = this.startLeftWidth + dx;
    
    let percentage = (newWidth / this.containerWidth) * 100;
    percentage = Math.min(Math.max(percentage, 20), 80);
    
    this.ngZone.run(() => {
      this.leftPanel.nativeElement.style.flexBasis = `${percentage}%`;
      this.rightPanel.nativeElement.style.flexBasis = `${100 - percentage}%`;
    });
    console.log('Vertical resize:', { percentage });
  }

  private handleHorizontalResize(event: MouseEvent | TouchEvent) {
    const currentY = event instanceof MouseEvent ? event.pageY : event.touches[0].pageY; // Changé de clientY à pageY
    const dy = currentY - this.startY;
    const newTopHeight = this.startTopHeight + dy;
    
    let topPercentage = (newTopHeight / this.containerHeight) * 100;
    topPercentage = Math.min(Math.max(topPercentage, 20), 80);
    
    this.ngZone.run(() => {
      this.topSection.nativeElement.style.height = `${topPercentage}%`;
      this.bottomPanel.nativeElement.style.height = `${100 - topPercentage}%`;
    });
    console.log('Horizontal resize:', { topPercentage, newTopHeight, dy });
  }

  private onMouseUp() {
    this.isResizingVertical = false;
    this.isResizingHorizontal = false;
    
    document.body.classList.remove('resizing');
    
    if (this.verticalResizer) {
      this.verticalResizer.nativeElement.style.opacity = '';
      this.verticalResizer.nativeElement.style.width = '';
    }
    
    if (this.horizontalResizer) {
      this.horizontalResizer.nativeElement.style.opacity = '';
      this.horizontalResizer.nativeElement.style.height = '';
    }
    console.log('Resize ended');
  }

  toggleFullscreen(panel: HTMLElement) {
    panel.classList.toggle('fullscreen');
  }

  isFullscreen(panel: HTMLElement): boolean {
    return panel.classList.contains('fullscreen');
  }

  ngOnDestroy() {
    document.removeEventListener('mousemove', this.onMouseMove.bind(this));
    document.removeEventListener('mouseup', this.onMouseUp.bind(this));
    document.removeEventListener('touchmove', this.onTouchMove.bind(this));
    document.removeEventListener('touchend', this.onMouseUp.bind(this));
  }
}