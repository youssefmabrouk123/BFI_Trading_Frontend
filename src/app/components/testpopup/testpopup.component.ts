import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ThemeService } from 'src/app/services/theme/theme.service';

@Component({
  selector: 'app-testpopup',
  templateUrl: './testpopup.component.html',
  styleUrls: ['./testpopup.component.css']
})
export class TestpopupComponent implements OnInit {
  currentTheme: string = 'dark';
  isProcessing: boolean = false;
  
  // Liste des devises disponibles
  currencies: string[] = ['EUR', 'USD', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD'];
  
  // Données de l'opération
  operation = {
    counterparty: '',
    operationType: 'achat',
    buyCurrency: 'EUR',
    sellCurrency: 'USD',
    buyAmount: 0,
    sellAmount: 0,
    rate: 0,
    operationDate: '',
    valueDate: ''
  };

  constructor(
    private themeService: ThemeService,
    public dialogRef: MatDialogRef<TestpopupComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    // S'abonner aux changements de thème
    this.themeService.theme$.subscribe(theme => {
      this.currentTheme = theme;
    });

    // Initialiser les dates
    this.operation.operationDate = new Date().toISOString().split('T')[0];
    this.updateValueDate();
    
    // Si des données sont fournies au dialog, les utiliser
    if (this.data?.operation) {
      this.operation = { ...this.data.operation };
    }
  }

  /**
   * Calcule la date valeur (J+2) en tenant compte des jours ouvrables
   */
  updateValueDate(): void {
    if (!this.operation.operationDate) return;
    
    const opDate = new Date(this.operation.operationDate);
    let valueDate = new Date(opDate);
    let joursAjoutes = 0;
    
    // Ajouter 2 jours ouvrables (exclure les weekends)
    while (joursAjoutes < 2) {
      valueDate.setDate(valueDate.getDate() + 1);
      // Ne pas compter les weekends (0=dimanche, 6=samedi)
      if (valueDate.getDay() !== 0 && valueDate.getDay() !== 6) {
        joursAjoutes++;
      }
    }
    
    this.operation.valueDate = valueDate.toISOString().split('T')[0];
  }

  /**
   * Calcule le montant vendu en fonction du montant acheté et du cours
   */
  calculateSellAmount(): void {
    if (this.operation.buyAmount && this.operation.rate) {
      this.operation.sellAmount = parseFloat((this.operation.buyAmount * this.operation.rate).toFixed(2));
    }
  }

  /**
   * Calcule le montant acheté en fonction du montant vendu et du cours
   */
  calculateBuyAmount(): void {
    if (this.operation.sellAmount && this.operation.rate && this.operation.rate > 0) {
      this.operation.buyAmount = parseFloat((this.operation.sellAmount / this.operation.rate).toFixed(2));
    }
  }

  /**
   * Met à jour les montants en fonction du type d'opération
   */
  updateAmounts(): void {
    // Réinitialiser les calculs lors du changement de type d'opération
    this.calculateSellAmount();
  }

  /**
   * Vérifie si le formulaire est valide avant la soumission
   */
  isFormValid(): boolean {
    return (
      !!this.operation.counterparty &&
      !!this.operation.buyCurrency &&
      !!this.operation.sellCurrency &&
      this.operation.buyAmount > 0 &&
      this.operation.sellAmount > 0 &&
      this.operation.rate > 0 &&
      !!this.operation.operationDate
    );
  }

  /**
   * Ferme la boîte de dialogue
   */
  close(): void {
    this.dialogRef.close();
  }

  /**
   * Enregistre l'opération
   */
  saveOperation(): void {
    if (!this.isFormValid()) return;
    
    this.isProcessing = true;

    // Simulation d'un appel API (à remplacer par un vrai service)
    setTimeout(() => {
      this.isProcessing = false;
      this.snackBar.open('Opération enregistrée avec succès !', 'Fermer', {
        duration: 5000,
        panelClass: ['success-snackbar']
      });
      this.dialogRef.close({ success: true, operation: this.operation });
    }, 1000);
  }
}