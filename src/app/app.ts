import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd, RouterModule } from '@angular/router';
import { filter } from 'rxjs/operators';
import { SupabaseService } from './core/services/supabase.service';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterModule],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App {
  private router = inject(Router);
  private supabaseService = inject(SupabaseService);


  // Usamos una señal para saber si estamos en la vista de login y ocultar la navegación
  isAuthRoute = this.router.url.includes('/auth') ? () => true : () => false;

  constructor() {
    // Escuchamos los cambios de ruta para actualizar la interfaz
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.isAuthRoute = () => event.urlAfterRedirects.includes('/auth');
    });
  }

  // Método para el botón de logout del Top Bar
  async logout() {
    try {
      await this.supabaseService.logout();
      this.router.navigate(['/auth']);
    } catch (error) {
      console.error('Error cerrando sesión:', error);
    }
  }

  irA(ruta: string) {
    this.router.navigate([`/${ruta}`]);
  }
}
