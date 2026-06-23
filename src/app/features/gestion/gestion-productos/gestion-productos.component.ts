import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // <-- IMPORTANTE PARA LOS INPUTS
import { Router } from '@angular/router';
import { SupabaseService } from '../../../core/services/supabase.service';

@Component({
  selector: 'app-gestion-productos',
  standalone: true,
  imports: [CommonModule, FormsModule], // <-- Agregamos FormsModule aquí
  templateUrl: './gestion-productos.component.html'
})
export class GestionProductosComponent implements OnInit {
  private router = inject(Router);
  private supabase = inject(SupabaseService);

  // Ranking

  meses = [
    { valor: 1, nombre: 'Enero' }, { valor: 2, nombre: 'Febrero' },
    { valor: 3, nombre: 'Marzo' }, { valor: 4, nombre: 'Abril' },
    { valor: 5, nombre: 'Mayo' }, { valor: 6, nombre: 'Junio' },
    { valor: 7, nombre: 'Julio' }, { valor: 8, nombre: 'Agosto' },
    { valor: 9, nombre: 'Septiembre' }, { valor: 10, nombre: 'Octubre' },
    { valor: 11, nombre: 'Noviembre' }, { valor: 12, nombre: 'Diciembre' }
  ];
  anios = [2024, 2025, 2026, 2027];

  mesSeleccionado = signal<number>(new Date().getMonth() + 1);
  anioSeleccionado = signal<number>(new Date().getFullYear());
  ordenarPor = signal<'cantidad' | 'recaudacion'>('cantidad');

  rankingProductos = signal<any[]>([]);
  cargandoRanking = signal(false);



  pestanaActiva = signal<'ranking' | 'crud'>('crud'); // Iniciamos en crud para probar

  // Lista de productos
  productos = signal<any[]>([]);
  cargando = signal(false);

  // Control del Formulario (Modal)
  mostrarModal = signal(false);
  productoActual = signal<any>({ id: null, nombre: '', precio_base: '', icono: '🍰', estado: true });

  async ngOnInit() {
    await this.cargarProductos(); // Carga el CRUD
    await this.cargarRanking();   // Carga el Ranking
  }

  volver() {
    this.router.navigate(['/gestion']);
  }

  // --- LÓGICA CRUD ---

  async cargarProductos() {
    this.cargando.set(true);
    const { data } = await this.supabase.obtenerTodosLosProductos();
    if (data) this.productos.set(data);
    this.cargando.set(false);
  }

  abrirModal(producto?: any) {
    if (producto) {
      // Si recibimos un producto, es MODO EDICIÓN
      this.productoActual.set({ ...producto });
    } else {
      // Si no, es MODO CREACIÓN
      this.productoActual.set({ id: null, nombre: '', precio_base: '', icono: '🍰', estado: true });
    }
    this.mostrarModal.set(true);
  }

  cerrarModal() {
    this.mostrarModal.set(false);
  }

  async guardarProducto() {
    const prod = this.productoActual();

    // Validación básica
    if (!prod.nombre || !prod.precio_base) return;

    if (prod.id) {
      // Actualizar existente
      await this.supabase.actualizarProducto(prod.id, {
        nombre: prod.nombre,
        precio_base: prod.precio_base,
        icono: prod.icono
      });
    } else {
      // Crear nuevo
      await this.supabase.crearProducto({
        nombre: prod.nombre,
        precio_base: prod.precio_base,
        icono: prod.icono,
        estado: true
      });
    }

    this.cerrarModal();
    await this.cargarProductos(); // Recargamos la lista
  }

  async cambiarEstado(producto: any) {
    // Activa o desactiva un producto rápidamente
    const nuevoEstado = !producto.estado;
    await this.supabase.actualizarProducto(producto.id, { estado: nuevoEstado });
    await this.cargarProductos();
  }

  async eliminarProducto() {
    const prod = this.productoActual();

    // Si no hay ID, no hay nada que eliminar
    if (!prod.id) return;

    // Pedimos confirmación antes de borrar
    const confirmar = window.confirm(`¿Estás seguro de eliminar el producto "${prod.nombre}"? Esta acción no se puede deshacer.`);

    if (confirmar) {
      await this.supabase.eliminarProducto(prod.id);
      this.cerrarModal();
      await this.cargarProductos(); // Recargamos la lista
    }
  }

  // --- MÉTODOS DEL RANKING ---
  async cargarRanking() {
    this.cargandoRanking.set(true);
    const { data } = await this.supabase.obtenerVentasParaRanking(this.mesSeleccionado(), this.anioSeleccionado());

    if (!data || data.length === 0) {
      this.rankingProductos.set([]);
      this.cargandoRanking.set(false);
      return;
    }

    // 1. Agrupar las ventas por producto y sumar
    const agrupado: Record<string, any> = {};

    data.forEach((venta: any) => {
      // Manejar el caso por si el producto fue eliminado pero quedó el registro
      const prod = venta.producto || { id: 'desc', nombre: 'Producto Eliminado', icono: '📦' };

      if (!agrupado[prod.id]) {
        agrupado[prod.id] = {
          id: prod.id,
          nombre: prod.nombre,
          icono: prod.icono,
          cantidad: 0,
          recaudacion: 0
        };
      }

      agrupado[prod.id].cantidad += venta.cantidad || 1;
      agrupado[prod.id].recaudacion += venta.precio_total || 0;
    });

    // 2. Convertir a arreglo y ordenar según el criterio seleccionado
    let resultado = Object.values(agrupado);

    if (this.ordenarPor() === 'cantidad') {
      resultado.sort((a, b) => b.cantidad - a.cantidad);
    } else {
      resultado.sort((a, b) => b.recaudacion - a.recaudacion);
    }

    this.rankingProductos.set(resultado);
    this.cargandoRanking.set(false);
  }



}
