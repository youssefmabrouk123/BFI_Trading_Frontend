import { TestBed } from '@angular/core/testing';

import { ForexChartService } from './forex-chart.service';

describe('ForexChartService', () => {
  let service: ForexChartService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ForexChartService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
