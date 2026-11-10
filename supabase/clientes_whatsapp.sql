-- Sección WhatsApp de Clientes: teléfono y consentimiento para recibir mensajes.
-- Ejecutar una vez en Supabase > SQL Editor.
alter table public.cliente add column if not exists telefono text;
alter table public.cliente add column if not exists acepta_whatsapp boolean not null default false;
