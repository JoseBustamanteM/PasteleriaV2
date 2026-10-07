import { ApplicationConfig, LOCALE_ID } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

// 1. Importaciones para el idioma español
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import localeEsCL from '@angular/common/locales/es-CL';

// 2. Registramos los datos del idioma español de forma global
registerLocaleData(localeEs, 'es');
registerLocaleData(localeEsCL, 'es-CL');

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideAnimationsAsync(),
    // 3. Español de Chile: los montos se muestran como $2.000
    { provide: LOCALE_ID, useValue: 'es-CL' }
  ]
};
