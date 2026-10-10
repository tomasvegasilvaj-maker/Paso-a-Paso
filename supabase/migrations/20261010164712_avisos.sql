-- Paso 5: avisos push (doc 01 "Notificaciones").

-- Dispositivos suscriptos a los avisos (uno por navegador/celular).
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

create policy "Ver mis dispositivos" on public.push_subscriptions
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Agregar mi dispositivo" on public.push_subscriptions
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Actualizar mi dispositivo" on public.push_subscriptions
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Quitar mi dispositivo" on public.push_subscriptions
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Avisos ya mandados: evita repetirlos y permite el tope diario. Solo lo usa la función avisos.
create table public.avisos_enviados (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  kind text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, day, kind)
);

alter table public.avisos_enviados enable row level security;
-- Sin políticas: la app no lo lee ni lo escribe; la función usa la clave de servicio.

-- Claves de los avisos guardadas en Vault (se cargan aparte, nunca en el repo):
--   avisos_cron (secreto que manda pg_cron), vapid_public y vapid_private (firma de los push).
-- Solo la función avisos (con la clave de servicio) puede leerlas.
create function public.avisos_config() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_object_agg(name, decrypted_secret)
  from vault.decrypted_secrets
  where name in ('avisos_cron', 'vapid_public', 'vapid_private');
$$;

revoke execute on function public.avisos_config() from public, anon, authenticated;
grant execute on function public.avisos_config() to service_role;

-- Cada 5 minutos se llama a la función avisos, que decide qué mandar según la hora de cada usuario.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'avisos-cada-5-min',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://izdfvzjkypcqxuspsxsm.supabase.co/functions/v1/avisos',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'avisos_cron')
    ),
    body := '{}'::jsonb
  );
  $$
);
