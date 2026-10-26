-- Latest sign-ins, for the Users tab in /admin.
--
-- last_sign_in_at and the email live in auth.users, which the client can't
-- read. security definer lets this function read them; the is_admin() check
-- inside is what keeps everyone else out (non-admins get zero rows).
--
-- last_sign_in_at moves on an actual login (password or Google), not when a
-- signed-in user just reopens the app — Supabase refreshes the token silently.
create or replace function public.admin_recent_logins(max_rows int default 50)
returns table (
    id uuid,
    name text,
    email text,
    phone text,
    provider text,
    last_sign_in_at timestamptz,
    created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
    select
        a.id,
        u.name::text,
        a.email::text,
        u.phone::text,
        (a.raw_app_meta_data ->> 'provider')::text,
        a.last_sign_in_at,
        a.created_at
    from auth.users a
    left join public.users u on u.id = a.id
    where public.is_admin()
    order by a.last_sign_in_at desc nulls last
    limit least(greatest(max_rows, 1), 200)
$$;

revoke execute on function public.admin_recent_logins(int) from public, anon;
grant execute on function public.admin_recent_logins(int) to authenticated;
