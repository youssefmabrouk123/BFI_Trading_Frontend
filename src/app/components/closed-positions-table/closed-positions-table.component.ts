// closed-positions-table.component.ts
import { Component, OnInit } from '@angular/core';
import { PositionService } from 'src/app/services/position/position.service';

@Component({
    selector: 'app-closed-positions-table',
    templateUrl: './closed-positions-table.component.html',
    styleUrls: ['./closed-positions-table.component.css']
})
export class ClosedPositionsTableComponent implements OnInit {
    positions: any[] = [];
    isLoading = false;

    constructor(private positionService: PositionService) {}

    ngOnInit() {
        this.fetchClosedPositions();
    }

    fetchClosedPositions() {
        this.isLoading = true;
        this.positionService.getClosedPositions()
            .subscribe({
                next: (data) => {
                    this.positions = data;
                    this.isLoading = false;
                },
                error: (error) => {
                    console.error('Error fetching closed positions:', error);
                    this.isLoading = false;
                }
            });
    }

    getValueClass(profitLoss: number): string {
        if (profitLoss > 0) return 'text-green-500';
        if (profitLoss < 0) return 'text-red-500';
        return 'text-gray-500';
    }


    formatHoldingPeriod(hours: number): string {
      const totalMinutes = Math.round(hours * 60);
      const h = Math.floor(totalMinutes / 60);
      const m = totalMinutes % 60;
      return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }
}