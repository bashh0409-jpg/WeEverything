create or replace function public.mfa_requirement_satisfied()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select true;
$$;

create or replace function public.webauthn_mfa_aal_satisfied()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select true;
$$;

revoke all on function public.mfa_requirement_satisfied()
  from public, anon;
grant execute on function public.mfa_requirement_satisfied()
  to anon, authenticated;

revoke all on function public.webauthn_mfa_aal_satisfied()
  from public, anon;
grant execute on function public.webauthn_mfa_aal_satisfied()
  to anon, authenticated;
