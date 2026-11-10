import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// Al abrir (o recargar) la app siempre partimos en la pantalla principal (dashboard),
// sin importar en qué ruta estaba el navegador. Si no hay sesión, el authGuard
// se encarga de mandar al login.
// Excepción: si hay un envío de WhatsApp a medias (ver gestion-clientes) y el celular
// recargó la pestaña al volver de WhatsApp, nos quedamos en Clientes para seguir.
let envioWhatsappActivo = false;
try { envioWhatsappActivo = sessionStorage.getItem('whatsapp-envio-activo') === '1'; } catch { }

if (envioWhatsappActivo && window.location.pathname === '/gestion/clientes') {
  // seguimos donde estábamos
} else if (window.location.pathname !== '/dashboard') {
  window.history.replaceState(null, '', '/dashboard');
}

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
