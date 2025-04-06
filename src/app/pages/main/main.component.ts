import { Component, OnInit, OnDestroy } from '@angular/core';
import { AuthService, User } from 'src/app/services/auth/auth.service'; // Assurez-vous que le chemin est correct
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.css']
})
export class MainComponent implements OnInit, OnDestroy {
  isDropdownOpen = false;
  isMobileMenuOpen = false;
  selectedView: 'dashboard' | 'analytics' | 'account' = 'dashboard'; // Vue par défaut
  user: User | null = null;
  private subscriptions = new Subscription();

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.subscriptions.add(
      this.authService.getUserObservable().subscribe(user => {
        this.user = user;
      })
    );

    if (!this.user && this.authService.getToken()) {
      this.authService.getUserDetails().subscribe();
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  // Méthodes pour basculer entre les vues
  showDashboard(): void {
    this.selectedView = 'dashboard';
    this.closeMobileMenu();
  }

  showAnalytics(): void {
    this.selectedView = 'analytics';
    this.closeMobileMenu();
  }

  showAccount(): void {
    this.selectedView = 'account';
    this.closeMobileMenu();
  }

  // Gestion du dropdown
  toggleDropdown(): void {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  closeDropdown(): void {
    this.isDropdownOpen = false;
  }

  // Gestion du menu mobile
  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
    if (this.isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen = false;
    document.body.style.overflow = '';
  }

  logout(): void {
    this.authService.logout();
    this.closeDropdown();
    this.closeMobileMenu();
  }

  // Gestion des clics extérieurs
  onOutsideClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.profile-dropdown') && !target.closest('.profile-trigger')) {
      this.closeDropdown();
    }
    if (target.classList.contains('mobile-menu-overlay')) {
      this.closeMobileMenu();
    }
  }
}