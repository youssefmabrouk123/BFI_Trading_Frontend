import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TradingChartComponent } from './trading-chart.component';

describe('TradingChartComponent', () => {
  let component: TradingChartComponent;
  let fixture: ComponentFixture<TradingChartComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [TradingChartComponent]
    });
    fixture = TestBed.createComponent(TradingChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
