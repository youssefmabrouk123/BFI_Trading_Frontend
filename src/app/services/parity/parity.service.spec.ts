import { TestBed } from '@angular/core/testing';

import { ParityService } from './parity.service';

describe('ParityService', () => {
  let service: ParityService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ParityService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
