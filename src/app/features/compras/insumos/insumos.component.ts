import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from '../../../core/services/supabase.service';

@Component({
  selector: 'app-insumos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './insumos.component.html'
})
export class InsumosComponent implements OnInit {
  private router = inject(Router);
  private supabase = inject(SupabaseService);

  insumosBase = signal<any[]>([]);
  cargando = signal(false);

  // Buscador
  textoBusqueda = signal('');
  insumosVisualizados = computed(() => {
    const texto = this.textoBusqueda().toLowerCase();
    if (!texto) return this.insumosBase();
    return this.insumosBase().filter(i => i.nombre.toLowerCase().includes(texto));
  });

  // Modal
  mostrarModal = signal(false);
  insumoActual = signal<any>({ id: null, nombre: '', icono: '🌾' });

  async ngOnInit() {
    await this.cargarInsumos();
  }

  volver() {
    this.router.navigate(['/compras']);
  }

  async cargarInsumos() {
    this.cargando.set(true);
    const { data } = await this.supabase.obtenerTodasLasMateriasPrimas();
    if (data) this.insumosBase.set(data);
    this.cargando.set(false);
  }

  abrirModal(insumo?: any) {
    if (insumo) {
      this.insumoActual.set({ ...insumo });
    } else {
      this.insumoActual.set({ id: null, nombre: '', icono: '🌾' });
    }
    this.mostrarModal.set(true);
  }

  cerrarModal() {
    this.mostrarModal.set(false);
  }

  async guardarInsumo() {
    const ins = this.insumoActual();
    if (!ins.nombre) return;

    const datosGuardar = { nombre: ins.nombre, icono: ins.icono };

    if (ins.id) {
      await this.supabase.actualizarMateriaPrima(ins.id, datosGuardar);
    } else {
      await this.supabase.crearMateriaPrima(datosGuardar);
    }

    this.cerrarModal();
    await this.cargarInsumos();
  }

  async eliminarInsumo() {
    const ins = this.insumoActual();
    if (!ins.id) return;

    const confirmar = window.confirm(`¿Seguro que deseas eliminar "${ins.nombre}"?`);
    if (confirmar) {
      await this.supabase.eliminarMateriaPrima(ins.id);
      this.cerrarModal();
      await this.cargarInsumos();
    }
  }
}
