-- Migration 20240010 : corriger sender_id du message système dans accept_duo_request
-- (v_from → v_to : l'accepteur déclenche l'événement, pas l'émetteur)

CREATE OR REPLACE FUNCTION public.accept_duo_request(p_request_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_from    uuid;
  v_to      uuid;
  v_score   int;
  v_intro   text;
  v_conv    uuid;
  v_sys_body text;
BEGIN
  SELECT from_profile, to_profile, match_score, message
  INTO   v_from, v_to, v_score, v_intro
  FROM   public.duo_requests
  WHERE  id = p_request_id
    AND  status = 'pending'
    AND  to_profile = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found, not pending, or caller is not the recipient';
  END IF;

  INSERT INTO public.conversations (type) VALUES ('duo') RETURNING id INTO v_conv;

  INSERT INTO public.conversation_members (conversation_id, profile_id)
  VALUES (v_conv, v_from), (v_conv, v_to);

  v_sys_body := 'DUO REQUEST ACCEPTED · ' ||
    CASE WHEN v_score IS NOT NULL THEN v_score::text || '% MATCH' ELSE 'MATCH' END;

  -- sender = accepteur (v_to)
  INSERT INTO public.messages (conversation_id, sender_id, body, kind)
  VALUES (v_conv, v_to, v_sys_body, 'system');

  IF v_intro IS NOT NULL AND length(trim(v_intro)) > 0 THEN
    INSERT INTO public.messages (conversation_id, sender_id, body, kind)
    VALUES (v_conv, v_from, trim(v_intro), 'text');
  END IF;

  UPDATE public.duo_requests
  SET    status = 'accepted', responded_at = now(), conversation_id = v_conv
  WHERE  id = p_request_id;

  RETURN v_conv;
END;
$$;
