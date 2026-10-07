import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { differenceInCalendarDays } from 'date-fns';
import { SupabaseService } from '../../../core/services/supabase.service';

interface PedidoDeuda {
  id: string;
  fecha: Date;
  cantidad: number;
  precio_total: number;
  deuda: number;
  producto: { nombre: string; icono: string } | null;
}

interface GrupoDeuda {
  clave: string;            // ID del cliente, o "v:<idVenta>" para ventas sin cliente
  clienteNombre: string;
  sinCliente: boolean;
  totalDeuda: number;
  fechaMasAntigua: Date;
  pedidos: PedidoDeuda[];
}

@Component({
  selector: 'app-cuentas-cobrar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cuentas-cobrar.component.html'
})
export class CuentasCobrarComponent implements OnInit {
  private supabase = inject(SupabaseService);
  private dialogRef = inject(MatDialogRef<CuentasCobrarComponent>);
  private router = inject(Router);

  cargando = signal<boolean>(true);
  guardando = signal<boolean>(false);
  grupos = signal<GrupoDeuda[]>([]);
  metodosPago = signal<any[]>([]);

  orden = signal<'monto' | 'antigua'>('monto');

  // Tarjetas abiertas (detalle de pedidos) y la fila que está mostrando los métodos de pago.
  // cobrandoClave: "g:<clave>" para cobrar todo un cliente, "v:<idVenta>" para un solo pedido.
  expandidos = signal<Set<string>>(new Set());
  cobrandoClave = signal<string | null>(null);

  private ordenar = (a: GrupoDeuda, b: GrupoDeuda) =>
    this.orden() === 'monto'
      ? b.totalDeuda - a.totalDeuda
      : a.fechaMasAntigua.getTime() - b.fechaMasAntigua.getTime();

  gruposConCliente = computed(() => this.grupos().filter(g => !g.sinCliente).sort(this.ordenar));
  gruposSinCliente = computed(() => this.grupos().filter(g => g.sinCliente).sort(this.ordenar));

  totalGlobal = computed(() => this.grupos().reduce((acc, g) => acc + g.totalDeuda, 0));
  totalPedidos = computed(() => this.grupos().reduce((acc, g) => acc + g.pedidos.length, 0));

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
    if (deudasRes.error) console.error('Error al cargar deudas:', deudasRes.error);
    if (deudasRes.data) this.agruparDeudas(deudasRes.data);
    this.cargando.set(false);
  }

  agruparDeudas(ventasRaw: any[]) {
    const mapa = new Map<string, GrupoDeuda>();

    ventasRaw.forEach(venta => {
      const deuda = (Number(venta.precio_total) || 0) - (Number(venta.valor_pagado) || 0);
      if (deuda <= 0) return;

      // Agrupamos por ID de cliente; cada venta sin cliente va por separado
      const clienteId = venta.cliente?.id;
      const clave = clienteId ?? 'v:' + venta.id;
      const pedido: PedidoDeuda = {
        id: venta.id,
        fecha: new Date(venta.fecha),
        cantidad: venta.cantidad,
        precio_total: venta.precio_total,
        deuda,
        producto: venta.producto
      };

      if (!mapa.has(clave)) {
        mapa.set(clave, {
          clave,
          clienteNombre: venta.cliente?.nombre_completo || 'Sin cliente',
          sinCliente: !clienteId,
          totalDeuda: 0,
          fechaMasAntigua: pedido.fecha,
          pedidos: []
        });
      }

      const grupo = mapa.get(clave)!;
      grupo.totalDeuda += deuda;
      grupo.pedidos.push(pedido);
      if (pedido.fecha < grupo.fechaMasAntigua) grupo.fechaMasAntigua = pedido.fecha;
    });

    // Pedidos de cada cliente: el más antiguo primero
    mapa.forEach(g => g.pedidos.sort((a, b) => a.fecha.getTime() - b.fecha.getTime()));
    this.grupos.set(Array.from(mapa.values()));
  }

  // --- DETALLE Y COBRO ---

  estaExpandido(clave: string) {
    return this.expandidos().has(clave);
  }

  alternarDetalle(clave: string) {
    const nuevos = new Set(this.expandidos());
    if (nuevos.has(clave)) nuevos.delete(clave);
    else nuevos.add(clave);
    this.expandidos.set(nuevos);
  }

  abrirCobro(clave: string) {
    this.cobrandoClave.set(clave);
  }

  cerrarCobro() {
    this.cobrandoClave.set(null);
  }

  // Salda por completo todos los pedidos de un cliente con el método elegido
  async cobrarGrupo(grupo: GrupoDeuda, metodoId: string) {
    await this.saldar(grupo.pedidos, metodoId);
  }

  // Salda un solo pedido con el método elegido
  async cobrarPedido(pedido: PedidoDeuda, metodoId: string) {
    await this.saldar([pedido], metodoId);
  }

  private async saldar(pedidos: PedidoDeuda[], metodoId: string) {
    this.guardando.set(true);
    const resultados = await Promise.all(pedidos.map(p =>
      this.supabase.actualizarVenta(p.id, {
        valor_pagado: p.precio_total,
        estado: 'Pagado',
        metodo_pago_id: metodoId
      })
    ));
    const error = resultados.find(r => r.error)?.error;
    if (error) alert('Error al registrar el cobro: ' + error.message);

    this.cerrarCobro();
    await this.cargarDatos();
    this.guardando.set(false);
  }

  // Para abonos parciales: abrimos la venta en el POS
  editarPedido(pedido: PedidoDeuda) {
    this.dialogRef.close();
    this.router.navigate(['/pos'], { queryParams: { editar: pedido.id } });
  }

  // --- AYUDAS DE PRESENTACIÓN ---

  iniciales(nombre: string): string {
    return nombre.trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase();
  }

  diasDesde(fecha: Date): number {
    return Math.max(0, differenceInCalendarDays(new Date(), fecha));
  }

  textoAntiguedad(fecha: Date): string {
    const dias = this.diasDesde(fecha);
    if (dias === 0) return 'hoy';
    if (dias === 1) return 'ayer';
    return `hace ${dias} días`;
  }

  // Más de 7 días: ámbar. Más de 30: frambuesa.
  claseAntiguedad(fecha: Date): string {
    const dias = this.diasDesde(fecha);
    if (dias > 30) return 'bg-frambuesa-100 text-frambuesa-700';
    if (dias > 7) return 'bg-amber-100 text-amber-800';
    return 'bg-cacao-100 text-cacao-600';
  }

  cerrar() { this.dialogRef.close(); }
}
