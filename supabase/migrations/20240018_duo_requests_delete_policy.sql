-- Annulation d'une demande de duo (Envoyées) : l'expéditeur peut supprimer
-- sa propre demande. Jusqu'ici duo_requests n'avait pas de policy DELETE
-- (RLS activé + select/insert/update-recipient uniquement) → l'annulation
-- était bloquée. On autorise le DELETE par l'émetteur.

create policy "duo_requests_delete_sender" on public.duo_requests
  for delete using (from_profile = auth.uid());
