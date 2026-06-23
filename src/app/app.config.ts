import { ApplicationConfig, LOCALE_ID } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

// 1. Importaciones para el idioma español
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';

import { provideCalendar, DateAdapter } from 'angular-calendar';
import { adapterFactory } from 'angular-calendar/date-adapters/date-fns';

// 2. Registramos los datos del idioma español de forma global
registerLocaleData(localeEs, 'es');

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideAnimationsAsync(),
    provideCalendar({
      provide: DateAdapter,
      useFactory: adapterFactory,
    }),
    // 3. Le decimos a Angular que nuestra app funcionará en español
    { provide: LOCALE_ID, useValue: 'es' }
  ]
};
