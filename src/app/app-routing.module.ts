import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RightPanelComponent } from './components/right-panel/right-panel.component';
import { AuthGuard } from './guards/auth.guard';
import { NoAuthGuard } from './guards/no-auth.guard';
import { MainComponent } from './pages/main/main.component';

const routes: Routes = [
  {
    path: 'dashboard',
    component: MainComponent,
    canActivate: [AuthGuard] // Protège la vue principale
  },
  {
    path: 'login',
    component: RightPanelComponent,
    canActivate: [NoAuthGuard],
    data: { tab: 'login' }
  },
  {
    path: 'signup',
    component: RightPanelComponent,
    canActivate: [NoAuthGuard],
    data: { tab: 'signup' }
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }