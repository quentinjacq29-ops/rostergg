-- Migration 20240004 : flux duo_requests → conversation
-- Ajoute conversation_id sur duo_requests, répare la policy conv_members,
-- et crée accept_duo_request() SECURITY DEFINER.

-- 1. Lier la conversation créée lors de l'acceptation
ALTER TABLE public.duo_requests
  ADD COLUMN IF NOT EXISTS conversation_id uuid REFERENCES public.conversations(id);

-- 2. Index pour trouver rapidement les demandes entre deux profils
CREATE INDEX IF NOT EXISTS idx_duo_requests_from  ON public.duo_requests(from_profile);
CREATE INDEX IF NOT EXISTS idx_duo_requests_pair  ON public.duo_requests(from_profile, to_profile);

-- 3. Réparer la policy conv_members : autoriser à voir tous les membres
--    d'une conversation dont on fait partie, sans récursion infinie.
--    La fonction is_conversation_member() tourne en SECURITY DEFINER
--    (= pas de RLS en interne) pour éviter la récursion.

DROP POLICY IF EXISTS "conv_members_select_own" ON public.conversation_members;

CREATE OR REPLACE FUNCTION public.is_conversation_member(p_conv_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_members
    WHERE conversation_id = p_conv_id AND profile_id = auth.uid()
  );
$$;

CREATE POLICY "conv_members_select_participant" ON public.conversation_members
  FOR SELECT USING (public.is_conversation_member(conversation_id));

-- 4. Fonction principale : accepter une demande de duo
--    Atomique : update duo_request + create conversation + insert 2 members.
--    SECURITY DEFINER pour pouvoir insérer les deux membres.
CREATE OR REPLACE FUNCTION public.accept_duo_request(p_request_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_from  uuid;
  v_to    uuid;
  v_conv  uuid;
BEGIN
  -- Valider : la demande existe, est pending, et l'appelant est bien le destinataire
  SELECT from_profile, to_profile
  INTO   v_from, v_to
  FROM   public.duo_requests
  WHERE  id = p_request_id
    AND  status = 'pending'
    AND  to_profile = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found, not pending, or caller is not the recipient';
  END IF;

  -- Créer la conversation
  INSERT INTO public.conversations (type)
  VALUES ('duo')
  RETURNING id INTO v_conv;

  -- Insérer les deux membres (contourne conv_members_insert_own via SECURITY DEFINER)
  INSERT INTO public.conversation_members (conversation_id, profile_id)
  VALUES (v_conv, v_from), (v_conv, v_to);

  -- Mettre à jour la demande
  UPDATE public.duo_requests
  SET    status = 'accepted',
         responded_at = now(),
         conversation_id = v_conv
  WHERE  id = p_request_id;

  RETURN v_conv;
END;
$$;

-- 5. Fonction decline : simple update, mais centralisée pour cohérence
CREATE OR REPLACE FUNCTION public.decline_duo_request(p_request_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.duo_requests
  SET    status = 'declined',
         responded_at = now()
  WHERE  id = p_request_id
    AND  to_profile = auth.uid()
    AND  status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found, not pending, or caller is not the recipient';
  END IF;
END;
$$;
