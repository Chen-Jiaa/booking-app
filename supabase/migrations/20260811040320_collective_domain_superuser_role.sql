create or replace function public.sync_user_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  insert into public.profiles (id, email, role)
  values (
    new.id,
    new.email,
    case
      when lower(coalesce(new.email, '')) like '%@collective.my' then 'superUser'
      else 'user'
    end
  )
  on conflict (id) do update
  set
    email = excluded.email,
    role = case
      when lower(coalesce(excluded.email, '')) like '%@collective.my'
        and (public.profiles.role is null or public.profiles.role = 'user')
        then 'superUser'
      else public.profiles.role
    end;

  return new;
end;
$function$;
