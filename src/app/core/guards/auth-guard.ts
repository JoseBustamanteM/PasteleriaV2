import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';

export const authGuard: CanActivateFn = async (route, state) => {
  const supabaseService = inject(SupabaseService);
  const router = inject(Router);

  try {
    const { data: { session }, error } = await supabaseService.client.auth.getSession();

    if (error) throw error; // Lanzamos el error para que el catch lo atrape

    if (session) {
      return true; // Usuario logueado, pasa al dashboard
    } else {
      return router.createUrlTree(['/auth']); // Sin sesión, va al login
    }
  } catch (err) {
    console.error('Error oculto en el Guard:', err);
    // Si la promesa falla (sin internet, credenciales inválidas, etc.), forzamos la salida
    return router.createUrlTree(['/auth']);
  }
};
