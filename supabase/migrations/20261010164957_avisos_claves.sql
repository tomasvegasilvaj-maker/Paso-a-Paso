-- Claves de los avisos sin que pasen por el repo ni por nadie:
-- el secreto del cron se genera al azar acá y el par VAPID lo genera la función avisos la primera vez.
select vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'avisos_cron');

create function public.avisos_guardar_vapid(p_public text, p_private text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from vault.secrets where name = 'vapid_private') then
    raise exception 'Las claves VAPID ya existen';
  end if;
  perform vault.create_secret(p_public, 'vapid_public');
  perform vault.create_secret(p_private, 'vapid_private');
end;
$$;

revoke execute on function public.avisos_guardar_vapid(text, text) from public, anon, authenticated;
grant execute on function public.avisos_guardar_vapid(text, text) to service_role;

-- La clave pública sí la necesita la app para suscribir el dispositivo.
create function public.vapid_public_key() returns text
language sql stable security definer set search_path = '' as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'vapid_public';
$$;

revoke execute on function public.vapid_public_key() from public, anon;
grant execute on function public.vapid_public_key() to authenticated;
