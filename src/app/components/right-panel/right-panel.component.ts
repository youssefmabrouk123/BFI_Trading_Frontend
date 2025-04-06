import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { catchError, of, Subject, takeUntil } from 'rxjs';
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
  showConfirmPassword = false;
  formSubmitted = false;
  passwordStrength = 0;
  isLoading = false;
  
  private destroy$ = new Subject<void>();
  
  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.updateValidators();
    
    // Écouter les changements du mot de passe pour calculer la force
    this.passwordControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        this.calculatePasswordStrength(value);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  calculatePasswordStrength(password: string): void {
    let strength = 0;
    
    // Longueur
    if (password.length >= 8) strength += 1;
    if (password.length >= 12) strength += 1;
    
    // Complexité
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    
    this.passwordStrength = Math.min(strength, 5); // Max 5 points
  }

  setActiveTab(tab: 'login' | 'signup'): void {
    if (this.activeTab !== tab) {
      this.activeTab = tab;
      this.authForm.reset();
      this.showPassword = false;
      this.showConfirmPassword = false;
      this.formSubmitted = false;
      this.passwordStrength = 0;
      this.updateValidators();
    }
  }

  togglePasswordVisibility(field: 'password' | 'confirmPassword'): void {
    if (field === 'password') {
      this.showPassword = !this.showPassword;
    } else {
      this.showConfirmPassword = !this.showConfirmPassword;
    }
  }

  onSubmit(): void {
    this.formSubmitted = true;

    if (this.authForm.valid) {
      this.isLoading = true;
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
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.log(error);
          this.isLoading = false;
          this.formSubmitted = false;
          this.showErrorToast(error.message || 'Échec de la connexion');
          return of(null); // Retourne un observable vide pour continuer le flux
        })
      )
      .subscribe({
        next: (response) => {
          if (response) { // Vérifie que la réponse existe
            this.showSuccessToast('Connexion réussie !');
            this.isLoading = false;
            this.formSubmitted = false;
            this.authForm.reset();
            setTimeout(() => {
              this.router.navigate(['/dashboard']);
            }, 1500);
          }
        }
      });
  }
  private handleSignup(formData: any): void {
    const signupData = {
      email: formData.email,
      password: formData.password
    };
  
    this.authService.signup(signupData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: AuthResponse) => {
          this.showSuccessToast('Inscription réussie ! Veuillez vous connecter.');
          this.isLoading = false;
          this.formSubmitted = false;
          this.authForm.reset();
          setTimeout(() => {
            this.setActiveTab('login');
          }, 1500);
        },
        error: (error) => {
          let errorMessage = "Erreur lors de l'inscription";
          if (error.status === 409) {
            errorMessage = "Cet email est déjà utilisé";
          } else if (error.message) {
            errorMessage = error.message;
          }
          this.showErrorToast(errorMessage);
          this.isLoading = false;
          this.formSubmitted = false;
        }
      });
  }

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

  private initForm(): void {
    this.authForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [
        Validators.required, 
        Validators.minLength(8)
      ]],
      confirmPassword: ['']
    }, { 
      validators: this.passwordMatchValidator 
    });
  }

  get emailControl(): AbstractControl { return this.authForm.get('email')!; }
  get passwordControl(): AbstractControl { return this.authForm.get('password')!; }
  get confirmPasswordControl(): AbstractControl { return this.authForm.get('confirmPassword')!; }

  get emailError(): string {
    if (this.emailControl.hasError('required')) return 'Email requis';
    if (this.emailControl.hasError('email')) return 'Veuillez entrer un email valide';
    return '';
  }

  get passwordError(): string {
    if (this.passwordControl.hasError('required')) return 'Mot de passe requis';
    if (this.passwordControl.hasError('minlength')) return 'Le mot de passe doit contenir au moins 8 caractères';
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
    return password && confirmPassword && password !== confirmPassword ? { passwordMismatch: true } : null;
  }
}