import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // Vital para los inputs de fecha
import { SupabaseService } from '../../core/services/supabase.service';
import { startOfMonth, endOfMonth, addMonths, subMonths, format } from 'date-fns';

@Component({
  selector: 'app-historial',
  standalone: true,
  imports: [CommonModule, FormsModule], // Agregamos FormsModule aquí
  templateUrl: './historial-ventas.component.html',
  host: { 'class': 'block h-full w-full bg-gray-50' }
})
export class HistorialVentasComponent implements OnInit {
  private supabase = inject(SupabaseService);

  // Estado principal
  cargando = signal<boolean>(true);

  // Filtros
  modoFiltro = signal<'mes' | 'semestre' | 'rango'>('mes');
  fechaReferencia = signal<Date>(new Date());
  rangoInicio = signal<string>(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  rangoFin = signal<string>(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  // Datos crudos desde Supabase
  ventas = signal<any[]>([]);
  compras = signal<any[]>([]);
  activos = signal<any[]>([]);

  // --- MATEMÁTICA FINANCIERA (Se calcula sola) ---

  // 1. Ingresos y Deudas
  ingresosReales = computed(() => this.ventas().reduce((acc, v) => acc + (Number(v.valor_pagado) || 0), 0));
  dineroEnCalle = computed(() => this.ventas().reduce((acc, v) => acc + Math.max(0, (Number(v.precio_total) || 0) - (Number(v.valor_pagado) || 0)), 0));

  // 2. Gastos (Insumos vs Activos)
  gastosInsumos = computed(() => this.compras().reduce((acc, c) => acc + (Number(c.total_pagado) || 0), 0));
  gastosActivos = computed(() => this.activos().reduce((acc, a) => acc + (Number(a.valor) || 0), 0));
  egresosTotales = computed(() => this.gastosInsumos() + this.gastosActivos());

  // 3. El Balance Final
  utilidadNeta = computed(() => this.ingresosReales() - this.egresosTotales());

  // 4. Mini-Historial (Últimos 15 movimientos)
  ultimosMovimientos = computed(() => {
    const v = this.ventas().map(x => ({
      tipo: 'ingreso',
      fecha: x.fecha,
      monto: x.valor_pagado,
      titulo: 'Venta - ' + (x.producto?.nombre || 'Producto'),
      icono: x.producto?.icono || '💰'
    }));

    const c = this.compras().map(x => ({
      tipo: 'egreso',
      fecha: x.fecha,
      monto: x.total_pagado,
      titulo: 'Compra Insumos (' + (x.proveedor?.nombre || 'Varios') + ')',
      icono: '🛒'
    }));

    const a = this.activos().map(x => ({
      tipo: 'egreso',
      fecha: x.fecha_adquisicion,
      monto: x.valor,
      titulo: 'Inversión - ' + x.nombre,
      icono: '📦'
    }));

    const todos = [...v, ...c, ...a].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    return todos.slice(0, 15);
  });

  async ngOnInit() {
    await this.aplicarFiltros();
  }

  // --- LÓGICA DE FILTRADO ---
  cambiarModo(modo: 'mes' | 'semestre' | 'rango') {
    this.modoFiltro.set(modo);
    if (modo !== 'rango') {
      this.aplicarFiltros();
    }
  }

  cambiarMes(delta: number) {
    const nuevaFecha = delta > 0 ? addMonths(this.fechaReferencia(), 1) : subMonths(this.fechaReferencia(), 1);
    this.fechaReferencia.set(nuevaFecha);
    this.aplicarFiltros();
  }

  async aplicarFiltros() {
    let inicio: Date;
    let fin: Date;

    if (this.modoFiltro() === 'mes') {
      inicio = startOfMonth(this.fechaReferencia());
      fin = endOfMonth(this.fechaReferencia());
    } else if (this.modoFiltro() === 'semestre') {
      fin = new Date();
      inicio = subMonths(fin, 6);
    } else {
      inicio = new Date(this.rangoInicio() + 'T00:00:00');
      fin = new Date(this.rangoFin() + 'T23:59:59');
    }

    await this.cargarBalance(inicio, fin);
  }

  async cargarBalance(inicio: Date, fin: Date) {
    this.cargando.set(true);

    const { ventas, compras, activos, errores } = await this.supabase.obtenerBalanceFinanciero(inicio, fin);

    if (errores) console.error('Error cargando el balance', errores);

    this.ventas.set(ventas || []);
    this.compras.set(compras || []);
    this.activos.set(activos || []);

    this.cargando.set(false);
  }
}
