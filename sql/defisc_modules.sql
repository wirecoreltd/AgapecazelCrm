-- À lancer UNE SEULE FOIS dans Supabase > SQL Editor, AVANT de déployer le nouveau code.
-- Sans danger pour l'existant : tous les utilisateurs actuels gardent l'accès PAC uniquement.

-- 1) Modules autorisés par utilisateur (pac, defisc). L'admin a toujours tout (géré dans le code et dans has_module).
alter table public.profiles add column if not exists modules text[] not null default '{pac}';
update public.profiles set modules = '{pac,defisc}' where role = 'admin';

-- 2) Interdit à un utilisateur connecté de modifier ses propres modules depuis le navigateur.
--    Seul l'admin le peut, via /api/admin/* (clé service_role) ou le SQL Editor.
create or replace function public.protect_profile_modules()
returns trigger language plpgsql as $$
begin
  if new.modules is distinct from old.modules and auth.role() in ('authenticated', 'anon') then
    raise exception 'Les modules ne sont modifiables que par un administrateur.';
  end if;
  return new;
end $$;

drop trigger if exists protect_profile_modules on public.profiles;
create trigger protect_profile_modules before update on public.profiles
  for each row execute function public.protect_profile_modules();

-- 3) Fonction utilisée par les règles de sécurité (security definer : évite toute récursion sur profiles)
create or replace function public.has_module(m text)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and (p.role = 'admin' or m = any (p.modules))
  )
$$;

-- 4) Fiches Défiscalisation
create table if not exists public.defisc_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  assigned_to uuid references auth.users(id),
  fichier text,                       -- nom du fichier Excel d'origine (import)

  -- Contact
  civilite text,
  nom text,
  prenom text,
  mobile text,
  fixe text,
  email text,

  -- Rendez-vous
  type_rdv text,                      -- Visio, Présentiel…
  nature text,                        -- IMMO…
  date_rdv date,
  heure_rdv time,
  lieu_rdv text,
  statut text not null default 'a_confirmer'
    check (statut in ('a_confirmer','confirme','effectue','reporte','annule','signe')),

  -- Profil financier (extrait du commentaire à l'import)
  age integer,
  situation_familiale text,
  enfants integer,
  profession text,
  revenus_annuels numeric,
  impots numeric,
  credit_loyer numeric,
  endettement numeric,                -- en %
  epargne numeric,
  capacite_epargne numeric,
  interet text,

  -- Suivi
  commentaire text,                   -- texte brut d'origine, toujours conservé
  verif text,
  notes text
);

create index if not exists defisc_leads_date_idx on public.defisc_leads (date_rdv desc);
create index if not exists defisc_leads_statut_idx on public.defisc_leads (statut);
create index if not exists defisc_leads_mobile_idx on public.defisc_leads (mobile);

create or replace function public.defisc_touch() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists defisc_touch on public.defisc_leads;
create trigger defisc_touch before update on public.defisc_leads
  for each row execute function public.defisc_touch();

-- 5) Sécurité : seuls ceux qui ont le module défisc (et l'admin) accèdent aux fiches
alter table public.defisc_leads enable row level security;

create policy "defisc_select" on public.defisc_leads
  for select to authenticated using (public.has_module('defisc'));
create policy "defisc_insert" on public.defisc_leads
  for insert to authenticated with check (public.has_module('defisc'));
create policy "defisc_update" on public.defisc_leads
  for update to authenticated using (public.has_module('defisc')) with check (public.has_module('defisc'));
create policy "defisc_delete" on public.defisc_leads
  for delete to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
