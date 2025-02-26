import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AuthResponse, AuthService } from 'src/app/services/auth/auth.service';

@Component({
  selector: 'app-right-panel',
  templateUrl: './right-panel.component.html',
  styleUrls: ['./right-panel.component.css']
})
export class RightPanelComponent implements OnInit, OnDestroy {
  activeTab: 'login' | 'signup' = 'login';
  authForm!: FormGroup;
  showPassword = false;
  formSubmitted = false;
  
  private destroy$ = new Subject<void>();
  
  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
    
  ) {}

  ngOnInit(): void {
    this.snackBar.open('Test toast', 'Close', { duration: 2000 });
    this.initForm();
    this.updateValidators();
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/dashboard']);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setActiveTab(tab: 'login' | 'signup'): void {
    if (this.activeTab !== tab) {
      this.activeTab = tab;
      this.authForm.reset();
      this.showPassword = false;
      this.formSubmitted = false;
      this.updateValidators();
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(): void {
    this.formSubmitted = true;

    if (this.authForm.valid) {
      const formData = { ...this.authForm.value };
      
      if (this.activeTab === 'login') {
        this.handleLogin(formData);
      } else {
        this.handleSignup(formData);
      }
    }
  }

  private handleLogin(formData: any): void {
    const loginData = {
      email: formData.email,
      password: formData.password
    };

    this.authService.signin(loginData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: AuthResponse) => {
          this.showSuccessToast('Login successful!');
          this.formSubmitted = false;
          this.authForm.reset();
          setTimeout(() => {
            this.router.navigate(['/dashboard']);
          }, 1500);
        },
        error: (error) => {
          this.showErrorToast('Login failed. Check your credentials.');
          this.formSubmitted = false;
        }
      });
  }

  private handleSignup(formData: any): void {
    const signupData = {
      email: formData.email,
      password: formData.password
    };
    console.log('Signup payload:', signupData);
  
    this.authService.signup(signupData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: AuthResponse) => {
          this.showSuccessToast('Inscription réussie ! Veuillez vous connecter.');
          this.formSubmitted = false;
          this.authForm.reset();
          setTimeout(() => {
            this.setActiveTab('login');
          }, 1500);
        },
        error: (error) => {
          console.error('Signup error:', error);
          let errorMessage = "Erreur lors de l'inscription";
          if (error.status === 409) {
            errorMessage = "Cet email est déjà utilisé";
          }
          this.showErrorToast(errorMessage);
          this.formSubmitted = false;
        }
      });
  }

  // Toast notification methods
  private showSuccessToast(message: string): void {
    this.snackBar.open(message, 'OK', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'top',
      panelClass: ['success-toast']
    });
  }

  private showErrorToast(message: string): void {
    this.snackBar.open(message, 'Fermer', {
      duration: 5000,
      horizontalPosition: 'center',
      verticalPosition: 'top',
      panelClass: ['error-toast']
    });
  }

  // Rest of your existing methods (initForm, getters, etc.) remain unchanged
  private initForm(): void {
    const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    
    this.authForm = this.fb.group({
    
      email: ['', [Validators.required, Validators.email]],
      password: ['', [
        Validators.required, 
        Validators.minLength(8),
        Validators.pattern(passwordPattern)
      ]],
      confirmPassword: ['']
    }, { 
      validators: this.activeTab === 'signup' ? this.passwordMatchValidator : null 
    });
  }

  get emailControl(): AbstractControl { return this.authForm.get('email')!; }
  get passwordControl(): AbstractControl { return this.authForm.get('password')!; }
  get confirmPasswordControl(): AbstractControl { return this.authForm.get('confirmPassword')!; }

  get emailError(): string {
    const control = this.emailControl;
    if (control.hasError('required')) return 'Email requis';
    if (control.hasError('email')) return 'Veuillez entrer un email valide';
    return '';
  }

  get passwordError(): string {
    const control = this.passwordControl;
    if (control.hasError('required')) return 'Mot de passe requis';
    if (control.hasError('minlength')) return 'Le mot de passe doit contenir au moins 8 caractères';
    if (control.hasError('pattern')) return 'Le mot de passe doit inclure majuscule, minuscule, chiffre et caractère spécial';
    return '';
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
}