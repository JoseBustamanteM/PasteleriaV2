import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from '../../core/services/supabase.service';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.scss']
})
export class AuthComponent {
  private fb = inject(FormBuilder);
  private supabaseService = inject(SupabaseService);
  private router = inject(Router);

  // Definición del formulario reactivo con validaciones básicas
  authForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  // Signals para manejar estados reactivos en la interfaz sin suscripciones
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  async onSubmit() {
    if (this.authForm.invalid) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const { email, password } = this.authForm.value;

    // Petición de login usando el cliente de Supabase heredado de tu core service
    const { error } = await this.supabaseService.client.auth.signInWithPassword({
      email: email!,
      password: password!
    });

    this.isLoading.set(false);

    if (error) {
      // Mapeo básico de errores comunes en español
      if (error.message === 'Invalid login credentials') {
        this.errorMessage.set('Correo o contraseña incorrectos.');
      } else {
        this.errorMessage.set(error.message);
      }
    } else {
      // Login exitoso: Redirigimos al dashboard (el guard ahora nos dejará pasar)
      this.router.navigate(['/dashboard']);
    }
  }
}
