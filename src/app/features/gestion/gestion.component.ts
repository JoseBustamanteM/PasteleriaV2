import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-gestion',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './gestion.component.html'
})
export class GestionComponent {
  private router = inject(Router);

  abrirSeccion(ruta: string) {
    this.router.navigate([`/gestion/${ruta}`]);
  }
}
