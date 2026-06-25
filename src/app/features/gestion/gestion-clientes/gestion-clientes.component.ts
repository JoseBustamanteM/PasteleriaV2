import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from '../../../core/services/supabase.service';

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

  // Modal
  mostrarModal = signal(false);
  clienteActual = signal<any>({ id: null, nombre_completo: '' });

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
    await this.cargarClientes();
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
      this.clienteActual.set({ ...cliente });
    } else {
      this.clienteActual.set({ id: null, nombre_completo: '' });
    }
    this.mostrarModal.set(true);
  }

  cerrarModal() {
    this.mostrarModal.set(false);
  }

  async guardarCliente() {
    const cli = this.clienteActual();
    if (!cli.nombre_completo) return;

    const datosGuardar = { nombre_completo: cli.nombre_completo };

    if (cli.id) {
      await this.supabase.actualizarCliente(cli.id, datosGuardar);
    } else {
      await this.supabase.crearClienteDefinitivo(datosGuardar);
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
}
