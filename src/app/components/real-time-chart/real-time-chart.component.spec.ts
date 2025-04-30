import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RealTimeChartComponent } from './real-time-chart.component';

describe('RealTimeChartComponent', () => {
  let component: RealTimeChartComponent;
  let fixture: ComponentFixture<RealTimeChartComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [RealTimeChartComponent]
    });
    fixture = TestBed.createComponent(RealTimeChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
