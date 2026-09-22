-- =========================================================
-- CAMPUSCONNECT — RNSIT PAIRING USN GUARD
-- =========================================================
--
-- Replaces the hash-only redemption RPC.
--
-- A pairing is consumed ONLY when:
--   1. pairing hash is valid
--   2. pairing is unused
--   3. pairing is not revoked
--   4. pairing is not expired
--   5. paired account has a profile
--   6. profile role is Student
--   7. imported Contineo USN matches profile USN
--
-- The comparison normalizes spaces + case.
-- Plaintext pairing code is never sent to PostgreSQL.
-- =========================================================


drop function if exists
public.consume_rnsit_extension_pairing(text);


create or replace function public.consume_rnsit_extension_pairing(
  p_code_hash text,
  p_imported_usn text
)
returns table (
  pairing_id uuid,
  student_id uuid,
  profile_usn text
)
language plpgsql
security definer
set search_path = public
as $$
begin

  -- -------------------------------------------------------
  -- Validate SHA-256 input.
  -- -------------------------------------------------------

  if
    p_code_hash is null
    or length(trim(p_code_hash)) <> 64
    or p_code_hash !~ '^[0-9a-fA-F]{64}$'
  then
    return;
  end if;


  -- -------------------------------------------------------
  -- Imported USN must exist.
  -- -------------------------------------------------------

  if
    p_imported_usn is null
    or length(
      regexp_replace(
        trim(p_imported_usn),
        '\s+',
        '',
        'g'
      )
    ) = 0
  then
    return;
  end if;


  -- -------------------------------------------------------
  -- Atomic consume.
  --
  -- UPDATE executes only if the paired student's profile
  -- is a Student account AND the USN matches.
  --
  -- Because used_at IS NULL is part of the UPDATE
  -- predicate, concurrent requests cannot both redeem
  -- the same pairing.
  -- -------------------------------------------------------

  return query

  update public.rnsit_extension_pairings as pairing

  set
    used_at = now()

  from public.profiles as profile

  where
    pairing.code_hash =
      lower(trim(p_code_hash))

    and pairing.used_at is null

    and pairing.revoked_at is null

    and pairing.expires_at > now()

    and profile.id =
      pairing.student_id

    and profile.role =
      'Student'

    and upper(
      regexp_replace(
        trim(
          coalesce(
            profile.usn,
            ''
          )
        ),
        '\s+',
        '',
        'g'
      )
    ) =
    upper(
      regexp_replace(
        trim(
          p_imported_usn
        ),
        '\s+',
        '',
        'g'
      )
    )

  returning
    pairing.id,
    pairing.student_id,
    profile.usn;

end;
$$;


-- =========================================================
-- PERMISSIONS
-- =========================================================

revoke all
on function public.consume_rnsit_extension_pairing(text, text)
from public;

revoke all
on function public.consume_rnsit_extension_pairing(text, text)
from anon;

revoke all
on function public.consume_rnsit_extension_pairing(text, text)
from authenticated;

grant execute
on function public.consume_rnsit_extension_pairing(text, text)
to service_role;


comment on function
public.consume_rnsit_extension_pairing(text, text)
is
'Atomically consumes a valid RNSIT extension pairing only when the imported Contineo USN belongs to the paired CampusConnect Student profile.';

