import { registerLocaleData } from '@angular/common';
import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import localeFr from '@angular/common/locales/fr';
import localeEn from '@angular/common/locales/en';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {

  title = 'trading-dashboard';
}
