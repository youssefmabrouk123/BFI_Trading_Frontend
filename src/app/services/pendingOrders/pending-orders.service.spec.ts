import { TestBed } from '@angular/core/testing';

import { PendingOrdersService } from './pending-orders.service';

describe('PendingOrdersService', () => {
  let service: PendingOrdersService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PendingOrdersService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
