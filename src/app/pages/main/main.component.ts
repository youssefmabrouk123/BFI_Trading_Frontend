import { Component, OnInit, OnDestroy } from '@angular/core';
import { AuthService, User } from 'src/app/services/auth/auth.service';
import { Subscription } from 'rxjs';
import { NotificationService, Notification } from 'src/app/services/notification/notification.service';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { TranslateService } from '@ngx-translate/core';
import { ThemeService } from 'src/app/services/theme/theme.service';

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.css'],
  animations: [
    trigger('notificationAnimation', [
      state('unread', style({ background: 'rgba(229, 191, 125, 0.05)', opacity: 1 })),
      state('read', style({ background: 'transparent', opacity: 0.85 })),
      transition('unread => read', animate('400ms ease-out')),
      transition('read => unread', animate('400ms ease-in'))
    ])
  ]
})
export class MainComponent implements OnInit, OnDestroy {
  isDropdownOpen = false;
  isSettingsSubMenuOpen = false;
  isMobileMenuOpen = false;
  isNotificationsOpen = false;
  selectedView: 'dashboard' | 'analytics' | 'account' = 'dashboard';
  user: User | null = null;
  notifications: Notification[] = [];
  unreadCount = 0;
  private subscriptions = new Subscription();
  currentTheme?: string;

  constructor(
    private authService: AuthService,
    private notificationService: NotificationService,
    private translate: TranslateService,
    private themeService: ThemeService
  ) {
    this.translate.setDefaultLang('en');
    const savedLang = localStorage.getItem('lang');
    this.translate.use(savedLang || 'en');
    this.themeService.theme$.subscribe(theme => {
      this.currentTheme = theme;
    });
  }

  ngOnInit(): void {
    this.subscriptions.add(
      this.authService.getUserObservable().subscribe(user => {
        this.user = user;
        if (user) {
          this.initializeNotifications();
        }
      })
    );

    if (!this.user && this.authService.getToken()) {
      this.authService.getUserDetails().subscribe();
    }
  }

  private initializeNotifications(): void {
    this.subscriptions.add(
      this.notificationService.notifications$.subscribe(notifications => {
        this.notifications = notifications;
        this.unreadCount = this.notificationService.getUnreadCount();
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.notificationService.disconnect();
  }

  toggleNotifications(): void {
    this.isNotificationsOpen = !this.isNotificationsOpen;
    this.isDropdownOpen = false;
  }

  closeNotifications(): void {
    this.isNotificationsOpen = false;
  }

  markNotificationAsRead(notificationId: number): void {
    if (this.user) {
      this.notificationService.markAsRead(notificationId, this.user.id);
    }
  }

  markAllAsRead(): void {
    if (this.user) {
      this.notificationService.markAllAsRead(this.user.id);
    }
  }

  deleteNotification(notificationId: number): void {
    if (this.user) {
      this.notificationService.deleteNotification(notificationId, this.user.id);
    }
  }

  viewAllNotifications(event: Event): void {
    event.preventDefault();
    console.log('View all notifications clicked');
  }

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

  toggleDropdown(): void {
    this.isDropdownOpen = !this.isDropdownOpen;
    this.isNotificationsOpen = false;
  }

  closeDropdown(): void {
    this.isDropdownOpen = false;
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
    document.body.style.overflow = this.isMobileMenuOpen ? 'hidden' : '';
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen = false;
    document.body.style.overflow = '';
  }

  logout(): void {
    this.authService.logout();
    this.closeDropdown();
    this.closeMobileMenu();
    this.closeNotifications();
  }

  toggleSettingsSubMenu(): void {
    this.isSettingsSubMenuOpen = !this.isSettingsSubMenuOpen;
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  onOutsideClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.profile-dropdown') && !target.closest('.profile-trigger')) this.closeDropdown();
    if (!target.closest('.notification-dropdown') && !target.closest('.notification-icon-button')) this.closeNotifications();
    if (target.classList.contains('mobile-menu-overlay')) this.closeMobileMenu();
  }
}