-- Retourne le total des items "à voir" dans l'inbox :
--   pending_requests  = demandes duo reçues non traitées
--   unread_conv_count = conversations avec au moins 1 message non-lu
create or replace function public.inbox_badge(p_user_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'pending_requests', (
      select count(*)
      from duo_requests
      where to_profile = p_user_id
        and status = 'pending'
    ),
    'unread_conv_count', (
      select count(distinct m.conversation_id)
      from messages m
      join conversation_members cm
        on cm.conversation_id = m.conversation_id
       and cm.profile_id = p_user_id
      where m.sender_id != p_user_id
        and (cm.last_read_at is null or m.created_at > cm.last_read_at)
    )
  )
$$;

grant execute on function public.inbox_badge(uuid) to authenticated;
