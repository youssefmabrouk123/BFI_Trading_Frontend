import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-close-position-dialog',
  templateUrl: './close-position-dialog.component.html',
  styleUrls: ['./close-position-dialog.component.css']
})
export class ClosePositionDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ClosePositionDialogComponent>, 
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  // Fonction pour fermer le popup
  closeDialog(): void {
    this.dialogRef.close(false);
  }

  // Fonction pour confirmer l'action
  confirmTrade(): void {
    this.dialogRef.close(true);
  }

  // Méthode utilitaire pour appliquer des classes CSS en fonction de la valeur
  getValueClass(value: number): string {
    if (!value) return '';
    return value > 0 ? 'text-green-500' : 'text-red-500';
  }
}