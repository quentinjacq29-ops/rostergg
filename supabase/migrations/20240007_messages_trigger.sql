-- Migration 20240007 : trigger last_message_at + GRANT conversations UPDATE

-- Trigger : maintenir conversations.last_message_at à jour automatiquement
CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_last_message_at ON public.messages;
CREATE TRIGGER trg_last_message_at
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.update_conversation_last_message();

-- Grant UPDATE sur conversations pour authenticated (last_message_at)
GRANT UPDATE ON public.conversations TO authenticated;
