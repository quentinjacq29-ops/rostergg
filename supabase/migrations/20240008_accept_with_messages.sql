-- Migration 20240008 : accept_duo_request enrichi
-- Ajoute à la transaction d'acceptation :
--   (4) message système "DUO REQUEST ACCEPTED · X% MATCH"
--   (5) mot d'intro de l'expéditeur comme premier vrai message

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
  -- Valider : la demande existe, est pending, et l'appelant est le destinataire
  SELECT from_profile, to_profile, match_score, message
  INTO   v_from, v_to, v_score, v_intro
  FROM   public.duo_requests
  WHERE  id = p_request_id
    AND  status = 'pending'
    AND  to_profile = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found, not pending, or caller is not the recipient';
  END IF;

  -- (1+2) Créer la conversation
  INSERT INTO public.conversations (type)
  VALUES ('duo')
  RETURNING id INTO v_conv;

  -- (3) Insérer les deux membres
  INSERT INTO public.conversation_members (conversation_id, profile_id)
  VALUES (v_conv, v_from), (v_conv, v_to);

  -- (4) Message système "accepté" — sender = accepteur (v_to)
  v_sys_body := 'DUO REQUEST ACCEPTED · ' ||
    CASE WHEN v_score IS NOT NULL THEN v_score::text || '% MATCH' ELSE 'MATCH' END;

  INSERT INTO public.messages (conversation_id, sender_id, body, kind)
  VALUES (v_conv, v_to, v_sys_body, 'system');

  -- (5) Mot d'intro → premier vrai message dans le thread (si présent)
  IF v_intro IS NOT NULL AND length(trim(v_intro)) > 0 THEN
    INSERT INTO public.messages (conversation_id, sender_id, body, kind)
    VALUES (v_conv, v_from, trim(v_intro), 'text');
  END IF;

  -- (1) Mettre à jour la demande
  UPDATE public.duo_requests
  SET    status = 'accepted',
         responded_at = now(),
         conversation_id = v_conv
  WHERE  id = p_request_id;

  RETURN v_conv;
END;
$$;
