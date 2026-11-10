import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from '../../../core/services/supabase.service';

// Marca (en sessionStorage) que hay un envío de WhatsApp a medias. main.ts la lee.
export const ENVIO_ACTIVO = 'whatsapp-envio-activo';

@Component({
  selector: 'app-gestion-clientes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gestion-clientes.component.html'
})
export class GestionClientesComponent implements OnInit {
  private router = inject(Router);
  private supabase = inject(SupabaseService);

  // Datos base que vienen de Supabase
  clientesBase = signal<any[]>([]);
  cargando = signal(false);

  // Señales para los filtros
  textoBusqueda = signal('');
  criterioOrden = signal<'nombre' | 'deuda' | 'compras' | 'gastado'>('nombre');

  // Pestaña activa: directorio de clientes o difusión por WhatsApp
  pestanaActiva = signal<'directorio' | 'whatsapp'>('directorio');

  // Modal
  mostrarModal = signal(false);
  clienteActual = signal<any>({ id: null, nombre_completo: '', telefono: '' });

  // --- WHATSAPP ---
  productos = signal<any[]>([]);
  productosDelDia = signal<Set<string>>(new Set());
  mensaje = signal('');
  mensajeEditado = signal(false); // si se escribió a mano, no lo reemplazamos al marcar productos
  busquedaSegmento = signal('');
  enviadosHoy = signal<Set<string>>(new Set());
  procesandoSegmento = signal<string | null>(null);

  // Clientes que aceptaron recibir mensajes (el segmento)
  segmento = computed(() =>
    this.clientesBase()
      .filter(c => c.acepta_whatsapp)
      .sort((a, b) => a.nombre_completo.localeCompare(b.nombre_completo))
  );

  // Clientes que todavía no están en el segmento (para poder agregarlos)
  clientesFueraSegmento = computed(() => {
    const texto = this.busquedaSegmento().toLowerCase();
    return this.clientesBase()
      .filter(c => !c.acepta_whatsapp)
      .filter(c => !texto || c.nombre_completo.toLowerCase().includes(texto))
      .sort((a, b) => a.nombre_completo.localeCompare(b.nombre_completo));
  });

  sinTelefonoEnSegmento = computed(() =>
    this.segmento().filter(c => !this.telefonoWhatsapp(c.telefono)).length
  );

  // --- ENVÍO A TODOS (uno tras otro) ---
  envioEnCurso = signal(false);
  omitidos = signal<Set<string>>(new Set());

  // Clientes del segmento con teléfono válido
  segmentoConTelefono = computed(() => this.segmento().filter(c => this.telefonoWhatsapp(c.telefono)));

  // Los que faltan por recibir el mensaje en esta ronda
  pendientes = computed(() =>
    this.segmentoConTelefono().filter(c => !this.enviadosHoy().has(c.id) && !this.omitidos().has(c.id))
  );

  siguiente = computed(() => this.pendientes()[0] ?? null);

  // ¡LA MAGIA DE ANGULAR! Calcula la lista en tiempo real según los filtros
  clientesVisualizados = computed(() => {
    let lista = [...this.clientesBase()];

    // 1. Filtrar por texto (Buscador)
    const texto = this.textoBusqueda().toLowerCase();
    if (texto) {
      lista = lista.filter(c => c.nombre_completo.toLowerCase().includes(texto));
    }

    // 2. Ordenar según el criterio seleccionado
    const criterio = this.criterioOrden();
    if (criterio === 'deuda') {
      lista.sort((a, b) => b.totalAdeudado - a.totalAdeudado);
    } else if (criterio === 'compras') {
      lista.sort((a, b) => b.totalCompras - a.totalCompras);
    } else if (criterio === 'gastado') {
      lista.sort((a, b) => b.totalGastado - a.totalGastado);
    } else {
      // Por defecto ordenamos alfabéticamente
      lista.sort((a, b) => a.nombre_completo.localeCompare(b.nombre_completo));
    }

    return lista;
  });

  async ngOnInit() {
    this.restaurarEstadoEnvio();
    await Promise.all([this.cargarClientes(), this.cargarProductos()]);
  }

  volver() {
    this.router.navigate(['/gestion']);
  }

async cargarClientes() {
    this.cargando.set(true);
    const { data } = await this.supabase.obtenerTodosLosClientes();

    if (data) {
      // Procesamos cada cliente para calcular sus totales
      const procesados = data.map(c => {
        let gastado = 0;
        let adeudado = 0;
        const compras = c.venta ? c.venta.length : 0;

        if (c.venta) {
          c.venta.forEach((v: any) => {
            const totalVenta = v.precio_total || 0;
            const pagadoVenta = v.valor_pagado || 0;

            // Sumamos todo el dinero histórico que el cliente ha movido
            gastado += totalVenta;

            // LA MAGIA: Calculamos la deuda por cada venta individual.
            // Si pagó de más en una venta, Math.max lo convierte en 0,
            // evitando que arrastre un saldo negativo al total adeudado.
            adeudado += Math.max(0, totalVenta - pagadoVenta);
          });
        }

        return {
          ...c,
          totalCompras: compras,
          totalGastado: gastado,
          totalAdeudado: adeudado
        };
      });

      this.clientesBase.set(procesados);
    }
    this.cargando.set(false);
  }

  abrirModal(cliente?: any) {
    if (cliente) {
      this.clienteActual.set({ ...cliente, telefono: cliente.telefono ?? '' });
    } else {
      this.clienteActual.set({ id: null, nombre_completo: '', telefono: '' });
    }
    this.mostrarModal.set(true);
  }

  cerrarModal() {
    this.mostrarModal.set(false);
  }

  async guardarCliente() {
    const cli = this.clienteActual();
    if (!cli.nombre_completo) return;

    const telefono = (cli.telefono ?? '').trim();
    const datosGuardar = { nombre_completo: cli.nombre_completo, telefono: telefono || null };

    const { error } = cli.id
      ? await this.supabase.actualizarCliente(cli.id, datosGuardar)
      : await this.supabase.crearClienteDefinitivo(datosGuardar);

    if (error) {
      this.avisarError(error);
      return;
    }

    this.cerrarModal();
    await this.cargarClientes();
  }

  async eliminarCliente() {
    const cli = this.clienteActual();
    if (!cli.id) return;

    const confirmar = window.confirm(`¿Seguro que deseas eliminar a ${cli.nombre_completo}?`);
    if (confirmar) {
      await this.supabase.eliminarCliente(cli.id);
      this.cerrarModal();
      await this.cargarClientes();
    }
  }

  // =========================================================
  // WHATSAPP: segmento de clientes y mensaje del día
  // =========================================================

  async cargarProductos() {
    const { data } = await this.supabase.obtenerProductosActivos();
    this.productos.set(data ?? []);
    // Rearmamos el texto con la plantilla y precios actuales (si no fue editado a mano)
    if (!this.mensajeEditado() && this.productosDelDia().size) this.generarMensaje();
  }

  toggleProducto(id: string) {
    const set = new Set(this.productosDelDia());
    if (set.has(id)) set.delete(id); else set.add(id);
    this.productosDelDia.set(set);
    if (!this.mensajeEditado()) this.generarMensaje();
    this.guardarEstadoEnvio();
  }

  // Arma el texto a partir de los productos marcados.
  // Lo habitual es un solo producto por día: el mensaje pregunta solo cuántos quieren.
  generarMensaje() {
    const elegidos = this.productos().filter(p => this.productosDelDia().has(p.id));
    // *texto* sale en negrita en WhatsApp
    const lineas = elegidos.map(p => {
      const precio = p.precio_base ? ` – $${Number(p.precio_base).toLocaleString('es-CL')}` : '';
      return `${p.icono ?? '•'} *${p.nombre}*${precio}`;
    });

    let cuerpo: string[] = [];
    if (elegidos.length === 1) {
      cuerpo = [
        'Te cuento que hoy tengo disponible:',
        '',
        lineas[0],
        '',
        '¿Te guardo uno? Respóndeme con la cantidad que quieres y te lo dejo apartado.',
      ];
    } else if (elegidos.length > 1) {
      cuerpo = [
        'Te cuento lo que tengo disponible hoy:',
        '',
        ...lineas,
        '',
        'Respóndeme con el producto y la cantidad que quieres y te lo dejo apartado.',
      ];
    }

    this.mensaje.set(cuerpo.length
      ? ['¡Hola! Espero que estés muy bien 😊', '', ...cuerpo, '', '¡Para que el turno de noche se haga más dulce! 🌙🍰'].join('\n')
      : '');
    this.mensajeEditado.set(false);
    this.guardarEstadoEnvio();
  }

  editarMensaje(texto: string) {
    this.mensaje.set(texto);
    this.mensajeEditado.set(true);
    this.guardarEstadoEnvio();
  }

  async cambiarSegmento(cliente: any, acepta: boolean) {
    this.procesandoSegmento.set(cliente.id);
    const { error } = await this.supabase.actualizarCliente(cliente.id, { acepta_whatsapp: acepta });
    this.procesandoSegmento.set(null);
    if (error) {
      this.avisarError(error);
      return;
    }
    // Actualizamos en memoria para no recargar toda la lista
    this.clientesBase.update(lista =>
      lista.map(c => c.id === cliente.id ? { ...c, acepta_whatsapp: acepta } : c)
    );
  }

  // Normaliza un teléfono chileno al formato que pide WhatsApp (solo dígitos, con 56)
  telefonoWhatsapp(telefono: string | null | undefined): string | null {
    let dig = (telefono ?? '').replace(/\D/g, '');
    if (dig.startsWith('00')) dig = dig.slice(2);
    if (dig.length === 8) dig = '569' + dig;       // celular sin el 9 inicial
    else if (dig.length === 9) dig = '56' + dig;   // 9XXXXXXXX
    return dig.length >= 10 ? dig : null;
  }

  enlaceWhatsapp(cliente: any): string | null {
    const numero = this.telefonoWhatsapp(cliente.telefono);
    if (!numero || !this.mensaje().trim()) return null;
    const nombre = cliente.nombre_completo.trim().split(' ')[0];
    const texto = this.mensaje().replace(/^¡Hola!/, `¡Hola ${nombre}!`);
    return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
  }

  enviarWhatsapp(cliente: any) {
    const url = this.enlaceWhatsapp(cliente);
    if (!url) return;
    this.enviadosHoy.update(s => new Set(s).add(cliente.id));
    this.guardarEstadoEnvio();

    if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      // En el celular abrimos la app de WhatsApp directamente: no se crea una pestaña nueva
      // por cliente y al volver quedamos en esta misma pantalla, lista para el siguiente.
      const numero = this.telefonoWhatsapp(cliente.telefono);
      const texto = new URL(url).searchParams.get('text') ?? '';
      window.location.href = `whatsapp://send?phone=${numero}&text=${encodeURIComponent(texto)}`;
    } else {
      window.open(url, '_blank');
    }
  }

  // Inicia la ronda: abre el primer chat. Al volver a la app aparece el siguiente.
  iniciarEnvioATodos() {
    this.omitidos.set(new Set());
    this.envioEnCurso.set(true);
    this.guardarEstadoEnvio();
    this.enviarSiguiente();
  }

  enviarSiguiente() {
    const cli = this.siguiente();
    if (cli) this.enviarWhatsapp(cli);
  }

  omitirSiguiente() {
    const cli = this.siguiente();
    if (!cli) return;
    this.omitidos.update(s => new Set(s).add(cli.id));
    this.guardarEstadoEnvio();
  }

  detenerEnvio() {
    this.envioEnCurso.set(false);
    this.omitidos.set(new Set());
    this.guardarEstadoEnvio();
  }

  // Permite volver a mandar el mensaje a todos (borra las marcas de "Enviado" de hoy)
  reiniciarEnviados() {
    if (!window.confirm('¿Quitar las marcas de "Enviado" de hoy para volver a enviar a todos?')) return;
    this.enviadosHoy.set(new Set());
    this.omitidos.set(new Set());
    this.guardarEstadoEnvio();
  }

  // --- Persistencia local del envío del día ---
  // Al cambiar a WhatsApp el celular puede recargar la app; guardamos el avance para no perderlo.
  private claveEnvio() {
    const d = new Date();
    return `whatsapp-envio-${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  }

  private guardarEstadoEnvio() {
    try {
      localStorage.setItem(this.claveEnvio(), JSON.stringify({
        enviados: [...this.enviadosHoy()],
        omitidos: [...this.omitidos()],
        productos: [...this.productosDelDia()],
        mensaje: this.mensaje(),
        mensajeEditado: this.mensajeEditado(),
      }));
      // sessionStorage sobrevive a la recarga de la pestaña: main.ts lo usa para no mandarnos al dashboard
      if (this.envioEnCurso()) sessionStorage.setItem(ENVIO_ACTIVO, '1');
      else sessionStorage.removeItem(ENVIO_ACTIVO);
    } catch { /* almacenamiento no disponible: seguimos sin persistir */ }
  }

  private restaurarEstadoEnvio() {
    try {
      const guardado = JSON.parse(localStorage.getItem(this.claveEnvio()) ?? 'null');
      if (guardado) {
        this.enviadosHoy.set(new Set(guardado.enviados ?? []));
        this.omitidos.set(new Set(guardado.omitidos ?? []));
        this.productosDelDia.set(new Set(guardado.productos ?? []));
        this.mensaje.set(guardado.mensaje ?? '');
        this.mensajeEditado.set(!!guardado.mensajeEditado);
      }
      if (sessionStorage.getItem(ENVIO_ACTIVO) === '1') {
        this.envioEnCurso.set(true);
        this.pestanaActiva.set('whatsapp');
      }
    } catch { /* sin almacenamiento: partimos de cero */ }
  }

  private avisarError(error: any) {
    console.error(error);
    const msg = String(error?.message ?? error);
    if (/telefono|acepta_whatsapp/.test(msg)) {
      alert('Falta actualizar la base de datos: ejecuta el script supabase/clientes_whatsapp.sql en Supabase.');
    } else {
      alert('No se pudo guardar: ' + msg);
    }
  }
}
