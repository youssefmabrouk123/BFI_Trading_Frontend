import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { PositionDTO } from 'src/app/models/position-dto';
import { SocketService } from 'src/app/services/socket/socket.service';
import { MatDialog } from '@angular/material/dialog';
import { TradePopupComponent } from '../trade-popup/trade-popup.component'; // Adjust the import path as needed

@Component({
  selector: 'app-position-table',
  templateUrl: './position-table.component.html',
  styleUrls: ['./position-table.component.css']
})
export class PositionTableComponent implements OnInit, OnDestroy {
  positions: PositionDTO[] = [];
  private positionsSubscription: Subscription | undefined;

  constructor(
    private socketService: SocketService,
    public dialog: MatDialog // Inject MatDialog
  ) {}

  ngOnInit() {
    this.positionsSubscription = this.socketService.getPositions().subscribe(
      (positions: PositionDTO[]) => {
        console.log('Positions updated in component:', positions);
        this.positions = positions;
      },
      (error) => {
        console.error('Erreur lors de la réception des positions', error);
      }
    );
  }

  ngOnDestroy() {
    if (this.positionsSubscription) {
      this.positionsSubscription.unsubscribe();
    }
  }

  // Méthode pour déterminer le style de la position finale
  getStyle(position: PositionDTO) {
    const finalPosition = position.mntDev - position.besoinDev;

    if (finalPosition > 0) {
      return { color: 'green', fontWeight: 'bold' }; // Positif : vert
    } else if (finalPosition < 0) {
      return { color: 'red', fontWeight: 'bold' }; // Négatif : rouge
    } else {
      return { color: 'black', fontStyle: 'italic' }; // Zéro : noir italique
    }
  }

  // Méthode pour ouvrir la popup de trading
  openTradePopup(position: PositionDTO) {
    const instrument = `${position.identifier}/TND`; // Base currency = Devise, Quote currency = TND
    const dialogRef = this.dialog.open(TradePopupComponent, {
      data: {
        pk: position.pk,
        instrument: instrument,
        // Optionally pass bidPrice and askPrice if available from another service
        // For now, we'll assume they might need to be fetched or passed differently
      },
      width: '350px',
      panelClass: 'custom-dialog-container'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.success) {
        // Handle successful trade if needed
        console.log('Trade successful', result.position);
      }
    });
  }

  getValueClass(value: string): string {
    if (parseFloat(value) > 0) {
      return 'text-green';
    } else if (parseFloat(value) < 0) {
      return 'text-red';
    } else {
      return '';
    }
  }
}