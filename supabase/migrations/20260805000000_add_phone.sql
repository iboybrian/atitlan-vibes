-- Phone number collected on the email/password sign-up form (src/pages/Auth.jsx).
-- Google sign-ups never see that form, so this stays null for them.
alter table public.users
    add column if not exists phone text;

-- Same trigger as before, plus phone. It arrives as raw_user_meta_data->>'phone'
-- because signUp() has no session yet with email confirmation on — the client
-- cannot insert into public.users itself.
create or replace function public.handle_new_user()
    returns trigger
    language plpgsql
    security definer
    set search_path = public
as $$
begin
  insert into public.users (id, email, name, phone)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'User'),
    new.raw_user_meta_data->>'phone'
  );
  return new;
end;
$$;
