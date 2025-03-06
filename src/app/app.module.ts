import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
// import {  NgChartsModule } from 'ng2-charts';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { TopSectionComponent } from './components/top-section/top-section.component';
import { LeftPanelComponent } from './components/left-panel/left-panel.component';
import { BottomPanelComponent } from './components/bottom-panel/bottom-panel.component';
import { LucideAngularModule, Zap, Search, Filter, Plus } from 'lucide-angular';
import { NavbarComponent } from './components/navbar/navbar.component';
import {  FormsModule, ReactiveFormsModule } from '@angular/forms';  
import {  HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { WatchlistComponent } from './components/watchlist/watchlist.component';
import { CommonModule } from '@angular/common';
import { NgParticlesModule } from 'ng-particles';
import { RightPanelComponent } from './components/right-panel/right-panel.component';
// import { AuthInterceptor } from './services/auth/auth.interceptor';
import { ToastrModule } from 'ngx-toastr';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { TradingChartComponent } from './components/trading-chart/trading-chart.component';
import { HighchartsChartModule } from 'highcharts-angular';
import { TradePopupComponent } from './components/trade-popup/trade-popup.component';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

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
    TradingChartComponent,
    TradePopupComponent,
   
    
    
    
    
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
    
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
