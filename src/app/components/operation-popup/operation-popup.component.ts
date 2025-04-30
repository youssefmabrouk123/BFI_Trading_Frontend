// trade-operation.component.ts
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

export type OperationType = 'achat' | 'vente' | 'cross';

export interface TradeOperation {
  contrepartie: string;
  typeOperation: OperationType;
  deviseAchat: string;
  deviseVente: string;
  montantAchete: number;
  montantVendu: number;
  cours: number;
  dateOperation: Date;
  dateValeur: string;
}

@Component({
  selector: 'app-operation-popup',
  templateUrl: './operation-popup.component.html',
  styleUrls: ['./operation-popup.component.css']
})
export class OperationPopupComponent implements OnInit {
  @Input() isOpen = false;
  @Input() operation: Partial<TradeOperation> = {};
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<TradeOperation>();

  tradeForm!: FormGroup;
  operationTypes: OperationType[] = ['achat', 'vente', 'cross'];
  currencies = ['EUR', 'USD', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD'];

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.initForm();
  }

  private initForm(): void {
    const today = new Date();
    const jPlus2 = new Date();
    jPlus2.setDate(today.getDate() + 2);

    this.tradeForm = this.fb.group({
      contrepartie: [this.operation.contrepartie || '', Validators.required],
      typeOperation: [this.operation.typeOperation || 'achat', Validators.required],
      deviseAchat: [this.operation.deviseAchat || 'EUR', Validators.required],
      deviseVente: [this.operation.deviseVente || 'USD', Validators.required],
      montantAchete: [this.operation.montantAchete || null, [Validators.required, Validators.min(0)]],
      montantVendu: [this.operation.montantVendu || null, [Validators.required, Validators.min(0)]],
      cours: [this.operation.cours || null, [Validators.required, Validators.min(0)]],
      dateOperation: [this.operation.dateOperation || today.toISOString().split('T')[0], Validators.required],
      dateValeur: [this.operation.dateValeur || 'J+2']
    });

    // Réagir aux changements du type d'opération
    this.tradeForm.get('typeOperation')?.valueChanges.subscribe((type: OperationType) => {
      if (type === 'cross') {
        // Pour le cross, on active tous les champs
        this.tradeForm.get('deviseAchat')?.enable();
        this.tradeForm.get('deviseVente')?.enable();
        this.tradeForm.get('montantAchete')?.enable();
        this.tradeForm.get('montantVendu')?.enable();
      } else if (type === 'achat') {
        // Pour l'achat, on se concentre sur la devise achetée
        this.tradeForm.get('deviseAchat')?.enable();
        this.tradeForm.get('montantAchete')?.enable();
      } else if (type === 'vente') {
        // Pour la vente, on se concentre sur la devise vendue
        this.tradeForm.get('deviseVente')?.enable();
        this.tradeForm.get('montantVendu')?.enable();
      }
    });

    // Calcul automatique lors des changements de montants ou de cours
    const montantAchete = this.tradeForm.get('montantAchete');
    const montantVendu = this.tradeForm.get('montantVendu');
    const cours = this.tradeForm.get('cours');

    montantAchete?.valueChanges.subscribe(value => {
      if (value && cours?.value && !this.isChangingByProgram) {
        this.isChangingByProgram = true;
        montantVendu?.setValue((value / cours.value).toFixed(2));
        this.isChangingByProgram = false;
      }
    });

    montantVendu?.valueChanges.subscribe(value => {
      if (value && cours?.value && !this.isChangingByProgram) {
        this.isChangingByProgram = true;
        montantAchete?.setValue((value * cours.value).toFixed(2));
        this.isChangingByProgram = false;
      }
    });

    cours?.valueChanges.subscribe(value => {
      if (value && montantAchete?.value && !this.isChangingByProgram) {
        this.isChangingByProgram = true;
        montantVendu?.setValue((montantAchete.value / value).toFixed(2));
        this.isChangingByProgram = false;
      }
    });
  }

  private isChangingByProgram = false;

  onSubmit(): void {
    if (this.tradeForm.valid) {
      this.save.emit(this.tradeForm.value);
      this.closePopup();
    } else {
      this.tradeForm.markAllAsTouched();
    }
  }

  closePopup(): void {
    this.isOpen = false;
    this.close.emit();
  }

  // Empêcher la propagation du clic à l'intérieur du popup
  onPopupClick(event: MouseEvent): void {
    event.stopPropagation();
  }
}