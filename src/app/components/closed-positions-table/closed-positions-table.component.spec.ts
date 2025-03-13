import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClosedPositionsTableComponent } from './closed-positions-table.component';

describe('ClosedPositionsTableComponent', () => {
  let component: ClosedPositionsTableComponent;
  let fixture: ComponentFixture<ClosedPositionsTableComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ClosedPositionsTableComponent]
    });
    fixture = TestBed.createComponent(ClosedPositionsTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
