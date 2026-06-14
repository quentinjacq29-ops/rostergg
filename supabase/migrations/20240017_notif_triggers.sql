-- ── Trigger : nouvelle demande de duo → notif pour le destinataire ────────────
create or replace function public._on_duo_request_insert()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, type, actor_id, payload)
  values (
    new.to_profile,
    'duo_request',
    new.from_profile,
    jsonb_build_object('requestId', new.id)
  );
  return new;
end;
$$;

drop trigger if exists trg_notify_duo_request on public.duo_requests;
create trigger trg_notify_duo_request
  after insert on public.duo_requests
  for each row
  when (new.status = 'pending')
  execute function public._on_duo_request_insert();

-- ── Trigger : acceptation → notif pour l'émetteur avec Riot ID révélé ─────────
create or replace function public._on_duo_request_accept()
returns trigger language plpgsql security definer
set search_path = public
as $$
declare
  v_conv_id  uuid;
  v_riot_id  text;
begin
  -- ne jouer que sur la transition pending → accepted
  if old.status <> 'pending' or new.status <> 'accepted' then
    return new;
  end if;

  -- conversation créée dans la même transaction par le RPC d'acceptation
  select cm1.conversation_id into v_conv_id
  from public.conversation_members cm1
  join public.conversation_members cm2
    on cm1.conversation_id = cm2.conversation_id
  where cm1.profile_id = new.from_profile
    and cm2.profile_id = new.to_profile
  order by (select created_at from public.conversations where id = cm1.conversation_id) desc
  limit 1;

  -- Riot ID de celui qui accepte (révélé à l'émetteur)
  select ra.game_name || '#' || ra.tag_line into v_riot_id
  from public.riot_accounts ra
  where ra.profile_id = new.to_profile
  limit 1;

  insert into public.notifications (user_id, type, actor_id, payload)
  values (
    new.from_profile,
    'duo_accepted',
    new.to_profile,
    jsonb_build_object(
      'requestId',      new.id,
      'conversationId', v_conv_id,
      'revealedRiotId', v_riot_id
    )
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_duo_accepted on public.duo_requests;
create trigger trg_notify_duo_accepted
  after update on public.duo_requests
  for each row
  execute function public._on_duo_request_accept();
