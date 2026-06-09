# AUDIT SLICE D6 + D7 — Flux demande de duo · Chat complet · Bio profil

> Référence : `BACKEND-BRIEF.html` v9, sections D6 et 04  
> Maquettes : `Desktop 13 - Duo request (popin).html`, `Desktop 14 - Inbox duo requests.html`, `Desktop 14 - Inbox chat.html`, `Desktop 13 - My profile edit.html`  
> Code audité : commit `040386d` (Phase 3+4)  
> Date : 2026-06-09  
> Légende : ✅ branché · ⚠️ en dur / absent · ⚪ statique voulu

---

## D6 — Envoi de la demande (Desktop 13, expéditeur)

| Élément | Attendu (brief) | Réel (code) | Statut |
|---|---|---|---|
| Header : cible (name / rank / role / match) | joueur cliqué | `target` prop depuis DuoFeed → branché | ✅ |
| Aperçu "ce que X verra" (CurrentUser) | `GET /me` | `me` prop depuis DuoFeed | ✅ |
| Textarea mot d'intro, optionnel, max 280 | champ `message` | `MAX_MSG=280`, textarea câblé | ✅ |
| 3 suggestions de message | statiques côté front | `SUGGESTIONS[]` hardcodées | ⚪ |
| "Riot ID reste masqué jusqu'à acceptation" | texte fixe | copy statique dans le modal | ⚪ |
| Action : `POST /api/duo/request { to_profile, message, match_score }` | crée `duo_request` status=pending | `/api/duo/request/route.ts` — vérifie doublon, insère | ✅ |
| État SENT après envoi | confirmation + rappel message | `setState('sent')` après `onConfirm()` réussi | ✅ |
| Bouton "Voir l'inbox" en état SENT | navigation vers /inbox | `router.push('/fr/inbox')` | ✅ |

---

## D6 — Réception (Desktop 14, destinataire)

| Élément | Attendu (brief) | Réel (code) | Statut |
|---|---|---|---|
| Liste demandes pending | `GET /me/duo-requests?status=pending` | Supabase server component dans `inbox/page.tsx` | ✅ |
| `fromPlayer` (name / rank / role / match / champs) | objet réel | `normProfile()` extrait riot_accounts + matching_prefs | ✅ |
| Stats LP / WR / POOL (carte décision) | vraies stats de `fromPlayer` | LP direct, WR = wins/(wins+losses) calculé, POOL = flat count | ✅ |
| Mot d'intro affiché | `duo_requests.message` | `r.message` — rendu si non null | ✅ |
| Composer bloqué tant que pending | oui | `RequestDetailPane` → composer verrouillé visuellement + label | ✅ |
| Rail : Riot ID masqué | jusqu'à acceptation | `pendingLabel="RIOT ID MASQUÉ · DEMANDE EN ATTENTE"` | ✅ |
| Eyebrow "N DEMANDES EN ATTENTE · M CONVERSATIONS" | compteurs calculés | `pendingCount` + `convCount` dynamiques | ✅ |
| Accepter → `POST /duo/requests/:id/accept` | RPC SQL atomique | `PATCH /api/duo/respond { action:'accept' }` → `accept_duo_request()` | ✅ |
| Refuser → `POST /duo/requests/:id/decline` | archive silencieuse | `PATCH /api/duo/respond { action:'decline' }` → `decline_duo_request()` | ✅ |

---

## D6 — Transaction d'acceptation

| Élément | Attendu (brief) | Réel (code) | Statut |
|---|---|---|---|
| `duo_request.status = accepted` | atomique SQL | `accept_duo_request()` ✅ | ✅ |
| Création conversation + 2 membres | atomique SQL | `INSERT conversations` + `INSERT conversation_members` ✅ | ✅ |
| **Message système "DUO REQUEST ACCEPTED · X% MATCH"** | inséré en tête de thread | **ABSENT** — `accept_duo_request()` n'insère aucun message dans `messages` | ⚠️ |
| **Mot d'intro → 1er message de la conv** | `duo_requests.message` copié dans `messages` | **ABSENT** — non implémenté dans le RPC SQL | ⚠️ |
| Révélation Riot ID des deux côtés | gameName / tagLine visibles | Implicite : `other.gameName` inclus dans l'objet Conversation — OK | ✅ |
| Composer débloqué chez l'acceptant | immédiat après accept | `router.refresh()` + navigation vers la conv | ✅ |
| **Composer débloqué chez l'émetteur (Realtime)** | push websocket → sa ligne bascule | **ABSENT** — pas de subscribe sur `duo_requests` dans InboxClient | ⚠️ |
| **Notification Realtime à l'émetteur** | "X a accepté ta demande" | **ABSENT** — InboxClient n'écoute que `messages`, pas les changements de statut | ⚠️ |

---

## Chat temps réel (conversation ouverte)

| Élément | Attendu (brief) | Réel (code) | Statut |
|---|---|---|---|
| Fil messages Realtime | Postgres Changes `INSERT messages` | `supabase.channel('messages:convId').on('INSERT')` | ✅ |
| Envoi message (Enter) | insert + trigger `last_message_at` | Insert direct Supabase client + hook SQL existant | ✅ |
| Bulles `me` / `them` stylisées | gradient cyan / fond translucide | Composant `Bubble` fidèle à la maquette | ✅ |
| **Bulle `kind='system'` (accepted)** | verte, pulsante | Composant `Bubble` rend `kind='system'` → **jamais alimenté** | ⚠️ |
| **Bulle `kind='lobby'`** | violette, icône maison | Composant `Bubble` rend `kind='lobby'` → **jamais alimenté** | ⚠️ |
| **Indicateur de frappe** (3 points animés) | Presence websocket per-conversation | **ABSENT** — non implémenté dans InboxClient | ⚠️ |
| **Bouton "Invite to lobby"** | insère message `kind='lobby'` | **ABSENT** — pas de bouton ni d'action dans `ChatPane` | ⚠️ |
| Statut online / offline | `usePresence` global | `onlineIds.has(other.id)` → `StatusDot` | ✅ |
| Rail : rôles interlocuteur → CurrentUser | `other.mainRole → currentUser.mainRole` | `other.mainRole` ✅ mais `lookingFor={null}` hardcodé (ligne 531) pour les convos | ⚠️ |
| Rail : TOP CHAMPIONS | pool par rôle de l'interlocuteur | `firstPool` = premier rôle du `champPool` | ✅ |
| **Rail : "THIS DUO · TONIGHT"** (GAMES / W-L / WR / LP +/-) | `GET /conversations/:id/duo-stats` | **ABSENT** — section entière manquante, endpoint inexistant (bloqué D1) | ⚠️ |
| Actions rail : "Voir profil complet" | lien vers page profil joueur | Absent du `ContextRail` actuel | ⚠️ |
| Actions rail : "Inviter dans l'équipe" | `POST /me/team/invite` | Absent — scope Teams non commencé | ⚠️ |

---

## D7 — Mon profil / édition bio (Desktop 13 - My profile edit)

| Élément | Attendu (brief) | Réel (code) | Statut |
|---|---|---|---|
| **Page /me — maquette v9** | `MyProfileDesktop` 2 colonnes (aperçu live + form) | Vieux scaffold Tailwind — pas la maquette v9 | ⚠️ |
| Colonne gauche : aperçu live (tous les champs) | reflète l'état du formulaire en temps réel | **ABSENT** | ⚠️ |
| **Champ bio éditable** (textarea, max 200 car.) | `profiles.bio` câblé à l'aperçu | **ABSENT** dans la page | ⚠️ |
| **`profiles.bio` colonne** | optionnelle, texte libre | **EXISTE** (`20240009_profiles_bio.sql` appliqué) | ✅ |
| **`PATCH /api/me/profile { bio }`** | persiste la bio | **ABSENT** — route inexistante | ⚠️ |
| Compte Riot (gameName / tag / rang + resync) | lecture branchée, bouton resync | `RiotSyncButton` existant, mais dans la vieille page Tailwind | ✅ (partiel) |
| Rôles "je joue" / "je cherche" éditables | `PATCH matching_prefs` | **ABSENT** | ⚠️ |
| Style de jeu éditables | `PATCH matching_prefs` | **ABSENT** | ⚠️ |
| Langues + vocal obligatoire éditables | `PATCH matching_prefs` | **ABSENT** | ⚠️ |
| Disponibilités (heatmap éditable) | `PATCH matching_prefs` | **ABSENT** | ⚠️ |

---

## Hardcodés introduits hors brief

| Fichier | Ligne | Valeur | Impact |
|---|---|---|---|
| `InboxClient.tsx` | 531 | `lookingFor={null}` hardcodé pour les conversations | Rail affiche `→ —` au lieu du rôle du CurrentUser |
| `InboxClient.tsx` | 184 | `unread = 0` constant | Compteur non-lu toujours à zéro (pas de `last_read_at`) |

---

## Endpoints : plan vs implémentation

| Endpoint | Méthode | Statut | Notes |
|---|---|---|---|
| `/api/duo/request` | POST | ✅ | Existe |
| `/api/duo/respond` | PATCH | ✅ | Existe (accept + decline) |
| Supabase direct — demandes pending | — | ✅ | `inbox/page.tsx` server component |
| Supabase direct — messages + Realtime | — | ✅ | InboxClient |
| **`/api/conversations/:id/duo-stats`** | GET | ⚠️ | À créer — bloqué D1 (match history Riot) |
| **`/api/me/profile`** | PATCH | ⚠️ | À créer — bio + prefs |
| **Realtime subscribe `duo_requests`** | — | ⚠️ | À ajouter dans InboxClient (notif émetteur) |
| **Realtime Broadcast typing** | — | ⚠️ | À ajouter dans InboxClient per-conv |

---

## Propositions (je vois mieux que le brief)

| # | Hypothèse brief | Recommandation | Raison |
|---|---|---|---|
| 1 | Message sys + intro via API route | **Insérer dans `accept_duo_request()` SQL** | Atomique avec la transaction, zéro race condition |
| 2 | `GET /conversations/:id/duo-stats` endpoint HTTP | **`supabase.rpc('get_duo_stats', { conv_id })`** | Plus rapide, RLS natif, évite une route Next.js |
| 3 | Stats "tonight" calculées depuis match history | **Laisser placeholder (`—`) jusqu'à D1** | Impossible sans sync match history Riot |
| 4 | Typing via WebSocket dédié | **Supabase Realtime Broadcast** sur le canal messages existant | Même connexion, ~5 lignes de code |
| 5 | lookingFor de l'autre dans le rail conv | **Passer `currentUserMainRole` au ContextRail** | Le rail montre rôle_autre → rôle_moi, pas rôle_autre → lookingFor_autre |

---

## Résumé post-implémentation (sprint D6 + D7 bio)

1. **Tout implémenté** — migration SQL enrichie (message système + mot d'intro à l'acceptation), Realtime émetteur (`duo_requests`), typing Broadcast per-conv, bouton "Invite to lobby", fix `lookingFor` rail (→ `currentUserRole`), unread réels + mark-read, page `/me` v9, `PATCH /api/me/profile`.
2. **THIS DUO · TONIGHT** — section absente par décision produit (masquer jusqu'à D1 ; apparaîtra automatiquement dès que `duoStats.games > 0`).
3. **Page /me** — scope bio + compte Riot ; rôles/style/langues/dispo = slice dédié.
4. **Build** — TypeScript clean (0 erreur) ; erreurs de build pré-existantes (Google Fonts/Zscaler, conflit `/auth/callback`) hors périmètre de ce sprint.
5. **Prochaine étape** — Page profil joueur public `/players/:id` pour câbler le lien "Voir profil complet" du rail.

---

## Plan d'implémentation

### Passe 1 — Compléter D6

1. **Migration `20240008_accept_with_messages.sql`** : enrichir `accept_duo_request()` — insérer message `kind='system'` ("DUO REQUEST ACCEPTED · {match_score}% MATCH") puis, si `message IS NOT NULL`, un message `kind='text'` avec le mot d'intro et `sender_id = from_profile`
2. **InboxClient** : subscribe Realtime sur `duo_requests` filtré `from_profile=eq.${userId}` + `status=eq.accepted` → migrer la ligne de DEMANDES vers CONVERSATIONS en temps réel
3. **InboxClient** : Realtime Broadcast `typing:{convId}` → indicateur 3 points dans `ChatPane`
4. **ChatPane** : bouton "Invite to lobby" → `supabase.from('messages').insert({ kind:'lobby', body:'${name} created a lobby · RANKED SOLO/DUO' })`
5. **ContextRail** : passer `currentUserRole` (mainRole du user connecté) pour l'affichage → → dans les conversations
6. **THIS DUO · TONIGHT** : afficher tirets (`—`) dans 4 cases, label "STATS BIENTÔT" en attendant D1

### Passe 2 — D7 Bio + page /me

1. **`/api/me/profile/route.ts`** : `PATCH` — `UPDATE profiles SET bio=$1 WHERE id=auth.uid()`
2. **`apps/web/app/[locale]/(app)/me/page.tsx`** : server component qui charge profil + riot + ranks + matching_prefs + champPool
3. **`apps/web/components/me/MeClient.tsx`** : port fidèle de `desktop/me.jsx` (v9) — aperçu live + formulaire d'édition avec bio câblée et `PATCH /api/me/profile` au `onBlur` / debounce
