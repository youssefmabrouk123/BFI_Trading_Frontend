import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import {  NgChartsModule } from 'ng2-charts';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { TopSectionComponent } from './components/top-section/top-section.component';
import { LeftPanelComponent } from './components/left-panel/left-panel.component';
import { BottomPanelComponent } from './components/bottom-panel/bottom-panel.component';
import { LucideAngularModule, Zap, Search, Filter, Plus } from 'lucide-angular';
import { NavbarComponent } from './components/navbar/navbar.component';
import {  FormsModule, ReactiveFormsModule } from '@angular/forms';  
import {  HTTP_INTERCEPTORS, HttpClientModule ,HttpClient} from '@angular/common/http';
import { WatchlistComponent } from './components/watchlist/watchlist.component';
import { CommonModule } from '@angular/common';
import { NgParticlesModule } from 'ng-particles';
import { RightPanelComponent } from './components/right-panel/right-panel.component';
import { ToastrModule } from 'ngx-toastr';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { HighchartsChartModule } from 'highcharts-angular';
import { TradePopupComponent } from './components/trade-popup/trade-popup.component';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { PositionTableComponent } from './components/position-table/position-table.component';
import { ClosePositionDialogComponent } from './components/close-position-dialog/close-position-dialog.component';
import { ClosedPositionsTableComponent } from './components/closed-positions-table/closed-positions-table.component';
import { TransactionTableComponent } from './components/transaction-table/transaction-table.component';
import { NgxChartsModule } from '@swimlane/ngx-charts';
import { AnalyticsComponent } from './pages/analytics/analytics.component';
import { MainComponent } from './pages/main/main.component';
import { AccountComponent } from './pages/account/account.component';
import { StopLossTakeProfitPopupComponent } from './components/stop-loss-take-profit-popup/stop-loss-take-profit-popup.component';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
// import { PendingOrderTableComponent } from './components/pending-order-table/pending-order-table.component';
import { CandlestickChartComponent } from './components/candlestick-chart/candlestick-chart.component';
import { SocketIoConfig, SocketIoModule } from 'ngx-socket-io';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { LanguageSwitcherComponent } from './components/language-switcher/language-switcher.component';
import { ThemeToggleComponent } from './components/theme-toggle/theme-toggle.component';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import {MatTooltipModule} from '@angular/material/tooltip';
import { PendingOrderTableComponent } from './components/pending-order-table/pending-order-table.component';
import { ForexChartComponent } from './components/forex-chart/forex-chart.component';
import { RealTimeChartComponent } from './components/real-time-chart/real-time-chart.component';
import { CandleChartComponent } from './components/candle-chart/candle-chart.component';
import {  OperationPopupComponent } from './components/operation-popup/operation-popup.component';
import { TestpopupComponent } from './components/testpopup/testpopup.component';

const config: SocketIoConfig = { url: 'http://localhost:9092', options: {} };

export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

@NgModule({
  declarations: [
    AppComponent,
    DashboardComponent,
    TopSectionComponent,
    LeftPanelComponent,
    BottomPanelComponent,
    NavbarComponent,
    WatchlistComponent,
    RightPanelComponent,
    TradePopupComponent,
    PositionTableComponent,
    ClosePositionDialogComponent,
    ClosedPositionsTableComponent,
    TransactionTableComponent,
    AnalyticsComponent,
    MainComponent,
    AccountComponent,
    StopLossTakeProfitPopupComponent,
    PendingOrderTableComponent,
    CandlestickChartComponent,
    LanguageSwitcherComponent,
    ThemeToggleComponent,
    ForexChartComponent,
    RealTimeChartComponent,
    CandleChartComponent,
    OperationPopupComponent,
    TestpopupComponent
    
    
  
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    LucideAngularModule.pick({ Zap, Search, Filter, Plus }),
    FormsModule,
    HttpClientModule,
    CommonModule,
    ReactiveFormsModule,
    BrowserAnimationsModule,
    MatSnackBarModule,
    MatTooltipModule,
    FormsModule,
    ToastrModule.forRoot({
      timeOut: 3000,
      positionClass: 'toast-top-right',
      preventDuplicates: true,
    }),
    HighchartsChartModule,
    MatDialogModule,
    MatIconModule,
    MatButtonModule,
    NgxChartsModule,
    NgChartsModule,
    MatFormFieldModule,
    MatInputModule,
    MatNativeDateModule,
    MatDatepickerModule,
    MatSelectModule ,
    SocketIoModule.forRoot(config),
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient],
      },
    }),
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }