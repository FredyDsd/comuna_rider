-- ============================================================================
-- COMUNA RIDER JUJUY — ESQUEMA SQL Y POLÍTICAS RLS (SUPABASE)
-- Ejecutar este script en el SQL Editor de Supabase:
-- https://app.supabase.com -> SQL Editor -> New Query
-- ============================================================================

-- Extensión para UUIDs
create extension if not exists "pgcrypto";

-- ============================================================================
-- 1. TABLA: profiles (Roles de USUARIOS.md)
-- Niveles:
--   Nivel 1 (No registrado): 'visitante' (solo lectura, sin fila o anónimo)
--   Nivel 2 (Registrado base): 'cadete_verificado' (escribe alertas y turnos)
--   Nivel 3 (Vendedor): 'cadete_emprendedor' (publica en Mercado Cadete)
--   Nivel 4 (Dueño/Mod): 'admin' (modera alertas, turnos, mercado y usuarios)
-- ============================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text not null default 'Cadete Jujuy',
  role text not null default 'cadete_verificado'
    check (role in ('visitante', 'cadete_verificado', 'cadete_emprendedor', 'admin')),
  vehicle text not null default 'Moto'
    check (vehicle in ('Moto', 'Bici')),
  zone text not null default 'Centro',
  status text not null default 'online'
    check (status in ('online', 'paused')),
  score integer not null default 98,
  is_banned boolean not null default false,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Políticas RLS para profiles
drop policy if exists "Perfiles visibles para todos" on public.profiles;
create policy "Perfiles visibles para todos"
  on public.profiles for select
  using (true);

drop policy if exists "Usuario puede crear su propio perfil" on public.profiles;
create policy "Usuario puede crear su propio perfil"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "Usuario o admin puede actualizar perfil" on public.profiles;
create policy "Usuario o admin puede actualizar perfil"
  on public.profiles for update
  to authenticated
  using (
    auth.uid() = id
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    auth.uid() = id
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Trigger automático para crear perfil Nivel 2 ('cadete_verificado') al registrarse en Supabase Auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role, vehicle, zone)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1), 'Cadete Jujuy'),
    coalesce(new.raw_user_meta_data->>'role', 'cadete_verificado'),
    coalesce(new.raw_user_meta_data->>'vehicle', 'Moto'),
    coalesce(new.raw_user_meta_data->>'zone', 'Centro')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================================
-- 2. TABLA: alerts (Pines de Alerta en el Mapa de Jujuy)
-- Trazabilidad obligatoria: vinculada a user_id de Supabase Auth
-- ============================================================================
create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  author_name text not null default 'Cadete Verificado',
  vehicle text not null default 'Moto',
  type text not null default 'critical'
    check (type in ('critical', 'warning', 'weather', 'security', 'sos')),
  category text not null default 'gruas'
    check (category in ('gruas', 'lluvia', 'cuponeros', 'gomeria', 'sos')),
  badge text not null default 'Crítica • Control Policial',
  title text not null,
  description text not null,
  zone text not null default 'Centro',
  lat double precision default -24.1858,
  lng double precision default -65.2995,
  confirm_count integer not null default 1,
  verified boolean not null default true,
  extra text,
  created_at timestamptz not null default now()
);

alter table public.alerts enable row level security;

-- Políticas RLS para alerts
-- Nivel 1 (Visitante) y todos pueden leer el mapa
drop policy if exists "Alertas visibles para todos (incluyendo visitantes)" on public.alerts;
create policy "Alertas visibles para todos (incluyendo visitantes)"
  on public.alerts for select
  using (true);

-- Solo usuarios autenticados Nivel 2+ no baneados pueden crear alertas con su user_id
drop policy if exists "Solo cadetes verificados crean alertas" on public.alerts;
create policy "Solo cadetes verificados crean alertas"
  on public.alerts for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.is_banned = false
        and p.role in ('cadete_verificado', 'cadete_emprendedor', 'admin')
    )
  );

-- Usuarios autenticados pueden confirmar alertas (actualizar confirm_count)
drop policy if exists "Cadetes registrados pueden actualizar confirmaciones" on public.alerts;
create policy "Cadetes registrados pueden actualizar confirmaciones"
  on public.alerts for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_banned = false
    )
  );

-- Autor de la alerta o Administrador puede borrar alertas
drop policy if exists "Autor o admin puede borrar alerta" on public.alerts;
create policy "Autor o admin puede borrar alerta"
  on public.alerts for delete
  to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- ============================================================================
-- 3. TABLA: shifts (Tablón Comunitario de Turnos)
-- ============================================================================
create table if not exists public.shifts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  cadete_name text not null,
  cadete_score text not null default 'Score 98% • Cadete Verificado',
  avatar_url text,
  day_id text not null default 'vie24',
  type text not null default 'suelto'
    check (type in ('suelto', 'permuto', 'urgente')),
  type_badge text not null default 'Suelto / Cedo libre',
  time_range text not null,
  period text not null default '(Turno Jujuy)',
  zone text not null default 'Centro',
  detail text not null default '• San Salvador de Jujuy',
  high_demand boolean not null default false,
  taken_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.shifts enable row level security;

-- Políticas RLS para shifts
-- Nivel 1 (Visitante) y todos pueden ver el tablón de turnos
drop policy if exists "Turnos visibles para todos" on public.shifts;
create policy "Turnos visibles para todos"
  on public.shifts for select
  using (true);

-- Solo usuarios autenticados Nivel 2+ pueden publicar turnos vinculados a su user_id
drop policy if exists "Solo cadetes verificados publican turnos" on public.shifts;
create policy "Solo cadetes verificados publican turnos"
  on public.shifts for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.is_banned = false
        and p.role in ('cadete_verificado', 'cadete_emprendedor', 'admin')
    )
  );

-- Cadetes verificados pueden tomar un turno o editar el propio
drop policy if exists "Cadetes verificados pueden tomar o actualizar turnos" on public.shifts;
create policy "Cadetes verificados pueden tomar o actualizar turnos"
  on public.shifts for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.is_banned = false
        and p.role in ('cadete_verificado', 'cadete_emprendedor', 'admin')
    )
  );

-- Autor del turno o Administrador puede borrar el turno (Criterio PRUEBAS.md Fase 4)
drop policy if exists "Autor o admin puede borrar turno" on public.shifts;
create policy "Autor o admin puede borrar turno"
  on public.shifts for delete
  to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- ============================================================================
-- 4. TABLA: directory_items (Directorio Local Jujuy + Mercado Cadete)
-- ============================================================================
create table if not exists public.directory_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  section text not null default 'servicios'
    check (section in ('servicios', 'locales', 'feria')),
  category text not null default 'gomerias'
    check (category in ('gomerias', 'mecanica', 'locales', 'feria')),
  title text not null,
  subtitle text,
  badge text,
  address text,
  zone text not null default 'Centro',
  distance text,
  discount text,
  phone text,
  whatsapp text,
  price text,
  seller_name text,
  seller_verified boolean not null default false,
  image_url text,
  icon text not null default 'tire_repair',
  created_at timestamptz not null default now()
);

alter table public.directory_items enable row level security;

-- Políticas RLS para directory_items
-- Todos pueden leer el directorio y el mercado
drop policy if exists "Directorio y mercado visible para todos" on public.directory_items;
create policy "Directorio y mercado visible para todos"
  on public.directory_items for select
  using (true);

-- Solo Nivel 3 ('cadete_emprendedor') o 'admin' pueden publicar en el Mercado Cadete
drop policy if exists "Cadete Emprendedor o Admin publica en Mercado" on public.directory_items;
create policy "Cadete Emprendedor o Admin publica en Mercado"
  on public.directory_items for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.is_banned = false
        and p.role in ('cadete_emprendedor', 'admin')
    )
  );

-- Autor de la publicación o Admin puede editar/borrar en el mercado
drop policy if exists "Autor o admin actualiza item de directorio" on public.directory_items;
create policy "Autor o admin actualiza item de directorio"
  on public.directory_items for update
  to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "Autor o admin borra item de directorio" on public.directory_items;
create policy "Autor o admin borra item de directorio"
  on public.directory_items for delete
  to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

