import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TradePopupComponent } from './trade-popup.component';

describe('TradePopupComponent', () => {
  let component: TradePopupComponent;
  let fixture: ComponentFixture<TradePopupComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [TradePopupComponent]
    });
    fixture = TestBed.createComponent(TradePopupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
