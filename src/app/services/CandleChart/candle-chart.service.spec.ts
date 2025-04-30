import { TestBed } from '@angular/core/testing';

import { CandleChartService } from './candle-chart.service';

describe('CandleChartService', () => {
  let service: CandleChartService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CandleChartService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
