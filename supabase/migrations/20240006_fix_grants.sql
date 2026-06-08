-- Migration 20240006 : GRANTs manquants sur les tables publiques
-- profiles.SELECT était absent pour authenticated — bloquait toutes les queries client-side

GRANT SELECT, INSERT, UPDATE ON public.profiles         TO authenticated;
GRANT SELECT                  ON public.profiles         TO anon;
GRANT SELECT                  ON public.matching_prefs   TO anon;
GRANT SELECT, INSERT, UPDATE  ON public.availability     TO anon;
GRANT SELECT                  ON public.duo_requests      TO authenticated;
GRANT INSERT                  ON public.duo_requests      TO authenticated;
GRANT UPDATE                  ON public.duo_requests      TO authenticated;
GRANT SELECT                  ON public.conversations     TO authenticated;
GRANT INSERT                  ON public.conversations     TO authenticated;
GRANT SELECT                  ON public.conversation_members TO authenticated;
GRANT INSERT                  ON public.conversation_members TO authenticated;
GRANT SELECT                  ON public.messages         TO authenticated;
GRANT INSERT                  ON public.messages         TO authenticated;
