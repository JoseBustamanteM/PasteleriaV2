import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from '../../../core/services/supabase.service';

@Component({
  selector: 'app-nueva-compra',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './nueva-compra.component.html'
})
export class NuevaCompraComponent implements OnInit {
  private router = inject(Router);
  private supabase = inject(SupabaseService);

  // Datos para los selectores
  proveedores = signal<any[]>([]);
  insumos = signal<any[]>([]);
  cargandoDatos = signal(true);
  guardando = signal(false);

  // Cabecera de la Compra
  proveedorSeleccionado = signal<string>('');
  fechaCompra = signal<string>(new Date().toISOString().split('T')[0]);

  // Carrito (Detalles)
  carrito = signal<any[]>([]);
  totalCompra = computed(() => this.carrito().reduce((suma, item) => suma + Number(item.valor_comprado), 0));

  // --- NUEVA LÓGICA DEL BUSCADOR INTELIGENTE ---
  mostrarModalInsumo = signal(false);
  itemActual = signal<any>({ materia_prima_id: '', cantidad: 1, valor_comprado: '' });

  busquedaInsumo = signal('');
  mostrarDropdown = signal(false);

  insumosFiltrados = computed(() => {
    const texto = this.busquedaInsumo().toLowerCase().trim();
    if (!texto) return this.insumos();
    return this.insumos().filter(i => i.nombre.toLowerCase().includes(texto));
  });

  coincidenciaExacta = computed(() => {
    const texto = this.busquedaInsumo().toLowerCase().trim();
    return this.insumos().some(i => i.nombre.toLowerCase() === texto);
  });

  async ngOnInit() {
    this.cargandoDatos.set(true);
    const [resProv, resIns] = await Promise.all([
      this.supabase.obtenerTodosLosProveedoresAdmin(),
      this.supabase.obtenerTodasLasMateriasPrimas()
    ]);

    if (resProv.data) this.proveedores.set(resProv.data.filter(p => p.activo !== false));
    if (resIns.data) this.insumos.set(resIns.data);
    this.cargandoDatos.set(false);
  }

  volver() {
    this.router.navigate(['/compras']);
  }

  // --- CONTROL DEL MODAL E INSUMOS ---

  abrirModalInsumo() {
    this.itemActual.set({ materia_prima_id: '', cantidad: 1, valor_comprado: '' });
    this.busquedaInsumo.set('');
    this.mostrarDropdown.set(false);
    this.mostrarModalInsumo.set(true);
  }

  cerrarModalInsumo() {
    this.mostrarModalInsumo.set(false);
  }

  seleccionarInsumo(ins: any) {
    this.itemActual.update(act => ({ ...act, materia_prima_id: ins.id }));
    this.busquedaInsumo.set(ins.nombre); // Llenamos el input con el nombre
    this.mostrarDropdown.set(false);     // Ocultamos la lista
  }

  cambioEnBuscador(texto: string) {
    this.busquedaInsumo.set(texto);
    this.mostrarDropdown.set(true);
    // Si el usuario borra o cambia el texto, quitamos el ID seleccionado para evitar errores
    this.itemActual.update(act => ({ ...act, materia_prima_id: '' }));
  }

  async crearInsumoRapido() {
    const nombreNuevo = this.busquedaInsumo().trim();
    if (!nombreNuevo) return;

    this.guardando.set(true);
    try {
      // Creamos el insumo directamente en la base de datos y pedimos que nos devuelva el registro creado
      const { data, error } = await this.supabase.client
        .from('materia_prima')
        .insert({ nombre: nombreNuevo, icono: '📦' }) // Ícono por defecto para compras rápidas
        .select()
        .single();

      if (data && !error) {
        // Actualizamos la lista local y lo seleccionamos automáticamente
        this.insumos.update(lista => [...lista, data].sort((a, b) => a.nombre.localeCompare(b.nombre)));
        this.seleccionarInsumo(data);
      }
    } catch (e) {
      console.error('Error al crear insumo rápido', e);
    } finally {
      this.guardando.set(false);
    }
  }

  agregarAlCarrito() {
    const item = this.itemActual();
    if (!item.materia_prima_id || !item.cantidad || !item.valor_comprado) return;

    const insumoReal = this.insumos().find(i => i.id === item.materia_prima_id);

    this.carrito.update(items => [...items, {
      ...item,
      nombre: insumoReal?.nombre,
      icono: insumoReal?.icono
    }]);

    this.cerrarModalInsumo();
  }

  eliminarDelCarrito(index: number) {
    this.carrito.update(items => items.filter((_, i) => i !== index));
  }

  async finalizarCompra() {
    if (!this.proveedorSeleccionado() || this.carrito().length === 0) return;

    this.guardando.set(true);
    try {
      const cabecera = {
        proveedor_id: this.proveedorSeleccionado(),
        fecha: new Date(this.fechaCompra()).toISOString(),
        total_pagado: this.totalCompra()
      };
      await this.supabase.registrarCompraCompleta(cabecera, this.carrito());
      this.volver();
    } catch (error) {
      console.error(error);
      alert('Hubo un error al guardar la compra.');
    } finally {
      this.guardando.set(false);
    }
  }
}
