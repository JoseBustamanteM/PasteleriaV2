import { Injectable, signal } from '@angular/core';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;

  // Usamos Angular Signals para manejar el estado del usuario de forma reactiva
  public currentUser = signal<User | null>(null);

  constructor() {
    // Inicializa el cliente de Supabase
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey, {
      auth: {
        persistSession: true, // Esto asegura que la sesión se guarde automáticamente en el localStorage
        autoRefreshToken: true
      }
    });

    // Escucha los cambios en el estado de la autenticación (Login, Logout, Token renovado)
    this.supabase.auth.onAuthStateChange((event, session) => {
      this.currentUser.set(session?.user ?? null);
    });
  }

  // Expone el cliente de Supabase para consultas directas en los módulos
  get client(): SupabaseClient {
    return this.supabase;
  }

  // Obtener el usuario actual de forma síncrona
  get user() {
    return this.supabase.auth.getUser();
  }

  // Método para cerrar sesión y limpiar el almacenamiento local
  async logout(): Promise<void> {
    const { error } = await this.supabase.auth.signOut();
    if (error) {
      throw new Error(error.message);
    }
  }

  // ... código anterior ...

  // Nuevo método para traer las ventas de un rango de fechas
  // Obtener ventas del mes para el Dashboard
  async obtenerVentasDelMes(fechaInicio: Date, fechaFin: Date) {
    const inicioIso = fechaInicio.toISOString();
    const finIso = fechaFin.toISOString();

    return await this.client
      .from('venta')
      .select('fecha, estado') // <-- CORREGIDO: Ahora traemos 'fecha'
      .gte('fecha', inicioIso) // <-- CORREGIDO: Filtramos por 'fecha'
      .lte('fecha', finIso);   // <-- CORREGIDO: Filtramos por 'fecha'
  }

  // Nuevo método para traer el detalle de un solo día
async obtenerDetalleVentasDia(fechaStr: string) {
    const inicio = `${fechaStr}T00:00:00.000Z`;
    const fin = `${fechaStr}T23:59:59.999Z`;

    return await this.client
      .from('venta')
      .select(`
        id,
        cantidad,
        precio_total,
        valor_pagado,
        estado,
        producto_id,
        producto ( nombre, icono ),
        cliente ( nombre_completo )
      `)
      .gte('fecha', inicio)
      .lte('fecha', fin);
  }

  // Marcar una venta como totalmente pagada
  async pagarVenta(id: string, precioTotal: number) {
    return await this.client
      .from('venta')
      .update({ valor_pagado: precioTotal, estado: 'Pagado' })
      .eq('id', id);
  }

  // Eliminar/Cancelar una venta por completo
  async eliminarVenta(id: string) {
    return await this.client
      .from('venta')
      .delete()
      .eq('id', id);
  }
  // --- MÓDULO POS ---

  // Obtener catálogo de productos para la venta
  async obtenerProductosActivos() {
    return await this.client
      .from('producto')
      .select('id, nombre, precio_base, icono')
      .eq('estado', true)
      .order('nombre', { ascending: true });
  }

  // Obtener métodos de pago para el select
  async obtenerMetodosPago() {
    return await this.client.from('metodo_pago').select('id, nombre');
  }

  // Obtener clientes para el select
  async obtenerClientes() {
    return await this.client.from('cliente').select('id, nombre_completo').order('nombre_completo');
  }

  // Enviar la venta final a la base de datos
  async registrarVenta(ventaData: any) {
    return await this.client.from('venta').insert(ventaData);
  }

  // Obtener ventas de un producto específico en un día específico
  async obtenerVentasPorProductoYDia(productoId: string, fechaStr: string) {
    const inicio = `${fechaStr}T00:00:00.000Z`;
    const fin = `${fechaStr}T23:59:59.999Z`;

    return await this.client
      .from('venta')
      .select(`
        id, cantidad, precio_total, valor_pagado, estado,
        entregado, cliente_id, metodo_pago_id,
        cliente ( nombre_completo )
      `)
      .eq('producto_id', productoId)
      .gte('fecha', inicio)
      .lte('fecha', fin)
      .order('created_at', { ascending: false });
  }


  // Actualizar una venta existente
  async actualizarVenta(id: string, ventaData: any) {
    return await this.client
      .from('venta')
      .update(ventaData)
      .eq('id', id);
  }

  // --- CLIENTES ---

  // Crear un nuevo cliente rápidamente y devolver sus datos
  async crearClienteRapido(nombreCompleto: string) {
    return await this.client
      .from('cliente')
      .insert({ nombre_completo: nombreCompleto })
      .select('id, nombre_completo') // Le pedimos a Supabase que nos devuelva el ID creado
      .single();
  }

  // --- CUENTAS POR COBRAR ---

  // Obtener todas las deudas globales
  async obtenerDeudasGlobales() {
    return await this.client
      .from('venta')
      .select(`
        id, fecha, precio_total, valor_pagado, estado, producto_id,
        producto ( nombre, icono ),
        cliente ( id, nombre_completo )
      `)
      .eq('estado', 'Pendiente')
      .order('fecha', { ascending: false }); // Las más recientes primero
  }

  // Buscar ventas con filtros avanzados
async buscarVentas(filtros: {
    texto?: string,
    desde?: string,
    hasta?: string,
    estado?: string,
    cliente_id?: string,
    metodo_pago_id?: string,
    producto_id?: string
  }) {
    let query = this.client
      .from('venta')
      .select(`
        id, fecha, cantidad, precio_total, valor_pagado, estado, entregado,
        producto_id, cliente_id, metodo_pago_id,
        producto ( nombre, icono ),
        cliente ( nombre_completo )
      `)
      .order('fecha', { ascending: false });

    if (filtros.desde) query = query.gte('created_at', filtros.desde);
if (filtros.hasta) query = query.lte('created_at', filtros.hasta);
    if (filtros.estado) query = query.eq('estado', filtros.estado);
    if (filtros.cliente_id) query = query.eq('cliente_id', filtros.cliente_id);
    if (filtros.metodo_pago_id) query = query.eq('metodo_pago_id', filtros.metodo_pago_id);
    if (filtros.producto_id) query = query.eq('producto_id', filtros.producto_id);

    return await query;
  }

  // Buscar una sola venta por ID para editarla
  async obtenerVentaPorId(id: string) {
    return await this.client
      .from('venta')
      .select(`
        id, cantidad, precio_total, valor_pagado, estado, entregado,
        cliente_id, metodo_pago_id, producto_id, fecha
      `)
      .eq('id', id)
      .single();
  }

async obtenerResumenMes(mes: number, anio: number) {
  // Creamos el rango del primer día del mes al último día del mes
  const inicio = new Date(anio, mes - 1, 1).toISOString();
  const fin = new Date(anio, mes, 0, 23, 59, 59).toISOString();

  return await this.client
    .from('venta')
    .select(`precio_total, valor_pagado, estado, producto(nombre)`)
    .gte('fecha', inicio) // Filtra desde el 1ero
    .lte('fecha', fin);   // Hasta el último día
}

// --- GESTIÓN DE PRODUCTOS (CRUD) ---

  // Obtener TODOS los productos (activos e inactivos para el CRUD)
  async obtenerTodosLosProductos() {
    return await this.client
      .from('producto')
      .select('*')
      .order('nombre', { ascending: true });
  }

  // Crear nuevo producto
  async crearProducto(producto: any) {
    return await this.client.from('producto').insert(producto);
  }

  // Actualizar producto (sirve para editar texto o para cambiar estado activo/inactivo)
  async actualizarProducto(id: string, datos: any) {
    return await this.client.from('producto').update(datos).eq('id', id);
  }

  // Eliminar producto
  async eliminarProducto(id: string) {
    return await this.client.from('producto').delete().eq('id', id);
  }

  // --- RANKING DE PRODUCTOS ---

  // Trae las ventas de un mes/año específico para calcular el ranking
// Trae las ventas de un mes/año específico para calcular el ranking
  async obtenerVentasParaRanking(mes: number, anio: number) {
    // Creamos el rango del primer día al último día del mes
    const inicio = new Date(anio, mes - 1, 1).toISOString();
    const fin = new Date(anio, mes, 0, 23, 59, 59).toISOString();

    return await this.client
      .from('venta')
      .select(`cantidad, precio_total, producto (id, nombre, icono)`)
      .gte('fecha', inicio) // Buscamos en tu columna correcta 'fecha'
      .lte('fecha', fin);
  }

  // --- GESTIÓN DE CLIENTES (CRUD COMPLETO) ---

 // --- GESTIÓN DE CLIENTES (CRUD COMPLETO) ---

  async obtenerTodosLosClientes() {
    // Pedimos al cliente y cruzamos la data con sus ventas asociadas
    return await this.client
      .from('cliente')
      .select(`
        *,
        venta ( precio_total, valor_pagado )
      `);
  }

  async crearClienteDefinitivo(datos: any) {
    return await this.client.from('cliente').insert(datos);
  }

  async actualizarCliente(id: string, datos: any) {
    return await this.client.from('cliente').update(datos).eq('id', id);
  }

  async eliminarCliente(id: string) {
    return await this.client.from('cliente').delete().eq('id', id);
  }



 // --- GESTIÓN DE MÉTODOS DE PAGO (CRUD COMPLETO) ---


  async obtenerTodosLosMetodosPagoAdmin() {
    // Cruzamos: Metodo -> Venta -> Cliente
    return await this.client
      .from('metodo_pago')
      .select(`
        *,
        venta (
          cliente ( id, nombre_completo )
        )
      `)
      .order('nombre', { ascending: true });
  }

  async crearMetodoPago(datos: any) {
    return await this.client.from('metodo_pago').insert(datos);
  }

  async actualizarMetodoPago(id: string, datos: any) {
    return await this.client.from('metodo_pago').update(datos).eq('id', id);
  }

  async eliminarMetodoPago(id: string) {
    return await this.client.from('metodo_pago').delete().eq('id', id);
  }

  // --- GESTIÓN DE MATERIA PRIMA (INSUMOS) ---

  async obtenerTodasLasMateriasPrimas() {
    return await this.client
      .from('materia_prima')
      .select('*')
      .order('nombre', { ascending: true });
  }

  async crearMateriaPrima(datos: any) {
    return await this.client.from('materia_prima').insert(datos);
  }

  async actualizarMateriaPrima(id: string, datos: any) {
    return await this.client.from('materia_prima').update(datos).eq('id', id);
  }

  async eliminarMateriaPrima(id: string) {
    return await this.client.from('materia_prima').delete().eq('id', id);
  }

  // --- GESTIÓN DE ACTIVOS FIJOS ---

  async obtenerTodosLosActivos() {
    return await this.client
      .from('activo_fijo')
      .select('*')
      .order('fecha_adquisicion', { ascending: false }); // Ordenamos por los más recientes primero
  }

  async crearActivo(datos: any) {
    return await this.client.from('activo_fijo').insert(datos);
  }

  async actualizarActivo(id: string, datos: any) {
    return await this.client.from('activo_fijo').update(datos).eq('id', id);
  }

  async eliminarActivo(id: string) {
    return await this.client.from('activo_fijo').delete().eq('id', id);
  }

  // --- GESTIÓN DE PROVEEDORES (CRUD Y ESTADÍSTICAS) ---

  async obtenerTodosLosProveedoresAdmin() {
    // Cruzamos el proveedor con sus compras para calcular el total pagado
    return await this.client
      .from('proveedor')
      .select(`
        *,
        compra (*)
      `)
      .order('nombre', { ascending: true });
  }

  async crearProveedor(datos: any) {
    return await this.client.from('proveedor').insert(datos);
  }

  async actualizarProveedor(id: string, datos: any) {
    return await this.client.from('proveedor').update(datos).eq('id', id);
  }

  // Ahora es un borrado lógico (desactivar) en lugar de un DELETE destructivo
  async desactivarProveedor(id: string) {
    return await this.client.from('proveedor').update({ activo: false }).eq('id', id);
  }

  // --- REGISTRO DE COMPRAS (MAESTRO-DETALLE) ---

  async registrarCompraCompleta(compraCabecera: any, detalles: any[]) {
    // 1. Guardamos la cabecera de la compra
    const { data: compraData, error: errCompra } = await this.client
      .from('compra')
      .insert(compraCabecera)
      .select()
      .single();

    if (errCompra || !compraData) throw errCompra;

    // 2. Le inyectamos el ID de la compra a cada detalle de la lista
    const detallesPreparados = detalles.map(det => ({
      compra_id: compraData.id,
      materia_prima_id: det.materia_prima_id,
      cantidad: det.cantidad,
      valor_comprado: det.valor_comprado
    }));

    // 3. Guardamos todos los detalles de golpe
    const { error: errDetalles } = await this.client
      .from('compra_detalle')
      .insert(detallesPreparados);

    if (errDetalles) throw errDetalles;

    return compraData;
  }
}
