import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// Al abrir (o recargar) la app siempre partimos en la pantalla principal (dashboard),
// sin importar en qué ruta estaba el navegador. Si no hay sesión, el authGuard
// se encarga de mandar al login.
if (window.location.pathname !== '/dashboard') {
  window.history.replaceState(null, '', '/dashboard');
}

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
