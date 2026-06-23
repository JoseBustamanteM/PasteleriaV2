import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from '../../../core/services/supabase.service';

@Component({
  selector: 'app-proveedores',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './proveedores.component.html'
})
export class ProveedoresComponent implements OnInit {
  private router = inject(Router);
  private supabase = inject(SupabaseService);

  // Control de pestañas
  pestanaActiva = signal<'historial' | 'crud'>('historial');

  proveedoresBase = signal<any[]>([]);
  cargando = signal(false);

  // Para la pestaña de Historial
  proveedorSeleccionado = signal<any>(null);

  // Buscador para el CRUD
  textoBusqueda = signal('');
  proveedoresVisualizados = computed(() => {
    const texto = this.textoBusqueda().toLowerCase();
    // Solo mostramos los proveedores activos en el CRUD
    let lista = this.proveedoresBase().filter(p => p.activo !== false);

    if (texto) {
      lista = lista.filter(p => p.nombre?.toLowerCase().includes(texto));
    }
    return lista;
  });

  // Modal
  mostrarModal = signal(false);
  proveedorActual = signal<any>({ id: null, nombre: '', telefono: '', direccion: '' });

  async ngOnInit() {
    await this.cargarProveedores();
  }

  volver() {
    this.router.navigate(['/compras']);
  }

  async cargarProveedores() {
    this.cargando.set(true);
    const { data } = await this.supabase.obtenerTodosLosProveedoresAdmin();

    if (data) {
      // Procesar para calcular totales
      const procesados = data.map(prov => {
        const compras = prov.compra || [];
        const totalPagado = compras.reduce((suma: number, c: any) => suma + Number(c.total_pagado || 0), 0);

        // Ordenar las compras de la más reciente a la más antigua
        compras.sort((a: any, b: any) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

        return {
          ...prov,
          comprasRealizadas: compras,
          totalPagado,
          cantidadCompras: compras.length
        };
      });

      this.proveedoresBase.set(procesados);

      // Autoseleccionar el primero para el historial si hay datos
      const activos = procesados.filter(p => p.activo !== false);
      if (activos.length > 0 && !this.proveedorSeleccionado()) {
        this.proveedorSeleccionado.set(activos[0]);
      } else if (this.proveedorSeleccionado()) {
        const actualizado = procesados.find(p => p.id === this.proveedorSeleccionado().id);
        if (actualizado) this.proveedorSeleccionado.set(actualizado);
      }
    }
    this.cargando.set(false);
  }

  abrirModal(proveedor?: any) {
    if (proveedor) {
      this.proveedorActual.set({ ...proveedor });
    } else {
      this.proveedorActual.set({ id: null, nombre: '', telefono: '', direccion: '' });
    }
    this.mostrarModal.set(true);
  }

  cerrarModal() {
    this.mostrarModal.set(false);
  }

  async guardarProveedor() {
    const prov = this.proveedorActual();
    if (!prov.nombre) return;

    const datosGuardar = {
      nombre: prov.nombre,
      telefono: prov.telefono,
      direccion: prov.direccion
    };

    if (prov.id) {
      await this.supabase.actualizarProveedor(prov.id, datosGuardar);
    } else {
      await this.supabase.crearProveedor(datosGuardar);
    }

    this.cerrarModal();
    await this.cargarProveedores();
  }

  async desactivarProveedor() {
    const prov = this.proveedorActual();
    if (!prov.id) return;

    const confirmar = window.confirm(`¿Seguro que deseas desactivar a "${prov.nombre}"? Sus compras anteriores se mantendrán en el historial.`);
    if (confirmar) {
      await this.supabase.desactivarProveedor(prov.id);
      this.cerrarModal();

      // Si desactivamos el que estábamos viendo en el historial, lo quitamos
      if (this.proveedorSeleccionado()?.id === prov.id) {
        this.proveedorSeleccionado.set(null);
      }

      await this.cargarProveedores();
    }
  }
}
