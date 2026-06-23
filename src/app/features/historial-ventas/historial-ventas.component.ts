import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from '../../core/services/supabase.service';

@Component({
  selector: 'app-historial-ventas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './historial-ventas.component.html'
})
export class HistorialVentasComponent implements OnInit {
  private supabase = inject(SupabaseService);
  private router = inject(Router);

  // Filtros
  desde = signal<string>('');
  hasta = signal<string>('');
  estado = signal<string>('');
  cliente_id = signal<string>('');
  metodo_pago_id = signal<string>('');
  producto_id = signal<string>('');

  // Datos para los selectores
  clientes = signal<any[]>([]);
  productos = signal<any[]>([]);
  metodosPago = signal<any[]>([]);

  ventas = signal<any[]>([]);
  cargando = signal<boolean>(false);

  async ngOnInit() {
    const [c, p, m] = await Promise.all([
      this.supabase.obtenerClientes(),
      this.supabase.obtenerProductosActivos(),
      this.supabase.obtenerMetodosPago()
    ]);
    if (c.data) this.clientes.set(c.data);
    if (p.data) this.productos.set(p.data);
    if (m.data) this.metodosPago.set(m.data);
  }

  async buscar() {
    this.cargando.set(true);
    const { data } = await this.supabase.buscarVentas({
      desde: this.desde() ? `${this.desde()}T00:00:00Z` : undefined,
      hasta: this.hasta() ? `${this.hasta()}T23:59:59Z` : undefined,
      estado: this.estado() || undefined,
      cliente_id: this.cliente_id() || undefined,
      metodo_pago_id: this.metodo_pago_id() || undefined,
      producto_id: this.producto_id() || undefined
    });
    if (data) this.ventas.set(data);
    this.cargando.set(false);
  }

  editarVenta(venta: any) {
    this.router.navigate(['/pos'], { queryParams: { editar: venta.id } });
  }
}
