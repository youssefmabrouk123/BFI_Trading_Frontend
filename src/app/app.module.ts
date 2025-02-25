import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

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
import { AuthInterceptor } from './services/auth/auth.interceptor';




@NgModule({
  declarations: [
    AppComponent,
    DashboardComponent,
    TopSectionComponent,
    LeftPanelComponent,
    BottomPanelComponent,
    NavbarComponent,
    WatchlistComponent,
    RightPanelComponent
    
    
    
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    LucideAngularModule.pick({ Zap, Search, Filter, Plus }),
    FormsModule,
    HttpClientModule,
    CommonModule,
    ReactiveFormsModule,
    FormsModule
    
  ],
  providers: [{ provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }],
  bootstrap: [AppComponent]
})
export class AppModule { }
