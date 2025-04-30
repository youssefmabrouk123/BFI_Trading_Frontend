import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OperationPopupComponent } from './operation-popup.component';

describe('OperationPopupComponent', () => {
  let component: OperationPopupComponent;
  let fixture: ComponentFixture<OperationPopupComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [OperationPopupComponent]
    });
    fixture = TestBed.createComponent(OperationPopupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
