-- Paso a Paso v1: modelo de datos (doc 01 "Producto y reglas").
--
-- Reglas que viven en la base:
--   * Cada actividad completada guarda nombre y puntaje de ese momento (el historial no cambia
--     si mañana cambia un puntaje).
--   * El día va de 00:00 a 00:00 en la zona horaria del usuario.
--   * Billetera = puntos ganados - puntos canjeados. Solo baja al canjear.
--   * Un canje solo pasa si alcanza la billetera.
-- La racha (rojo / azul / apagado) se calcula en la app con src/lib/racha.ts.

-- Perfil: zona horaria (define cuándo empieza el día).
create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  timezone text not null default 'America/Argentina/Cordoba',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Ver mi perfil" on public.profiles
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Editar mi perfil" on public.profiles
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Se crea solo al registrarse.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Usuarios que ya existían antes de esta migración.
insert into public.profiles (user_id) select id from auth.users on conflict do nothing;

-- Fecha de "hoy" para un usuario según su zona horaria.
create function public.user_today(p_user uuid) returns date
language sql stable security definer set search_path = '' as $$
  select (now() at time zone coalesce(
    (select timezone from public.profiles where user_id = p_user),
    'America/Argentina/Cordoba'))::date;
$$;

-- Catálogo de actividades. Fijo desde la interfaz: se cambia solo con migraciones (nueva versión).
create table public.activities (
  id text primary key,
  name text not null,
  kind text not null check (kind in ('principal', 'bonus')),
  points integer not null check (points > 0),
  sort smallint not null,
  active boolean not null default true
);

alter table public.activities enable row level security;

create policy "Ver actividades" on public.activities
  for select to authenticated using (true);

insert into public.activities (id, name, kind, points, sort) values
  ('concentracion', 'Bloque de concentración', 'principal', 1000, 1),
  ('cocinar', 'Cocinar', 'principal', 500, 2),
  ('caminar', 'Caminar (10.000 pasos) o gimnasio', 'principal', 500, 3),
  ('hermanos', 'Despertar a los hermanos', 'principal', 200, 4),
  ('leer', 'Leer', 'principal', 100, 5),
  ('meditacion', 'Meditación', 'principal', 100, 6),
  ('cama', 'Hacer la cama', 'bonus', 50, 7),
  ('platos', 'Lavar los platos', 'bonus', 50, 8),
  ('lavarropa', 'Poner el lavarropa', 'bonus', 50, 9),
  ('habitacion', 'Limpiar la habitación', 'bonus', 50, 10),
  ('pisos', 'Lavar los pisos', 'bonus', 50, 11),
  ('banos', 'Lavar los baños', 'bonus', 50, 12),
  ('barrer', 'Barrer', 'bonus', 50, 13);

-- Actividades completadas (tilde manual). Una por actividad y por día.
create table public.completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day date not null,
  activity_id text not null references public.activities (id),
  activity_name text not null,
  points integer not null,
  created_at timestamptz not null default now(),
  unique (user_id, day, activity_id)
);

create index completions_user_day_idx on public.completions (user_id, day);

alter table public.completions enable row level security;

create policy "Ver mis actividades" on public.completions
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Tildar una actividad" on public.completions
  for insert to authenticated with check ((select auth.uid()) = user_id);
-- Destildar solo el mismo día, para corregir un toque equivocado.
create policy "Destildar hoy" on public.completions
  for delete to authenticated
  using ((select auth.uid()) = user_id and day = public.user_today(user_id));

-- El servidor fija día, nombre y puntaje: el cliente solo dice qué actividad tildó.
create function public.completions_fill() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  a public.activities;
begin
  select * into a from public.activities where id = new.activity_id and active;
  if not found then
    raise exception 'Actividad inexistente o inactiva: %', new.activity_id;
  end if;
  new.day := public.user_today(new.user_id);
  new.activity_name := a.name;
  new.points := a.points;
  return new;
end;
$$;

create trigger completions_fill
  before insert on public.completions
  for each row execute function public.completions_fill();

-- Día libre: 1 por semana (lunes a domingo), sábado o domingo. No rompe la racha.
create table public.free_days (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day date not null check (extract(isodow from day) in (6, 7)),
  week_start date generated always as (day - (extract(isodow from day)::int - 1)) stored,
  created_at timestamptz not null default now(),
  primary key (user_id, day),
  unique (user_id, week_start)
);

alter table public.free_days enable row level security;

create policy "Ver mis días libres" on public.free_days
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Elegir día libre" on public.free_days
  for insert to authenticated
  with check ((select auth.uid()) = user_id and day >= public.user_today(user_id));
create policy "Cambiar día libre" on public.free_days
  for delete to authenticated
  using ((select auth.uid()) = user_id and day >= public.user_today(user_id));

-- Canjes de permitidos. Se insertan solo con la función redeem().
create table public.redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('chico', 'grande')),
  cost integer not null,
  created_at timestamptz not null default now()
);

create index redemptions_user_idx on public.redemptions (user_id);

alter table public.redemptions enable row level security;

create policy "Ver mis canjes" on public.redemptions
  for select to authenticated using ((select auth.uid()) = user_id);

-- Billetera del usuario logueado.
create function public.wallet_balance() returns integer
language sql stable security invoker set search_path = '' as $$
  select coalesce((select sum(points) from public.completions where user_id = (select auth.uid())), 0)::int
       - coalesce((select sum(cost) from public.redemptions where user_id = (select auth.uid())), 0)::int;
$$;

-- Canjear: descuenta solo si alcanza. Devuelve la billetera nueva.
create function public.redeem(p_kind text) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_cost integer;
  v_balance integer;
begin
  if v_user is null then
    raise exception 'Hay que iniciar sesión';
  end if;
  v_cost := case p_kind when 'chico' then 5250 when 'grande' then 8500 end;
  if v_cost is null then
    raise exception 'Permitido desconocido: %', p_kind;
  end if;
  -- Evita dos canjes simultáneos con la misma plata.
  perform pg_advisory_xact_lock(hashtext(v_user::text));
  v_balance := coalesce((select sum(points) from public.completions where user_id = v_user), 0)
             - coalesce((select sum(cost) from public.redemptions where user_id = v_user), 0);
  if v_balance < v_cost then
    raise exception 'Te faltan % pts', v_cost - v_balance using errcode = 'P0001';
  end if;
  insert into public.redemptions (user_id, kind, cost) values (v_user, p_kind, v_cost);
  return v_balance - v_cost;
end;
$$;

-- Puntos por día (para la racha, el calendario y el gráfico).
create view public.daily_points with (security_invoker = true) as
  select user_id, day, sum(points)::int as points
  from public.completions
  group by user_id, day;

-- Funciones internas: nadie las llama desde la API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.completions_fill() from public, anon, authenticated;
revoke execute on function public.user_today(uuid) from public, anon;
revoke execute on function public.redeem(text) from public, anon;
revoke execute on function public.wallet_balance() from public, anon;
grant execute on function public.redeem(text) to authenticated;
grant execute on function public.wallet_balance() to authenticated;
grant execute on function public.user_today(uuid) to authenticated;
