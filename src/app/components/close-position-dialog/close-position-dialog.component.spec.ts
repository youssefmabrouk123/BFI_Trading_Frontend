import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClosePositionDialogComponent } from './close-position-dialog.component';

describe('ClosePositionDialogComponent', () => {
  let component: ClosePositionDialogComponent;
  let fixture: ComponentFixture<ClosePositionDialogComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ClosePositionDialogComponent]
    });
    fixture = TestBed.createComponent(ClosePositionDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
