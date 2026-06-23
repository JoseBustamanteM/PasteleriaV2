import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-centro-compras',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './centro-compras.component.html'
})
export class CentroComprasComponent {
  private router = inject(Router);

  abrirSeccion(ruta: string) {
    this.router.navigate([`/compras/${ruta}`]);
  }
}
