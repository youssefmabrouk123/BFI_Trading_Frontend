import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { TopSectionComponent } from './components/top-section/top-section.component';
import { LeftPanelComponent } from './components/left-panel/left-panel.component';
import { RightPanelComponent } from './components/right-panel/right-panel.component';
import { BottomPanelComponent } from './components/bottom-panel/bottom-panel.component';
import { LucideAngularModule, Zap, Search, Filter, Plus } from 'lucide-angular';
import { NavbarComponent } from './components/navbar/navbar.component';
import { FormsModule } from '@angular/forms';  
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { WatchlistComponent } from './components/watchlist/watchlist.component';




@NgModule({
  declarations: [
    AppComponent,
    DashboardComponent,
    TopSectionComponent,
    LeftPanelComponent,
    RightPanelComponent,
    BottomPanelComponent,
    NavbarComponent,
    WatchlistComponent
    
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    LucideAngularModule.pick({ Zap, Search, Filter, Plus }),
    FormsModule,
    HttpClientModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
