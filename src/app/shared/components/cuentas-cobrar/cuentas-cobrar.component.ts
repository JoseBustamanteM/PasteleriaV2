import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { SupabaseService } from '../../../core/services/supabase.service';

interface DeudaCliente {
  clienteNombre: string;
  totalDeuda: number;
  ventas: any[];
  expandido: boolean;
  metodo_pago_grupo: string | null;
}

@Component({
  selector: 'app-cuentas-cobrar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cuentas-cobrar.component.html'
})
export class CuentasCobrarComponent implements OnInit {
  private supabase = inject(SupabaseService);
  private dialogRef = inject(MatDialogRef<CuentasCobrarComponent>);

  cargando = signal<boolean>(true);
  guardando = signal<boolean>(false);
  deudas = signal<DeudaCliente[]>([]);
  totalGlobal = signal<number>(0);
  metodosPago = signal<any[]>([]);

  ngOnInit() {
    this.cargarDatos();
  }

  async cargarDatos() {
    this.cargando.set(true);
    const [deudasRes, metodosRes] = await Promise.all([
      this.supabase.obtenerDeudasGlobales(),
      this.supabase.obtenerMetodosPago()
    ]);

    if (metodosRes.data) this.metodosPago.set(metodosRes.data);
    if (deudasRes.data) this.agruparDeudas(deudasRes.data);
    this.cargando.set(false);
  }

  agruparDeudas(ventasRaw: any[]) {
    const mapa = new Map<string, DeudaCliente>();
    let global = 0;
    const metodoDefaultId = this.metodosPago().length > 0 ? this.metodosPago()[0].id : null;

    ventasRaw.forEach(venta => {
      const deudaVenta = venta.precio_total - venta.valor_pagado;
      if (deudaVenta <= 0) return;

      const clienteNombre = venta.cliente?.nombre_completo || 'Cliente General / Anónimo';
      venta.metodo_pago_seleccionado = metodoDefaultId;

      if (!mapa.has(clienteNombre)) {
        mapa.set(clienteNombre, {
          clienteNombre,
          totalDeuda: 0,
          ventas: [],
          expandido: false,
          metodo_pago_grupo: metodoDefaultId
        });
      }

      const grupo = mapa.get(clienteNombre)!;
      grupo.totalDeuda += deudaVenta;
      grupo.ventas.push(venta);
      global += deudaVenta;
    });

    const arreglo = Array.from(mapa.values()).sort((a, b) => b.totalDeuda - a.totalDeuda);
    this.deudas.set(arreglo);
    this.totalGlobal.set(global);
  }

  async saldarVenta(venta: any) {
    this.guardando.set(true);
    await this.supabase.actualizarVenta(venta.id, {
      valor_pagado: venta.precio_total,
      estado: 'Pagado',
      metodo_pago_id: venta.metodo_pago_seleccionado
    });
    await this.cargarDatos();
    this.guardando.set(false);
  }

  async saldarTodas(grupo: DeudaCliente, event: Event) {
    event.stopPropagation();
    if (confirm(`¿Saldar todo con ${this.getMetodoNombre(grupo.metodo_pago_grupo)}?`)) {
      this.guardando.set(true);
      const promesas = grupo.ventas.map(venta =>
        this.supabase.actualizarVenta(venta.id, {
          valor_pagado: venta.precio_total,
          estado: 'Pagado',
          metodo_pago_id: grupo.metodo_pago_grupo
        })
      );
      await Promise.all(promesas);
      await this.cargarDatos();
      this.guardando.set(false);
    }
  }

  getMetodoNombre(id: string | null) {
    return this.metodosPago().find(m => m.id === id)?.nombre || 'el método seleccionado';
  }

  cerrar() { this.dialogRef.close(); }
}
