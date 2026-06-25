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
    
    this.cargarDatosDelMes(this.viewDate());
  }

  // Función asíncrona para cargar el calendario
async cargarDatosDelMes(fecha: Date) {
    const inicio = startOfMonth(fecha);
    const fin = endOfMonth(fecha);

    const { data, error } = await this.supabase.obtenerVentasDelMes(inicio, fin);

    if (error) {
      console.error('Error al traer las ventas:', error.message);
      return;
    }

    const nuevoMapa: Record<string, DiaResumen> = {};
    
    // VARIABLES PARA LAS TARJETAS (KPIS)
    let ingresosMes = 0;
    let deudaMes = 0;
    const conteoProductos: Record<string, number> = {};

    data?.forEach((venta: any) => {
      const fechaVenta = format(new Date(venta.fecha), 'yyyy-MM-dd');

      if (!nuevoMapa[fechaVenta]) {
        nuevoMapa[fechaVenta] = { estado: 'perfect', pagado: 0, deuda: 0, iconos: [] };
      }

      // 1. Cálculos de dinero
      const pagado = Number(venta.valor_pagado || 0);
      const total = Number(venta.precio_total || 0);
      const deuda = Math.max(0, total - pagado);

      // Sumamos para el cuadrito del día
      nuevoMapa[fechaVenta].pagado += pagado;
      nuevoMapa[fechaVenta].deuda += deuda;

      // Sumamos para las tarjetas generales del mes
      ingresosMes += pagado;
      deudaMes += deuda;

      // 2. Estado (Rojo o Verde)
      const estadoReal = String(venta.estado).trim().toLowerCase();
      if (estadoReal === 'pendiente') {
        nuevoMapa[fechaVenta].estado = 'alert';
      }

      // 3. Íconos y Producto Estrella
      const icono = (venta.producto as any)?.icono;
      const nombre = (venta.producto as any)?.nombre || 'Desconocido';
      
      if (icono && !nuevoMapa[fechaVenta].iconos.includes(icono)) {
        nuevoMapa[fechaVenta].iconos.push(icono);
      }
      
      conteoProductos[nombre] = (conteoProductos[nombre] || 0) + 1;
    });

    this.heatMap.set(nuevoMapa);

    // 4. Calculamos cuál es el producto que más se repitió (Estrella)
    const llaves = Object.keys(conteoProductos);
    const estrella = llaves.length > 0
      ? llaves.reduce((a, b) => conteoProductos[a] > conteoProductos[b] ? a : b)
      : 'Sin ventas';

    // 5. Actualizamos las tarjetas de arriba
    this.kpis.set({
      ingresos: ingresosMes,
      deuda: deudaMes,
      productoEstrella: estrella
    });
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


}
