-- =========================================================
-- CAMPUSCONNECT — ATOMIC RNSIT PAIRING CONSUMPTION
-- =========================================================
--
-- IMPORTANT:
-- The API supplies only SHA-256(code) to this function.
-- Plaintext pairing secrets never enter this database.
--
-- A pairing succeeds only when:
--   - hash matches
--   - not previously used
--   - not revoked
--   - not expired
--
-- UPDATE ... RETURNING makes redemption atomic.
-- Two concurrent requests cannot both consume the same code.
-- =========================================================


create or replace function public.consume_rnsit_extension_pairing(
  p_code_hash text
)
returns table (
  pairing_id uuid,
  student_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
begin

  if
    p_code_hash is null
    or length(trim(p_code_hash)) <> 64
    or p_code_hash !~ '^[0-9a-fA-F]{64}$'
  then
    return;
  end if;


  return query

  update public.rnsit_extension_pairings as pairing

  set
    used_at = now()

  where
    pairing.code_hash =
      lower(trim(p_code_hash))

    and pairing.used_at is null

    and pairing.revoked_at is null

    and pairing.expires_at > now()

  returning
    pairing.id,
    pairing.student_id;

end;
$$;


-- =========================================================
-- FUNCTION PERMISSIONS
-- =========================================================
--
-- Extension/API clients must NEVER call this RPC directly.
-- Only CampusConnect's trusted server-side service role
-- can redeem a pairing.
-- =========================================================

revoke all
on function public.consume_rnsit_extension_pairing(text)
from public;

revoke all
on function public.consume_rnsit_extension_pairing(text)
from anon;

revoke all
on function public.consume_rnsit_extension_pairing(text)
from authenticated;

grant execute
on function public.consume_rnsit_extension_pairing(text)
to service_role;


comment on function public.consume_rnsit_extension_pairing(text) is
'Atomically consumes one valid, unexpired, non-revoked RNSIT extension pairing by SHA-256 hash. Returns the paired CampusConnect student exactly once.';

