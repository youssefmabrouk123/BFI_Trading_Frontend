import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ForexChartComponent } from './forex-chart.component';

describe('ForexChartComponent', () => {
  let component: ForexChartComponent;
  let fixture: ComponentFixture<ForexChartComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ForexChartComponent]
    });
    fixture = TestBed.createComponent(ForexChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
