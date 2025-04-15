import { TestBed } from '@angular/core/testing';

import { CandlestickServiceService } from './candlestick-service.service';

describe('CandlestickServiceService', () => {
  let service: CandlestickServiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CandlestickServiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
