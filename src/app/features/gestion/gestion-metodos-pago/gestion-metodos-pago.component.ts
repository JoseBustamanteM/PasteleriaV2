import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from '../../../core/services/supabase.service';

@Component({
  selector: 'app-gestion-metodos-pago',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gestion-metodos-pago.component.html'
})
export class GestionMetodosPagoComponent implements OnInit {
  private router = inject(Router);
  private supabase = inject(SupabaseService);

  // Control de pestañas
  pestanaActiva = signal<'uso' | 'crud'>('uso');

  metodos = signal<any[]>([]);
  cargando = signal(false);

  // Variable para la pestaña de Uso (qué método está seleccionado en el filtro)
  metodoFiltroSeleccionado = signal<any>(null);

  // Modal para CRUD
  mostrarModal = signal(false);
  metodoActual = signal<any>({ id: null, nombre: '' });

  async ngOnInit() {
    await this.cargarMetodos();
  }

  volver() {
    this.router.navigate(['/gestion']);
  }

  async cargarMetodos() {
    this.cargando.set(true);
    const { data } = await this.supabase.obtenerTodosLosMetodosPagoAdmin();

    if (data) {
      const procesados = data.map(metodo => {
        const ventas = metodo.venta || [];

        // Usamos un Map para guardar los clientes únicos usando su ID
        const clientesMap = new Map();

        ventas.forEach((v: any) => {
          if (v.cliente && v.cliente.id) {
            clientesMap.set(v.cliente.id, v.cliente);
          }
        });

        // Convertimos el Map a un arreglo y lo ordenamos alfabéticamente
        const clientesUnicos = Array.from(clientesMap.values());
        clientesUnicos.sort((a, b) => a.nombre_completo.localeCompare(b.nombre_completo));

        return {
          ...metodo,
          clientes: clientesUnicos,
          totalClientesDistintos: clientesUnicos.length
        };
      });

      this.metodos.set(procesados);

      // Si hay métodos y no hay ninguno seleccionado, seleccionamos el primero por defecto
      if (procesados.length > 0 && !this.metodoFiltroSeleccionado()) {
        this.metodoFiltroSeleccionado.set(procesados[0]);
      } else if (procesados.length > 0) {
        // Actualizamos la info del método seleccionado si ya había uno
        const actualizado = procesados.find(m => m.id === this.metodoFiltroSeleccionado().id);
        if (actualizado) this.metodoFiltroSeleccionado.set(actualizado);
      }
    }
    this.cargando.set(false);
  }

  // --- MÉTODOS DEL CRUD ---

  abrirModal(metodo?: any) {
    if (metodo) {
      this.metodoActual.set({ ...metodo });
    } else {
      this.metodoActual.set({ id: null, nombre: '' });
    }
    this.mostrarModal.set(true);
  }

  cerrarModal() {
    this.mostrarModal.set(false);
  }

  async guardarMetodo() {
    const met = this.metodoActual();
    if (!met.nombre) return;

    const datosGuardar = { nombre: met.nombre };

    if (met.id) {
      await this.supabase.actualizarMetodoPago(met.id, datosGuardar);
    } else {
      await this.supabase.crearMetodoPago(datosGuardar);
    }

    this.cerrarModal();
    await this.cargarMetodos();
  }

  async eliminarMetodo() {
    const met = this.metodoActual();
    if (!met.id) return;

    const confirmar = window.confirm(`¿Seguro que deseas eliminar "${met.nombre}"?`);
    if (confirmar) {
      await this.supabase.eliminarMetodoPago(met.id);
      this.cerrarModal();
      await this.cargarMetodos();
    }
  }

  // Utilidad visual
  obtenerIcono(nombre: string): string {
    const n = nombre.toLowerCase();
    if (n.includes('efectivo')) return '💵';
    if (n.includes('transf')) return '📱';
    if (n.includes('tarjeta') || n.includes('debito') || n.includes('credito')) return '💳';
    return '💰';
  }
}
