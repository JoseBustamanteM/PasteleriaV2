import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { SupabaseService } from '../../../core/services/supabase.service';

interface GrupoProducto {
  id: string;
  nombre: string;
  icono: string;
  cantidadTotal: number;
  totalVendido: number;
  totalDeuda: number;
}

@Component({
  selector: 'app-dia-detalle',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dia-detalle.component.html'
})
export class DiaDetalleComponent implements OnInit {
  public data: { fecha: string, estado: string } = inject(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<DiaDetalleComponent>);
  private supabase = inject(SupabaseService);
  private router = inject(Router);

  gruposProductos = signal<GrupoProducto[]>([]);
  cargando = signal<boolean>(true);

  ngOnInit() { this.cargarDatos(); }

  async cargarDatos() {
    this.cargando.set(true);
    const { data, error } = await this.supabase.obtenerDetalleVentasDia(this.data.fecha);

    if (error) {
      console.error('🕵️‍♂️ Error de Supabase al cargar el día:', error);
    }

    if (data) {
      this.agruparVentas(data);
    }
    this.cargando.set(false);
  }

  agruparVentas(ventasRaw: any[]) {
    const mapa = new Map<string, GrupoProducto>();
    ventasRaw.forEach(venta => {
      const nombreProd = venta.producto?.nombre || 'Producto Desconocido';
      const estado = String(venta.estado).trim().toLowerCase();
      const deudaVenta = estado === 'pendiente' ? (venta.precio_total - venta.valor_pagado) : 0;

      if (!mapa.has(nombreProd)) {
        mapa.set(nombreProd, {
          id: venta.producto_id,
          nombre: nombreProd,
          icono: venta.producto?.icono || '📦',
          cantidadTotal: 0,
          totalVendido: 0,
          totalDeuda: 0
        });
      }

      const grupo = mapa.get(nombreProd)!;
      grupo.cantidadTotal += venta.cantidad;
      grupo.totalVendido += venta.precio_total;
      grupo.totalDeuda += deudaVenta;
    });

    this.gruposProductos.set(Array.from(mapa.values()));
  }

  // LA MAGIA: El símbolo "?" hace que el parámetro sea opcional.
  // Así el HTML puede llamarlo vacío sin que tire error.
  irAlPOS(productoId?: string) {
    this.cerrar();

    if (productoId) {
      this.router.navigate(['/pos'], {
        queryParams: { fecha: this.data.fecha, producto: productoId }
      });
    } else {
      this.router.navigate(['/pos'], {
        queryParams: { fecha: this.data.fecha }
      });
    }
  }

  cerrar() { this.dialogRef.close(); }
}
