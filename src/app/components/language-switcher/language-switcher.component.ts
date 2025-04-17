import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-language-switcher',
  templateUrl: './language-switcher.component.html',
  styleUrls: ['./language-switcher.component.css']
})
export class LanguageSwitcherComponent implements OnInit {
  currentLang: string = 'en';

  constructor(private translate: TranslateService) {}

  ngOnInit(): void {
    this.currentLang = localStorage.getItem('language') || 'en';
    this.translate.use(this.currentLang);
  }

  switchLanguage(lang: string): void {
    this.currentLang = lang;
    localStorage.setItem('language', lang);
    this.translate.use(lang);
  }
}