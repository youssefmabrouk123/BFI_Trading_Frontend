import { TestBed } from '@angular/core/testing';

import { QuoteHistoryService } from './quote-history.service';

describe('QuoteHistoryService', () => {
  let service: QuoteHistoryService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(QuoteHistoryService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
