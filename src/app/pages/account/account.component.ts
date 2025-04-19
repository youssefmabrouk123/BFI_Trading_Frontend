import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { UserUpdateService, User } from 'src/app/services/userUpdate/user-update.service';
import { BehaviorSubject, Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { animate, style, transition, trigger } from '@angular/animations';
import { AuthService } from 'src/app/services/auth/auth.service';
import { ThemeService } from 'src/app/services/theme/theme.service';

@Component({
  selector: 'app-account',
  templateUrl: './account.component.html',
  styleUrls: ['./account.component.css'],
  animations: [
    trigger('fadeSlide', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0, transform: 'translateY(20px)' })),
      ]),
    ]),
  ],
})
export class AccountComponent implements OnInit, OnDestroy {
  currentTheme: string = 'dark';

  user$ = new BehaviorSubject<User | null>(null);
  loading$ = new BehaviorSubject<boolean>(true);
  submitting$ = new BehaviorSubject<boolean>(false);
  error$ = new BehaviorSubject<string | null>(null);
  successMessage$ = new BehaviorSubject<string | null>(null);
  updateForm: FormGroup;
  editForm: FormGroup;
  showPassword = false;
  showConfirmPassword = false;
  showDeleteConfirmation = false;
  showEditModal = false;
  showAddFavoriteModal = false;
  deleteConfirmText = '';
  favoriteToAdd = '';


  private destroy$ = new Subject<void>();
  private readonly SUCCESS_TIMEOUT = 3000;
  private readonly FAVORITE_REGEX = /^[A-Z]{3}\/[A-Z]{3}$/;

  constructor(
    private userService: UserUpdateService,
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private themeService: ThemeService,

  ) {
    this.updateForm = this.fb.group({
      password: ['', [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
      ]],
      confirmPassword: ['', Validators.required],
    }, { validators: this.passwordMatchValidator });

    this.editForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      lastName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(100)]],
    });
  }

  ngOnInit(): void {
    this.loadUserData();
    this.themeService.theme$.subscribe(theme => {
      this.currentTheme = theme;
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private passwordMatchValidator(form: FormGroup) {
    const password = form.get('password')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    return password && confirmPassword && password !== confirmPassword ? { mismatch: true } : null;
  }

  private logAction(action: string, details?: any) {
    console.log(`[AccountComponent] ${action}`, details || '');
  }

  loadUserData(): void {
    this.loading$.next(true);
    this.error$.next(null);
    this.logAction('Loading user data');

    this.userService.getUser()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.loading$.next(false))
      )
      .subscribe({
        next: (user) => {
          this.user$.next(user);
          this.editForm.patchValue({
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
          });
          this.logAction('User data loaded', user);
        },
        error: (err) => {
          const message = err.status === 401
            ? 'Votre session a expiré. Redirection vers la connexion...'
            : 'Une erreur est survenue lors du chargement de vos données.';
          this.error$.next(message);
          this.logAction('Error loading user data', err);
          if (err.status === 401) {
            localStorage.removeItem('token');
            setTimeout(() => this.router.navigate(['/login']), 2000);
          }
        },
      });
  }

  editPersonalInfo(): void {
    this.showEditModal = true;
    this.logAction('Opening edit personal info modal');
  }

  savePersonalInfo(): void {
    if (this.editForm.valid && this.user$.value) {
      this.submitting$.next(true);
      this.error$.next(null);
      this.logAction('Saving personal info', this.editForm.value);

      const updatedUser: User = {
        ...this.user$.value,
        ...this.editForm.value,
      };

      this.userService.updateUser(updatedUser)
        .pipe(
          takeUntil(this.destroy$),
          finalize(() => this.submitting$.next(false))
        )
        .subscribe({
          next: (user) => {
            this.user$.next(user);
            this.showEditModal = false;
            this.successMessage$.next('Informations mises à jour avec succès.');
            this.logAction('Personal info updated', user);
            this.resetSuccessMessage();
          },
          error: (err) => {
            this.error$.next(err.message || 'Échec de la mise à jour des informations.');
            this.logAction('Error updating personal info', err);
          },
        });
    }            this.authService.getUserDetails();

  }

  updateUser(): void {
    if (this.updateForm.valid && this.user$.value && this.updateForm.dirty) {
      this.submitting$.next(true);
      this.error$.next(null);
      this.successMessage$.next(null);
      this.logAction('Updating password');

      const password = this.updateForm.get('password')?.value;
      const updatedUser: User = {
        ...this.user$.value,
        password,
      };

      this.userService.updateUser(updatedUser)
        .pipe(
          takeUntil(this.destroy$),
          finalize(() => this.submitting$.next(false))
        )
        .subscribe({
          next: (user) => {
            this.user$.next(user);
            this.updateForm.reset();
            this.successMessage$.next('Mot de passe mis à jour avec succès.');
            this.logAction('Password updated');
            this.resetSuccessMessage();
          },
          error: (err) => {
            this.error$.next(err.message || 'Échec de la mise à jour du mot de passe.');
            this.logAction('Error updating password', err);
          },
        });
    }
  }

  openAddFavoriteModal(): void {
    this.showAddFavoriteModal = true;
    this.favoriteToAdd = '';
    this.logAction('Opening add favorite modal');
  }

  isFavoriteValid(): boolean {
    return !!this.favoriteToAdd && this.FAVORITE_REGEX.test(this.favoriteToAdd);
  }

  addFavorite(): void {
    if (!this.user$.value || !this.isFavoriteValid()) return;

    this.submitting$.next(true);
    this.error$.next(null);
    this.logAction('Adding favorite', this.favoriteToAdd);

    const newFavorite = {
      id: Date.now(),
      name: this.favoriteToAdd.trim().toUpperCase(),
      lastValue: null,
      change: 0,
    };

    const updatedUser: User = {
      ...this.user$.value,
      favoriteCrossParities: [...(this.user$.value.favoriteCrossParities || []), newFavorite],
    };

    this.userService.updateUser(updatedUser)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.submitting$.next(false))
      )
      .subscribe({
        next: (user) => {
          this.user$.next(user);
          this.showAddFavoriteModal = false;
          this.favoriteToAdd = '';
          this.successMessage$.next('Paire ajoutée aux favoris.');
          this.logAction('Favorite added', newFavorite);
          this.resetSuccessMessage();
        },
        error: (err) => {
          this.error$.next(err.message || 'Échec de l’ajout de la paire favorite.');
          this.logAction('Error adding favorite', err);
        },
      });
  }

  removeFavorite(parityId: number): void {
    if (!this.user$.value || !this.user$.value.favoriteCrossParities) return;

    this.submitting$.next(true);
    this.error$.next(null);
    this.logAction('Removing favorite', parityId);

    const updatedFavorites = this.user$.value.favoriteCrossParities.filter(p => p.id !== parityId);
    const updatedUser: User = {
      ...this.user$.value,
      favoriteCrossParities: updatedFavorites,
    };

    this.userService.updateUser(updatedUser)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.submitting$.next(false))
      )
      .subscribe({
        next: (user) => {
          this.user$.next(user);
          this.successMessage$.next('Paire supprimée des favoris.');
          this.logAction('Favorite removed', parityId);
          this.resetSuccessMessage();
        },
        error: (err) => {
          this.error$.next(err.message || 'Échec de la suppression de la paire.');
          this.logAction('Error removing favorite', err);
          this.loadUserData();
        },
      });
  }

  deleteUser(): void {
    if (this.deleteConfirmText.toLowerCase() === 'supprimer') {
      this.submitting$.next(true);
      this.error$.next(null);
      this.logAction('Deleting user account');

      this.userService.deleteUser()
        .pipe(
          takeUntil(this.destroy$),
          finalize(() => {
            this.submitting$.next(false);
            this.showDeleteConfirmation = false;
          })
        )
        .subscribe({
          next: () => {
            localStorage.removeItem('token');
            this.logAction('Account deleted successfully');
            this.router.navigate(['/login'], { queryParams: { deleted: true } });
          },
          error: (err) => {
            this.error$.next(err.message || 'Échec de la suppression du compte.');
            this.logAction('Error deleting account', err);
          },
        });
    }
  }

  private resetSuccessMessage(): void {
    setTimeout(() => this.successMessage$.next(null), this.SUCCESS_TIMEOUT);
  }
}