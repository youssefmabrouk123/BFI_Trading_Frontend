import { TestBed } from '@angular/core/testing';

import { TradingChartService } from './trading-chart.service';

describe('TradingChartService', () => {
  let service: TradingChartService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TradingChartService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
