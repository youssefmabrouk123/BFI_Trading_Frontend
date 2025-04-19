import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { PositionDTO } from 'src/app/models/position-dto';
import { SocketService } from 'src/app/services/socket/socket.service';
import { MatDialog } from '@angular/material/dialog';
import { TradePopupComponent } from '../trade-popup/trade-popup.component';
import { StopLossTakeProfitPopupComponent } from '../stop-loss-take-profit-popup/stop-loss-take-profit-popup.component';
import { ThemeService } from 'src/app/services/theme/theme.service';

@Component({
  selector: 'app-position-table',
  templateUrl: './position-table.component.html',
  styleUrls: ['./position-table.component.css'] // Updated to .scss for consistency
})
export class PositionTableComponent implements OnInit, OnDestroy {
  currentTheme: string = 'dark';
  positions: PositionDTO[] = [];
  filteredPositions: PositionDTO[] = [];
  isLoading = true;
  isRefreshing = false;
  searchQuery = '';
  skeletonArray = Array(5);
  activeDropdown: number | null = null;
  sortField: keyof PositionDTO | 'finalPosition' = 'identifier';
  sortDirection: 'asc' | 'desc' = 'asc';
  private positionsSubscription?: Subscription;

  constructor(
    private socketService: SocketService,
    public dialog: MatDialog,
    private themeService: ThemeService
  ) {}

  ngOnInit(): void {
    this.setupSocketSubscription();
    this.socketService.requestPositionsUpdate();
    this.themeService.theme$.subscribe(theme => {
      console.log('Dashboard theme updated:', theme);
      this.currentTheme = theme;
    });
  }

  ngOnDestroy(): void {
    this.positionsSubscription?.unsubscribe();
  }

  setupSocketSubscription(): void {
    this.positionsSubscription = this.socketService.getPositions().subscribe({
      next: (positions: PositionDTO[]) => {
        console.log('Positions updated:', positions);
        this.positions = positions;
        this.filterAndSortPositions();
        this.isLoading = false;
        this.isRefreshing = false;
      },
      error: (error) => {
        console.error('Erreur lors de la réception des positions:', error);
        this.isLoading = false;
        this.isRefreshing = false;
      }
    });
  }

  refreshPositions(): void {
    this.isRefreshing = true;
    this.socketService.requestPositionsUpdate();
  }

  filterAndSortPositions(): void {
    let filtered = this.positions.filter(position =>
      position.identifier.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
      (position.mntDev - position.besoinDev).toString().includes(this.searchQuery)
    );

    this.filteredPositions = this.sortPositions(filtered);
  }

  sortBy(field: keyof PositionDTO | 'finalPosition'): void {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }
    this.filterAndSortPositions();
  }

  sortPositions(positions: PositionDTO[]): PositionDTO[] {
    return positions.sort((a, b) => {
      let valueA: number | string;
      let valueB: number | string;

      if (this.sortField === 'finalPosition') {
        valueA = a.mntDev - a.besoinDev;
        valueB = b.mntDev - b.besoinDev;
      } else {
        valueA = a[this.sortField] as number | string;
        valueB = b[this.sortField] as number | string;
      }

      if (typeof valueA === 'string' && typeof valueB === 'string') {
        return this.sortDirection === 'asc' 
          ? valueA.localeCompare(valueB) 
          : valueB.localeCompare(valueA);
      }
      return this.sortDirection === 'asc' 
        ? (valueA as number) - (valueB as number) 
        : (valueB as number) - (valueA as number);
    });
  }

  getSortIcon(field: string): string {
    if (this.sortField !== field) return 'fa-sort';
    return this.sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
  }

  getValueClass(value: number): string {
    if (isNaN(value)) return 'text-gray-300';
    return value > 0 ? 'text-green-500' : value < 0 ? 'text-red-500' : 'text-gray-300';
  }

  getValueText(value: string): string {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return value;
    return numValue > 0 ? `+${numValue}` : numValue.toString();
  }

  toggleActions(positionId: number): void {
    this.activeDropdown = this.activeDropdown === positionId ? null : positionId;
  }

  openTradePopup(position: PositionDTO): void {
    const instrument = `${position.identifier}/TND`;
    const dialogRef = this.dialog.open(TradePopupComponent, {
      data: { pk: position.pk, instrument },
      width: '350px',
      panelClass: 'custom-dialog-container'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.success) {
        console.log('Trade successful:', result.position);
        this.socketService.requestPositionsUpdate();
      }
      this.activeDropdown = null;
    });
  }

  openStopLossTakeProfitPopup(position: PositionDTO): void {
    if (!position.identifier || !position.pk) {
      console.error('Position data incomplete:', position);
      return;
    }

    const instrument = `${position.identifier}/TND`;
    const dialogRef = this.dialog.open(StopLossTakeProfitPopupComponent, {
      data: {
        baseCurrency: position.identifier,
        quoteCurrency: 'TND',
        positionId: position.pk,
        currentPosition: position.mntDev - position.besoinDev
      },
      width: '400px',
      panelClass: 'custom-dialog-container'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.success) {
        console.log('SL/TP set successfully:', result);
        this.socketService.requestPositionsUpdate();
      }
      this.activeDropdown = null;
    });
  }

  // closePosition(position: PositionDTO): void {
  //   if (confirm(`Are you sure you want to close the position for ${position.identifier}?`)) {
  //     console.log('Closing position:', position);
  //     this.socketService.requestPositionsUpdate(); // Placeholder for actual close logic
  //     this.activeDropdown = null;
  //   }
  // }

  trackById(index: number, position: PositionDTO): number | undefined {
    return position.pk;
  }
}