import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard'; // <-- Importa tu nuevo Guard
import { HistorialVentasComponent } from './features/historial-ventas/historial-ventas.component';
import { GestionComponent } from './features/gestion/gestion.component';
import { GestionProductosComponent } from './features/gestion/gestion-productos/gestion-productos.component';
import { GestionClientesComponent } from './features/gestion/gestion-clientes/gestion-clientes.component';
import { GestionMetodosPagoComponent } from './features/gestion/gestion-metodos-pago/gestion-metodos-pago.component';
import { CentroComprasComponent } from './features/compras/centro-compras/centro-compras.component';
import { InsumosComponent } from './features/compras/insumos/insumos.component';
import { ActivosComponent } from './features/compras/activos/activos.component';
import { ProveedoresComponent } from './features/compras/proveedores/proveedores.component';
import { NuevaCompraComponent } from './features/compras/nueva-compra/nueva-compra.component';


export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'auth',
    // La pantalla de Login NO lleva guard para que todos puedan entrar a loguearse
    loadComponent: () => import('./features/auth/auth.component').then(m => m.AuthComponent)
  },
  {
    path: 'dashboard',
    canActivate: [authGuard], // <-- Protegido
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'pos',
    canActivate: [authGuard], // <-- Protegido
    loadComponent: () => import('./features/pos/pos.component').then(m => m.PosComponent)
  },
  { path: 'gestion', component: GestionComponent },
  // {
  //   path: 'clientes',
  //   canActivate: [authGuard], // <-- Protegido
  //   loadComponent: () => import('./features/clientes/clientes.component').then(m => m.ClientesComponent)
  // },
  // {
  //   path: 'inventario',
  //   canActivate: [authGuard], // <-- Protegido
  //   loadComponent: () => import('./features/inventario/inventario.component').then(m => m.InventarioComponent)
  // },
  // {
  //   path: 'compras',
  //   canActivate: [authGuard], // <-- Protegido
  //   loadComponent: () => import('./features/compras/compras.component').then(m => m.ComprasComponent)
  // },
  {
    path: 'catalogos',
    canActivate: [authGuard], // <-- Protegido
    loadComponent: () => import('./features/catalogos/catalogos.component').then(m => m.CatalogosComponent)
  },
  // {
  //   path: '**',
  //   redirectTo: 'dashboard'
  // },
  {
    path: 'historial',
    component: HistorialVentasComponent,
    canActivate: [authGuard]
  },

  { path: 'gestion/catalogo', component: GestionProductosComponent },
  { path: 'gestion/clientes', component: GestionClientesComponent },
  { path: 'gestion/metodos-pago', component: GestionMetodosPagoComponent },
  { path: 'compras', component: CentroComprasComponent },
  { path: 'compras/insumos', component: InsumosComponent },
  { path: 'compras/activos', component: ActivosComponent },
  { path: 'compras/proveedores', component: ProveedoresComponent },
  { path: 'compras/historial-compras', component: NuevaCompraComponent },
];
