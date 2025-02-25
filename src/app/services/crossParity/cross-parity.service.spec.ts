import { TestBed } from '@angular/core/testing';

import { CrossParityService } from './cross-parity.service';

describe('CrossParityService', () => {
  let service: CrossParityService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CrossParityService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
