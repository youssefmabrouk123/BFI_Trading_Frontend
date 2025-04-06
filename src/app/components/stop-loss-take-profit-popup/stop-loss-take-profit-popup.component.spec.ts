import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StopLossTakeProfitPopupComponent } from './stop-loss-take-profit-popup.component';

describe('StopLossTakeProfitPopupComponent', () => {
  let component: StopLossTakeProfitPopupComponent;
  let fixture: ComponentFixture<StopLossTakeProfitPopupComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [StopLossTakeProfitPopupComponent]
    });
    fixture = TestBed.createComponent(StopLossTakeProfitPopupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
