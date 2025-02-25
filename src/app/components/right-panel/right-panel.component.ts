import { Component, OnInit, OnDestroy, HostListener, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';
import { trigger, state, style, animate, transition } from '@angular/animations';

@Component({
  selector: 'app-right-panel',
  templateUrl: './right-panel.component.html',
  styleUrls: ['./right-panel.component.css'],
  animations: [
    trigger('tabAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(10px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0, transform: 'translateY(10px)' }))
      ])
    ]),
    trigger('formAnimation', [
      transition('* => *', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('400ms 100ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('submitAnimation', [
      state('default', style({ transform: 'scale(1)' })),
      state('submitting', style({ transform: 'scale(0.95)' })),
      transition('default <=> submitting', animate('150ms ease-in-out'))
    ]),
    trigger('successAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.8)' }),
        animate('400ms cubic-bezier(0.175, 0.885, 0.32, 1.275)', style({ opacity: 1, transform: 'scale(1)' }))
      ])
    ])
  ]
})
export class RightPanelComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('backgroundCanvas') backgroundCanvas!: ElementRef<HTMLCanvasElement>;
  
  activeTab: 'login' | 'signup' = 'login';
  authForm!: FormGroup;
  showPassword = false;
  showSuccessMessage = false;
  formSubmitting = false;
  formState = 'default';
  
  marketData = {
    values: [] as number[],
    trend: 'up' as 'up' | 'down' | 'neutral',
    volatility: 0.5
  };
  
  private destroy$ = new Subject<void>();
  private canvasContext!: CanvasRenderingContext2D;
  private animationFrameId?: number;
  
  constructor(
    private fb: FormBuilder,
    private el: ElementRef
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.initializeMarketData();
    
    // Watch for value changes to reset success message
    this.authForm.valueChanges
      .pipe(takeUntil(this.destroy$), debounceTime(300))
      .subscribe(() => {
        if (this.showSuccessMessage) {
          this.showSuccessMessage = false;
        }
      });
  }

  ngAfterViewInit(): void {
    this.initCanvas();
    this.startCanvasAnimation();
  }

  ngOnDestroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('window:resize')
  onResize(): void {
    if (this.backgroundCanvas) {
      this.resizeCanvas();
    }
  }

  setActiveTab(tab: 'login' | 'signup'): void {
    if (this.activeTab !== tab) {
      this.activeTab = tab;
      this.authForm.reset();
      this.showPassword = false;
      this.updateValidators();
      
      // Update market data trend based on tab
      this.marketData.trend = tab === 'login' ? 'up' : 'neutral';
      this.marketData.volatility = tab === 'login' ? 0.5 : 0.8;
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(): void {
    if (this.authForm.valid) {
      this.formSubmitting = true;
      this.formState = 'submitting';
      
      // Simulate API call
      setTimeout(() => {
        this.formSubmitting = false;
        this.formState = 'default';
        this.showSuccessMessage = true;
        
        // Simulate successful login/signup
        setTimeout(() => {
          this.authForm.reset();
          this.showSuccessMessage = false;
        }, 3000);
      }, 1500);
    } else {
      // Mark all fields as touched to trigger validation messages
      this.markFormGroupTouched(this.authForm);
    }
  }

  get emailControl(): AbstractControl { return this.authForm.get('email')!; }
  get passwordControl(): AbstractControl { return this.authForm.get('password')!; }
  get confirmPasswordControl(): AbstractControl { return this.authForm.get('confirmPassword')!; }

  get emailError(): string {
    const control = this.emailControl;
    if (control.hasError('required')) return 'Email is required';
    if (control.hasError('email')) return 'Please enter a valid email address';
    return '';
  }

  get passwordError(): string {
    const control = this.passwordControl;
    if (control.hasError('required')) return 'Password is required';
    if (control.hasError('minlength')) return 'Password must be at least 8 characters';
    if (control.hasError('pattern')) return 'Password must include uppercase, lowercase, number, and special character';
    return '';
  }

  private initForm(): void {
    const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    
    this.authForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [
        Validators.required, 
        Validators.minLength(8),
        Validators.pattern(passwordPattern)
      ]],
      confirmPassword: [''],
      rememberMe: [false]
    }, { 
      validators: this.activeTab === 'signup' ? this.passwordMatchValidator : null 
    });
  }

  private updateValidators(): void {
    const confirmPasswordControl = this.authForm.get('confirmPassword');
    if (this.activeTab === 'signup') {
      confirmPasswordControl?.setValidators([Validators.required]);
      this.authForm.setValidators(this.passwordMatchValidator);
    } else {
      confirmPasswordControl?.clearValidators();
      this.authForm.clearValidators();
    }
    confirmPasswordControl?.updateValueAndValidity();
    this.authForm.updateValueAndValidity();
  }

  private passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;
    return (password && confirmPassword && password !== confirmPassword) ? { passwordMismatch: true } : null;
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if ((control as any).controls) {
        this.markFormGroupTouched(control as FormGroup);
      }
    });
  }

  private initCanvas(): void {
    const canvas = this.backgroundCanvas.nativeElement;
    this.canvasContext = canvas.getContext('2d')!;
    this.resizeCanvas();
  }

  private resizeCanvas(): void {
    const canvas = this.backgroundCanvas.nativeElement;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  private initializeMarketData(): void {
    // Generate initial market data
    this.marketData.values = Array(50).fill(0).map(() => Math.random() * 100);
  }

  private startCanvasAnimation(): void {
    const animate = () => {
      this.updateMarketData();
      this.drawCanvas();
      this.animationFrameId = requestAnimationFrame(animate);
    };
    
    animate();
  }

  private updateMarketData(): void {
    // Update market data based on trend and volatility
    const lastValue = this.marketData.values[this.marketData.values.length - 1];
    let change = (Math.random() - 0.5) * this.marketData.volatility * 5;
    
    if (this.marketData.trend === 'up') {
      change += 0.2;
    } else if (this.marketData.trend === 'down') {
      change -= 0.2;
    }
    
    let newValue = lastValue + change;
    newValue = Math.max(0, Math.min(100, newValue)); // Keep within bounds
    
    // Shift array and add new value
    this.marketData.values.shift();
    this.marketData.values.push(newValue);
  }

  private drawCanvas(): void {
    const ctx = this.canvasContext;
    const canvas = this.backgroundCanvas.nativeElement;
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw background gradient
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, 'rgba(10, 10, 10, 1)');
    gradient.addColorStop(0.5, 'rgba(20, 20, 20, 1)');
    gradient.addColorStop(1, 'rgba(15, 15, 15, 1)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Draw subtle grid lines
    ctx.strokeStyle = 'rgba(229, 191, 125, 0.05)';
    ctx.lineWidth = 1;
    
    // Horizontal grid lines
    for (let y = 0; y < height; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    
    // Vertical grid lines
    for (let x = 0; x < width; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    
    // Draw market data line
    this.drawMarketLine(ctx, width, height);
    
    // Draw some animated particles
    this.drawParticles(ctx, width, height);
  }

  private drawMarketLine(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const dataPoints = this.marketData.values;
    const step = width / (dataPoints.length - 1);
    const scaleFactor = height * 0.4 / 100; // Scale to 40% of canvas height
    
    // Draw line
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(229, 191, 125, 0.6)';
    ctx.lineWidth = 2;
    
    dataPoints.forEach((value, index) => {
      const x = index * step;
      const y = height * 0.7 - value * scaleFactor; // Position in lower part of canvas
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    
    ctx.stroke();
    
    // Draw gradient fill below the line
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    
    const fillGradient = ctx.createLinearGradient(0, height * 0.4, 0, height);
    fillGradient.addColorStop(0, 'rgba(229, 191, 125, 0.1)');
    fillGradient.addColorStop(1, 'rgba(229, 191, 125, 0)');
    
    ctx.fillStyle = fillGradient;
    ctx.fill();
  }

  private drawParticles(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    // Draw some floating particles to add depth
    const time = Date.now() * 0.001;
    
    for (let i = 0; i < 20; i++) {
      const x = (Math.sin(time * 0.3 + i * 0.5) * 0.5 + 0.5) * width;
      const y = (Math.cos(time * 0.2 + i * 0.7) * 0.5 + 0.5) * height;
      const size = (Math.sin(time * 0.1 + i) * 0.5 + 0.5) * 3 + 1;
      
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(229, 191, 125, ${0.1 + Math.sin(time + i) * 0.05})`;
      ctx.fill();
    }
  }
}