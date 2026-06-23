import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from '../../../core/services/supabase.service';

@Component({
  selector: 'app-activos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './activos.component.html'
})
export class ActivosComponent implements OnInit {
  private router = inject(Router);
  private supabase = inject(SupabaseService);

  activosBase = signal<any[]>([]);
  cargando = signal(false);

  // Buscador y Total Invertido
  textoBusqueda = signal('');

  activosVisualizados = computed(() => {
    const texto = this.textoBusqueda().toLowerCase();
    if (!texto) return this.activosBase();
    return this.activosBase().filter(a => a.nombre.toLowerCase().includes(texto));
  });

  totalInvertido = computed(() => {
    return this.activosVisualizados().reduce((suma, activo) => suma + Number(activo.valor || 0), 0);
  });

  // Modal
  mostrarModal = signal(false);
  activoActual = signal<any>({ id: null, nombre: '', valor: '', fecha_adquisicion: '' });

  async ngOnInit() {
    await this.cargarActivos();
  }

  volver() {
    this.router.navigate(['/compras']);
  }

  async cargarActivos() {
    this.cargando.set(true);
    const { data } = await this.supabase.obtenerTodosLosActivos();
    if (data) this.activosBase.set(data);
    this.cargando.set(false);
  }

  abrirModal(activo?: any) {
    if (activo) {
      this.activoActual.set({ ...activo });
    } else {
      // Por defecto sugerimos la fecha de hoy
      const hoy = new Date().toISOString().split('T')[0];
      this.activoActual.set({ id: null, nombre: '', valor: '', fecha_adquisicion: hoy });
    }
    this.mostrarModal.set(true);
  }

  cerrarModal() {
    this.mostrarModal.set(false);
  }

  async guardarActivo() {
    const act = this.activoActual();
    if (!act.nombre || !act.valor || !act.fecha_adquisicion) return;

    const datosGuardar = {
      nombre: act.nombre,
      valor: act.valor,
      fecha_adquisicion: act.fecha_adquisicion
    };

    if (act.id) {
      await this.supabase.actualizarActivo(act.id, datosGuardar);
    } else {
      await this.supabase.crearActivo(datosGuardar);
    }

    this.cerrarModal();
    await this.cargarActivos();
  }

  async eliminarActivo() {
    const act = this.activoActual();
    if (!act.id) return;

    const confirmar = window.confirm(`¿Seguro que deseas eliminar "${act.nombre}" del registro?`);
    if (confirmar) {
      await this.supabase.eliminarActivo(act.id);
      this.cerrarModal();
      await this.cargarActivos();
    }
  }
}
