import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PendingOrderTableComponent } from './pending-order-table.component';

describe('PendingOrderTableComponent', () => {
  let component: PendingOrderTableComponent;
  let fixture: ComponentFixture<PendingOrderTableComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PendingOrderTableComponent]
    });
    fixture = TestBed.createComponent(PendingOrderTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
