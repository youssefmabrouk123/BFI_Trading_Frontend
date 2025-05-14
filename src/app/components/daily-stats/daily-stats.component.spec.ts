import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DailyStatsComponent } from './daily-stats.component';

describe('DailyStatsComponent', () => {
  let component: DailyStatsComponent;
  let fixture: ComponentFixture<DailyStatsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [DailyStatsComponent]
    });
    fixture = TestBed.createComponent(DailyStatsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
