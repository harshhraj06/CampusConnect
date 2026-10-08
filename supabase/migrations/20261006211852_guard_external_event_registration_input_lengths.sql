alter table public.external_event_registrations
  drop constraint if exists
    external_event_registration_full_name_length_check;

alter table public.external_event_registrations
  add constraint
    external_event_registration_full_name_length_check
  check (
    char_length(btrim(full_name))
      between 2 and 120
  );

alter table public.external_event_registrations
  drop constraint if exists
    external_event_registration_email_length_check;

alter table public.external_event_registrations
  add constraint
    external_event_registration_email_length_check
  check (
    char_length(btrim(email))
      between 3 and 254
  );

alter table public.external_event_registrations
  drop constraint if exists
    external_event_registration_phone_length_check;

alter table public.external_event_registrations
  add constraint
    external_event_registration_phone_length_check
  check (
    char_length(btrim(phone))
      between 10 and 16
  );

alter table public.external_event_registrations
  drop constraint if exists
    external_event_registration_college_name_length_check;

alter table public.external_event_registrations
  add constraint
    external_event_registration_college_name_length_check
  check (
    char_length(btrim(college_name))
      between 2 and 180
  );

alter table public.external_event_registrations
  drop constraint if exists
    external_event_registration_department_length_check;

alter table public.external_event_registrations
  add constraint
    external_event_registration_department_length_check
  check (
    char_length(btrim(department))
      <= 120
  );

alter table public.external_event_registrations
  drop constraint if exists
    external_event_registration_graduation_year_length_check;

alter table public.external_event_registrations
  add constraint
    external_event_registration_graduation_year_length_check
  check (
    char_length(btrim(graduation_year))
      <= 32
  );

notify pgrst, 'reload schema';
