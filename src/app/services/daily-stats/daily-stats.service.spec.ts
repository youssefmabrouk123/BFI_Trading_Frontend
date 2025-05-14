import { TestBed } from '@angular/core/testing';

import { DailyStatsService } from './daily-stats.service';

describe('DailyStatsService', () => {
  let service: DailyStatsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DailyStatsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
