import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { format } from 'date-fns';
import { ActivatedRoute, Router } from '@angular/router';
import { SupabaseService } from '../../core/services/supabase.service';

interface ProductoPOS { id: string; nombre: string; precio_base: number; icono: string; }

@Component({
  selector: 'app-pos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pos.component.html',
  host: { 'class': 'block h-full w-full bg-gray-50' }
})
export class PosComponent implements OnInit {
  private supabase = inject(SupabaseService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  totalVendido = computed(() => this.ventasDelProducto().reduce((acc, v) => acc + v.cantidad, 0));

  totalEntregado = computed(() => this.ventasDelProducto().reduce((acc, v) => acc + (v.entregado ? v.cantidad : 0), 0));

  totalDineroVendido = computed(() => this.ventasDelProducto().reduce((acc, v) => acc + (v.precio_total || 0), 0));

  totalDeuda = computed(() => this.ventasDelProducto().reduce((acc, v) => acc + Math.max(0, (v.precio_total || 0) - (v.valor_pagado || 0)), 0));

  paso = signal<'fecha' | 'catalogo' | 'lista-producto' | 'venta'>('fecha');
  fechaSeleccionada = signal<string>(format(new Date(), 'yyyy-MM-dd'));
  productoSeleccionado = signal<ProductoPOS | null>(null);
  vieneDeDashboard = signal<boolean>(false);

  productos = signal<ProductoPOS[]>([]);
  metodosPago = signal<any[]>([]);
  clientes = signal<any[]>([]);
  cargando = signal<boolean>(true);

  ventasDelProducto = signal<any[]>([]);
  cargandoVentas = signal<boolean>(false);

  // Formulario Venta
  editandoId = signal<string | null>(null);
  formCantidad = signal<number>(1);
  formPrecioTotal = signal<number>(0);
  formValorPagado = signal<number>(0);
  formMetodoPagoId = signal<string>('');
  formClienteId = signal<string>('');
  formEntregado = signal<boolean>(false);
  guardando = signal<boolean>(false);

  // NUEVO: Mini-formulario Cliente
  creandoCliente = signal<boolean>(false);
  nuevoClienteNombre = signal<string>('');
  guardandoCliente = signal<boolean>(false);

  async ngOnInit() {
    const params = this.route.snapshot.queryParams;



    if (params['fecha']) {
      this.fechaSeleccionada.set(params['fecha']);
      this.vieneDeDashboard.set(true);
      this.paso.set('catalogo');
    }

    const [prodRes, metodosRes, clientesRes] = await Promise.all([
      this.supabase.obtenerProductosActivos(),
      this.supabase.obtenerMetodosPago(),
      this.supabase.obtenerClientes()
    ]);

    if (prodRes.data) this.productos.set(prodRes.data);
    if (metodosRes.data && metodosRes.data.length > 0) {
      this.metodosPago.set(metodosRes.data);
      this.formMetodoPagoId.set(metodosRes.data[0].id);
    }
    if (clientesRes.data) this.clientes.set(clientesRes.data);

    this.cargando.set(false);

    if (params['fecha'] && params['producto']) {
      const prodEncontrado = this.productos().find(p => p.id === params['producto']);
      if (prodEncontrado) await this.irAListaProducto(prodEncontrado);
    }

    // ... dentro del subscribe de los params en ngOnInit:
    if (params['editar']) {
      this.cargando.set(true);
      const { data, error } = await this.supabase.obtenerVentaPorId(params['editar']);

      if (data && !error) {
        // 1. Cargamos el producto para que la interfaz sepa cuál estamos editando
        const producto = this.productos().find(p => p.id === data.producto_id);
        if (producto) {
            this.productoSeleccionado.set(producto);
            // 2. Usamos nuestra función editarVenta existente para rellenar todo
            this.editarVenta(data);
            // 3. Forzamos el paso a 'venta'
            this.paso.set('venta');
        }
      }
      this.cargando.set(false);
    }
  }

  irACatalogo() { if (this.fechaSeleccionada()) this.paso.set('catalogo'); }

  volverDesdeCatalogo() {
    if (this.vieneDeDashboard()) this.router.navigate(['/dashboard']);
    else this.paso.set('fecha');
  }

  volver(pasoAnterior: 'fecha' | 'catalogo' | 'lista-producto') {
    this.paso.set(pasoAnterior);
  }

  async irAListaProducto(producto: ProductoPOS) {
    this.productoSeleccionado.set(producto);
    this.paso.set('lista-producto');
    await this.cargarVentasDelProducto();
  }

  async cargarVentasDelProducto() {
    this.cargandoVentas.set(true);
    const { data, error } = await this.supabase.obtenerVentasPorProductoYDia(
      this.productoSeleccionado()!.id,
      this.fechaSeleccionada()
    );
    if (!error && data) this.ventasDelProducto.set(data);
    this.cargandoVentas.set(false);
  }

  irAVenta() {
    this.editandoId.set(null);
    this.formCantidad.set(1);
    this.formPrecioTotal.set(this.productoSeleccionado()!.precio_base);
    this.formValorPagado.set(0);
    this.formClienteId.set('');
    this.formEntregado.set(false);
    this.creandoCliente.set(false); // Cerramos el mini form si estaba abierto
    this.nuevoClienteNombre.set('');
    if (this.metodosPago().length > 0) this.formMetodoPagoId.set(this.metodosPago()[0].id);
    this.paso.set('venta');
  }

  editarVenta(venta: any) {
    this.editandoId.set(venta.id);
    this.formCantidad.set(venta.cantidad);
    this.formPrecioTotal.set(venta.precio_total);
    this.formValorPagado.set(venta.valor_pagado);
    this.formClienteId.set(venta.cliente_id || '');
    this.formMetodoPagoId.set(venta.metodo_pago_id || '');
    this.formEntregado.set(venta.entregado);
    this.creandoCliente.set(false);
    this.paso.set('venta');
  }

  async eliminarVenta(venta: any) {
    if (confirm('¿Estás seguro de eliminar esta venta permanentemente?')) {
      await this.supabase.eliminarVenta(venta.id);
      await this.cargarVentasDelProducto();
    }
  }

  cambiarCantidad(delta: number) {
    const nuevaCantidad = Math.max(1, this.formCantidad() + delta);
    this.formCantidad.set(nuevaCantidad);
    const nuevoTotal = nuevaCantidad * this.productoSeleccionado()!.precio_base;
    this.formPrecioTotal.set(nuevoTotal);
    if (!this.editandoId()) {
      this.formValorPagado.set(nuevoTotal);
    }
  }

  // --- NUEVO: GUARDAR CLIENTE RÁPIDO ---
  async guardarNuevoCliente() {
    const nombre = this.nuevoClienteNombre().trim();
    if (!nombre) return;

    this.guardandoCliente.set(true);
    const { data, error } = await this.supabase.crearClienteRapido(nombre);

    if (error) {
      alert('Error al crear cliente: ' + error.message);
      this.guardandoCliente.set(false);
    } else if (data) {
      // Recargamos la lista silenciosamente para que se ordene alfabéticamente
      const clientesRes = await this.supabase.obtenerClientes();
      if (clientesRes.data) this.clientes.set(clientesRes.data);

      // Lo auto-seleccionamos en el formulario
      this.formClienteId.set(data.id);

      // Cerramos el mini-formulario
      this.nuevoClienteNombre.set('');
      this.creandoCliente.set(false);
      this.guardandoCliente.set(false);
    }
  }

async confirmarVenta() {
    this.guardando.set(true);
    const total = this.formPrecioTotal();
    const pagado = this.formValorPagado();
    const estado = pagado < total ? 'Pendiente' : 'Pagado';

    // 1. Obtenemos la fecha elegida ("2026-04-27")
    const fechaElegida = this.fechaSeleccionada();
    const [year, month, day] = fechaElegida.split('-').map(Number);

    // 2. Creamos la fecha anclada exactamente a las 12:00 PM (Mediodía) HORA LOCAL
    // Esto crea un margen de seguridad perfecto contra los desfases horarios (UTC).
    const fechaLocalSegura = new Date(year, month - 1, day, 12, 0, 0);

    // 3. Supabase lo guarda como UTC, pero al anclarlo a las 12, jamás retrocederá un día entero.
    const payload = {
      fecha: fechaLocalSegura.toISOString(),
      producto_id: this.productoSeleccionado()!.id,
      cliente_id: this.formClienteId() || null,
      metodo_pago_id: this.formMetodoPagoId(),
      cantidad: this.formCantidad(),
      precio_total: total,
      valor_pagado: pagado,
      estado: estado,
      entregado: this.formEntregado()
    };

    let error;
    if (this.editandoId()) {
      const res = await this.supabase.actualizarVenta(this.editandoId()!, payload);
      error = res.error;
    } else {
      const res = await this.supabase.registrarVenta(payload);
      error = res.error;
    }

    this.guardando.set(false);

    if (error) {
      alert('Error: ' + error.message);
    } else {
      await this.cargarVentasDelProducto();
      this.volver('lista-producto');
    }
  }

  // --- FUNCIONES PARA LOS CHECKBOXES RÁPIDOS ---

  async marcarComoEntregado(venta: any, entregado: boolean) {
    // Actualización visual instantánea
    const ventas = this.ventasDelProducto();
    const index = ventas.findIndex(v => v.id === venta.id);
    if (index !== -1) {
      ventas[index].entregado = entregado;
      this.ventasDelProducto.set([...ventas]);
    }

    // Guardado en base de datos
    const { error } = await this.supabase.actualizarVenta(venta.id, { entregado });
    if (error) {
      alert('Error al actualizar entrega: ' + error.message);
      await this.cargarVentasDelProducto(); // Revertimos si hay error
    }
  }

  async marcarComoPagado(venta: any, pagadoCompleto: boolean) {
    const ventas = this.ventasDelProducto();
    const index = ventas.findIndex(v => v.id === venta.id);

    // Si se marca como pagado, el valor pagado es igual al total. Si se desmarca, vuelve a 0.
    const nuevoValorPagado = pagadoCompleto ? venta.precio_total : 0;
    const nuevoEstado = pagadoCompleto ? 'Pagado' : 'Pendiente';

    if (index !== -1) {
      ventas[index].valor_pagado = nuevoValorPagado;
      ventas[index].estado = nuevoEstado;
      this.ventasDelProducto.set([...ventas]);
    }

    const { error } = await this.supabase.actualizarVenta(venta.id, {
      valor_pagado: nuevoValorPagado,
      estado: nuevoEstado
    });

    if (error) {
      alert('Error al actualizar pago: ' + error.message);
      await this.cargarVentasDelProducto();
    }
  }
}
