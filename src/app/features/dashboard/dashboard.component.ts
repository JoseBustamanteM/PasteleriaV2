import { Component, signal, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths
} from 'date-fns';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { SupabaseService } from '../../core/services/supabase.service';
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

interface CeldaCalendario {
  fecha: Date;
  numero: number;
  enMes: boolean;
  hoy: boolean;
  estado: DiaResumen['estado'];
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MatDialogModule],
  templateUrl: './dashboard.component.html',
  host: { 'class': 'block' }
})
export class DashboardComponent implements OnInit {
  private dialog = inject(MatDialog);
  private supabase = inject(SupabaseService);
  private router = inject(Router);

  viewDate = signal<Date>(new Date());

  // El mapa ahora guarda objetos con todo el detalle financiero y visual
  heatMap = signal<Record<string, DiaResumen>>({});

  kpis = signal({ ingresos: 0, deuda: 0, productoEstrella: 'Cargando...', iconoEstrella: '🍰', unidadesEstrella: 0 });

  diasSemana = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

  saludo = (() => {
    const hora = new Date().getHours();
    if (hora < 12) return 'Buenos días';
    if (hora < 20) return 'Buenas tardes';
    return 'Buenas noches';
  })();

  // Celdas del calendario: semanas completas de lunes a domingo
  celdas = computed<CeldaCalendario[]>(() => {
    const mes = this.viewDate();
    const mapa = this.heatMap();
    return eachDayOfInterval({
      start: startOfWeek(startOfMonth(mes), { weekStartsOn: 1 }),
      end: endOfWeek(endOfMonth(mes), { weekStartsOn: 1 })
    }).map(fecha => ({
      fecha,
      numero: fecha.getDate(),
      enMes: isSameMonth(fecha, mes),
      hoy: isToday(fecha),
      estado: mapa[format(fecha, 'yyyy-MM-dd')]?.estado || 'inactive'
    }));
  });

  ngOnInit() {
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
    const conteoProductos: Record<string, { veces: number; icono: string }> = {};

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

      if (!conteoProductos[nombre]) conteoProductos[nombre] = { veces: 0, icono: icono || '🍰' };
      conteoProductos[nombre].veces += 1;
    });

    this.heatMap.set(nuevoMapa);

    // 4. Calculamos cuál es el producto que más se repitió (Estrella)
    const llaves = Object.keys(conteoProductos);
    const estrella = llaves.length > 0
      ? llaves.reduce((a, b) => conteoProductos[a].veces > conteoProductos[b].veces ? a : b)
      : null;

    // 5. Actualizamos las tarjetas de arriba
    this.kpis.set({
      ingresos: ingresosMes,
      deuda: deudaMes,
     
      productoEstrella: estrella ?? 'Sin ventas aún',
      iconoEstrella: estrella ? conteoProductos[estrella].icono : '🍰',
      unidadesEstrella: estrella ? conteoProductos[estrella].veces : 0
    });
  }

  cambiarMes(delta: number) {
    const nuevaFecha = delta > 0 ? addMonths(this.viewDate(), 1) : subMonths(this.viewDate(), 1);
    this.viewDate.set(nuevaFecha);
    this.cargarDatosDelMes(nuevaFecha);
  }

  getDayStatus(date: Date): string {
    const dateStr = format(date, 'yyyy-MM-dd');
    return this.heatMap()[dateStr]?.estado || 'inactive';
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
      panelClass: 'dialog-completo',
      maxWidth: '500px'
    });

    dialogRef.afterClosed().subscribe(() => {
      this.cargarDatosDelMes(this.viewDate());
    });
  }

  irAlHistorial() {
    this.router.navigate(['/historial']);
  }

  // Método para el botón de cerrar sesión del encabezado
  async logout() {
    try {
      await this.supabase.logout();
      this.router.navigate(['/auth']);
    } catch (error) {
      console.error('Error cerrando sesión:', error);
    }
  }
}
