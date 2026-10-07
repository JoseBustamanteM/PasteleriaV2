import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd, RouterModule } from '@angular/router';
import { filter } from 'rxjs/operators';

interface ItemNav {
  nombre: string;
  ruta: string;
  icono: 'inicio' | 'balance' | 'compras' | 'gestion';
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterModule],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App {
  private router = inject(Router);

  // Señal para saber si estamos en la vista de login y ocultar la navegación
  isAuthRoute = signal(this.router.url.includes('/auth'));

  // Botones de la cápsula de navegación (el botón central de venta va aparte)
  navIzquierda: ItemNav[] = [
    { nombre: 'Inicio', ruta: '/dashboard', icono: 'inicio' },
    { nombre: 'Balance', ruta: '/historial', icono: 'balance' },
  ];
  navDerecha: ItemNav[] = [
    { nombre: 'Compras', ruta: '/compras', icono: 'compras' },
    { nombre: 'Gestión', ruta: '/gestion', icono: 'gestion' },
  ];

  constructor() {
    // Escuchamos los cambios de ruta para actualizar la interfaz
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe(event => {
      this.isAuthRoute.set(event.urlAfterRedirects.includes('/auth'));
    });
  }
}
