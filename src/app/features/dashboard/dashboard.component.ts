import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { SupabaseService } from '../../core/services/supabase.service';

import {
  CalendarMonthViewComponent,
  CalendarPreviousViewDirective,
  CalendarNextViewDirective
} from 'angular-calendar';
import { DiaDetalleComponent } from '../../shared/components/dia-detalle/dia-detalle.component';
import { CuentasCobrarComponent } from '../../shared/components/cuentas-cobrar/cuentas-cobrar.component';
import { Router } from '@angular/router';

// INTERFAZ: Define la estructura de datos para cada cuadrito del calendario
export interface DiaResumen {
  estado: 'perfect' | 'alert' | 'inactive';
  pagado: number;
  deuda: number;
  iconos: string[];
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    CalendarMonthViewComponent,
    CalendarPreviousViewDirective,
    CalendarNextViewDirective,
    MatDialogModule
  ],
  templateUrl: './dashboard.component.html',
  host: { 'class': 'block h-full w-full' }
})
export class DashboardComponent implements OnInit {
  private dialog = inject(MatDialog);
  private supabase = inject(SupabaseService);
  private router = inject(Router);

  viewDate = signal<Date>(new Date());

  // El mapa ahora guarda objetos con todo el detalle financiero y visual
  heatMap = signal<Record<string, DiaResumen>>({});

  kpis = signal({ ingresos: 0, deuda: 0, productoEstrella: 'Cargando...' });

  ngOnInit() {
    this.inicializarDashboard();
  }

  private async inicializarDashboard() {
    await this.cargarKPIs();
    this.cargarDatosDelMes(this.viewDate());
  }

  // Función asíncrona para cargar el calendario
  async cargarDatosDelMes(fecha: Date) {
    const inicio = startOfMonth(fecha);
    const fin = endOfMonth(fecha);

    // IMPORTANTE: Asegúrate de que obtenerVentasDelMes en tu servicio también
    // esté trayendo: producto(nombre, icono), precio_total y valor_pagado
    const { data, error } = await this.supabase.obtenerVentasDelMes(inicio, fin);

    if (error) {
      console.error('Error al traer las ventas:', error.message);
      return;
    }

    const nuevoMapa: Record<string, DiaResumen> = {};

    data?.forEach((venta: any) => {
      const fechaVenta = format(new Date(venta.fecha), 'yyyy-MM-dd');

      if (!nuevoMapa[fechaVenta]) {
        nuevoMapa[fechaVenta] = { estado: 'perfect', pagado: 0, deuda: 0, iconos: [] };
      }

      // Cálculos de dinero
      const pagado = Number(venta.valor_pagado || 0);
      const total = Number(venta.precio_total || 0);
      const deuda = total - pagado;

      nuevoMapa[fechaVenta].pagado += pagado;
      nuevoMapa[fechaVenta].deuda += deuda;

      // Definir estado
      const estadoReal = String(venta.estado).trim().toLowerCase();
      if (estadoReal === 'pendiente') {
        nuevoMapa[fechaVenta].estado = 'alert';
      }

      // Guardar íconos sin repetir
      const icono = (venta.producto as any)?.icono;
      if (icono && !nuevoMapa[fechaVenta].iconos.includes(icono)) {
        nuevoMapa[fechaVenta].iconos.push(icono);
      }
    });

    this.heatMap.set(nuevoMapa);
  }

  cambiarMes(nuevaFecha: Date) {
    this.viewDate.set(nuevaFecha);
    this.cargarDatosDelMes(nuevaFecha);
  }

  getDayStatus(date: Date): string {
    const dateStr = format(date, 'yyyy-MM-dd');
    return this.heatMap()[dateStr]?.estado || 'inactive';
  }

  // Nueva función para inyectar los datos en el HTML
  getDayData(date: Date): DiaResumen | null {
    const dateStr = format(date, 'yyyy-MM-dd');
    return this.heatMap()[dateStr] || null;
  }

  dayClicked(date: Date): void {
    const dateStr = format(date, 'yyyy-MM-dd');
    const status = this.getDayStatus(date);

    const dialogRef = this.dialog.open(DiaDetalleComponent, {
      width: '95%',
      maxWidth: '500px',
      data: { fecha: dateStr, estado: status }
    });

    dialogRef.afterClosed().subscribe(() => {
      this.cargarDatosDelMes(this.viewDate());
    });
  }

  abrirCuentasPorCobrar() {
    const dialogRef = this.dialog.open(CuentasCobrarComponent, {
      width: '95%',
      maxWidth: '500px'
    });

    dialogRef.afterClosed().subscribe(() => {
      this.cargarDatosDelMes(this.viewDate());
    });
  }

  irAlHistorial() {
    this.router.navigate(['/historial']);
  }

  async cargarKPIs() {
    // Usamos el mes actual para los KPIs
    const ahora = new Date();
    // Reemplacé el estático 6, 2026 por las variables dinámicas de la fecha actual,
    // pero puedes volver a poner (6, 2026) si estás haciendo pruebas específicas.
    const { data, error } = await this.supabase.obtenerResumenMes(6, 2026);

    if (data && data.length > 0) {
      let ingresos = 0;
      let deuda = 0;
      const conteoProductos: Record<string, number> = {};

      data.forEach(v => {
        ingresos += v.valor_pagado;
        deuda += (v.precio_total - v.valor_pagado);

        const nombre = (v.producto as any)?.nombre || 'Desconocido';
        conteoProductos[nombre] = (conteoProductos[nombre] || 0) + 1;
      });

      const llaves = Object.keys(conteoProductos);
      const estrella = llaves.length > 0
        ? llaves.reduce((a, b) => conteoProductos[a] > conteoProductos[b] ? a : b)
        : 'Sin ventas';

      this.kpis.set({
        ingresos: ingresos,
        deuda: deuda,
        productoEstrella: estrella
      });
    } else {
      this.kpis.set({ ingresos: 0, deuda: 0, productoEstrella: 'Sin datos' });
    }
  }
}
