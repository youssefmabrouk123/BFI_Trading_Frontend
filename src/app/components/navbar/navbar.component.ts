import { Component, ElementRef, HostListener, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { AuthService, User } from 'src/app/services/auth/auth.service'; // Assurez-vous que le chemin est correct

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit, OnDestroy {
  isDropdownOpen = false;
  isMobileMenuOpen = false;
  currentRoute = '';
  user: User | null = null; // Données de l'utilisateur
  private subscriptions = new Subscription();

  constructor(
    private eRef: ElementRef,
    private router: Router,
    private authService: AuthService
  ) {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.currentRoute = event.urlAfterRedirects;
      this.closeMobileMenu();
    });
  }

  ngOnInit(): void {
    // Récupérer les données de l'utilisateur au démarrage
    this.subscriptions.add(
      this.authService.getUserObservable().subscribe(user => {
        this.user = user;
      })
    );

    // Si l'utilisateur n'est pas encore chargé, tenter de récupérer les détails
    if (!this.user && this.authService.getToken()) {
      this.authService.getUserDetails().subscribe();
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  toggleDropdown(): void {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  closeDropdown(): void {
    this.isDropdownOpen = false;
  }

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

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!this.eRef.nativeElement.contains(target)) {
      this.closeDropdown();
    }
    if (target.classList.contains('mobile-menu-overlay')) {
      this.closeMobileMenu();
    }
  }

  @HostListener('window:resize')
  onResize(): void {
    if (window.innerWidth > 768 && this.isMobileMenuOpen) {
      this.closeMobileMenu();
    }
  }
}