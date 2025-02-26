import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RightPanelComponent } from './components/right-panel/right-panel.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';


const routes: Routes = [
  { path: 'dashboard', component: DashboardComponent },
  { path: '', component: RightPanelComponent },
  { path: '**', redirectTo: '' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
