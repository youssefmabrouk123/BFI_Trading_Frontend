import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BottomPanelComponent } from './bottom-panel.component';

describe('BottomPanelComponent', () => {
  let component: BottomPanelComponent;
  let fixture: ComponentFixture<BottomPanelComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [BottomPanelComponent]
    });
    fixture = TestBed.createComponent(BottomPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
