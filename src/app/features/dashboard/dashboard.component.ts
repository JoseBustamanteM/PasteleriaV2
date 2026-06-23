import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
// Importamos funciones útiles para calcular los meses
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { SupabaseService } from '../../core/services/supabase.service'; // <-- Importamos tu servicio

import {
  CalendarMonthViewComponent,
  CalendarPreviousViewDirective,
  CalendarNextViewDirective
} from 'angular-calendar';
import { DiaDetalleComponent } from '../../shared/components/dia-detalle/dia-detalle.component';
import { CuentasCobrarComponent } from '../../shared/components/cuentas-cobrar/cuentas-cobrar.component';
import { Router } from '@angular/router';

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
  private supabase = inject(SupabaseService); // Inyectamos Supabase
  private router = inject(Router);

  viewDate = signal<Date>(new Date());

  // El mapa ahora empieza vacío
  heatMap = signal<Record<string, 'perfect' | 'alert'>>({});

  // Al iniciar el componente, cargamos los datos del mes actual
  ngOnInit() {

    // this.cargarDatosDelMes(this.viewDate());
    this.inicializarDashboard()
  }

  private async inicializarDashboard() {
  await this.cargarKPIs();
  this.cargarDatosDelMes(this.viewDate());
}



  // Función asíncrona que va a Supabase
async cargarDatosDelMes(fecha: Date) {
    const inicio = startOfMonth(fecha);
    const fin = endOfMonth(fecha);

    const { data, error } = await this.supabase.obtenerVentasDelMes(inicio, fin);

    if (error) {
      console.error('Error al traer las ventas:', error.message);
      return;
    }

    const nuevoMapa: Record<string, 'perfect' | 'alert'> = {};

    data?.forEach(venta => {
      // <-- CORREGIDO: Usamos venta.fecha en lugar de venta.created_at
      const fechaVenta = format(new Date(venta.fecha), 'yyyy-MM-dd');

      if (nuevoMapa[fechaVenta] === 'alert') return;

      const estadoReal = String(venta.estado).trim().toLowerCase();

      if (estadoReal === 'pendiente') {
        nuevoMapa[fechaVenta] = 'alert';
      } else {
        nuevoMapa[fechaVenta] = 'perfect';
      }
    });

    this.heatMap.set(nuevoMapa);
  }

  // Interacción: Cuando navegamos entre meses
  cambiarMes(nuevaFecha: Date) {
    this.viewDate.set(nuevaFecha);
    this.cargarDatosDelMes(nuevaFecha); // Volvemos a consultar a la BD
  }

  getDayStatus(date: Date): string {
    const dateStr = format(date, 'yyyy-MM-dd');
    return this.heatMap()[dateStr] || 'inactive';
  }

dayClicked(date: Date): void {
    const dateStr = format(date, 'yyyy-MM-dd');
    const status = this.getDayStatus(date); // Puede ser 'perfect', 'alert' o 'inactive'

    // Ahora abrimos el modal SIEMPRE, sin importar si el día está vacío o es del futuro
    const dialogRef = this.dialog.open(DiaDetalleComponent, {
      width: '95%',
      maxWidth: '500px',
      data: { fecha: dateStr, estado: status }
    });

    // Escuchamos cuando el usuario cierra el modal para actualizar los colores
    dialogRef.afterClosed().subscribe(() => {
      this.cargarDatosDelMes(this.viewDate());
    });
  }

  // Importa el nuevo componente arriba del todo si no está:
  // import { CuentasCobrarComponent } from '../../shared/components/cuentas-cobrar/cuentas-cobrar.component';

  abrirCuentasPorCobrar() {
    const dialogRef = this.dialog.open(CuentasCobrarComponent, {
      width: '95%',
      maxWidth: '500px'
    });

    // Si cierras el modal (porque pagaste), recargamos los colores del calendario
    dialogRef.afterClosed().subscribe(() => {
      this.cargarDatosDelMes(this.viewDate());
    });
  }

  irAlHistorial() {
    this.router.navigate(['/historial']);
  }

  kpis = signal({ ingresos: 0, deuda: 0, productoEstrella: 'Cargando...' });

  async cargarKPIs() {
    const ahora = new Date();
    // const { data } = await this.supabase.obtenerResumenMes(ahora.getMonth() + 1, ahora.getFullYear());

    const { data, error } = await this.supabase.obtenerResumenMes(6, 2026);
    console.log("VENTAS ENCONTRADAS PARA JUNIO 2026:", data);

    console.log("Datos recibidos:", data);
    console.log("Error:", Error);

    if (data && data.length > 0) {
       let ingresos = 0;
      let deuda = 0;
      const conteoProductos: Record<string, number> = {};

      data.forEach(v => {
        ingresos += v.valor_pagado;
        deuda += (v.precio_total - v.valor_pagado);

        // Contar productos para el estrella
        // Forzamos la lectura con 'any' para evitar el error de tipo de TypeScript
        const nombre = (v.producto as any)?.nombre || 'Desconocido';
        conteoProductos[nombre] = (conteoProductos[nombre] || 0) + 1;
      });

      // Calcular estrella
      // Calcular estrella con seguridad
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
        console.warn("No hay ventas este mes o la consulta falló.");
        // Opcional: setea valores en 0 para que no quede en blanco
        this.kpis.set({ ingresos: 0, deuda: 0, productoEstrella: 'Sin datos' });
    }


  }

}
