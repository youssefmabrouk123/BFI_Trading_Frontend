import { TestBed } from '@angular/core/testing';

import { CrossService } from './cross.service';

describe('CrossService', () => {
  let service: CrossService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CrossService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
