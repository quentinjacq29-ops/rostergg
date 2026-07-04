-- Realtime sur duo_requests : permet à l'émetteur d'être notifié EN DIRECT
-- quand sa demande est acceptée (l'inbox retire la demande des « Envoyées »
-- et ouvre la conversation sans reload). Jusqu'ici seules messages +
-- notifications étaient dans la publication realtime.

alter publication supabase_realtime add table public.duo_requests;
