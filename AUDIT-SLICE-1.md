# AUDIT-SLICE-1 — Onboarding + Feed Duo
> Source de vérité : `handoff/BACKEND-BRIEF.html` · `desktop/duo.jsx` (annotations ⚠)  
> Périmètre : §00 Modèle global · §01 Shell/sidebar · §02 Duo feed · §12 Onboarding  
> Légende : ✅ branché · ⚠️ factice/en dur · ⚪ statique voulu

---

## §00 — Modèle de données global (entités partagées)

### CurrentUser — le joueur connecté
| Champ | Exemple maquette | Source brief | État réel |
|-------|-----------------|--------------|-----------|
| summonerName | VYRELL | `GET /me` — Riot summoner | ✅ `riot_accounts.game_name` |
| tag / region | #EUW | Riot tagLine | ✅ `riot_accounts.tag_line` |
| rank / tier / lp | DIAMOND II · 78 LP | league soloDuo | ✅ `ranks` (RANKED_SOLO_5x5) |
| roles[] / looking[] | MID → JNG | profil (onboarding) | ✅ `matching_prefs.main_roles + looking_for_roles` |
| style[] / langs[] | Tryhard, Roaming… | profil | ✅ `matching_prefs.playstyles + languages` |
| champPool[] | ahri, zed, vex… | maîtrise Riot | ✅ `champion_mastery` |
| availability | grille 7j | profil | ✅ `availability` table |
| queue | IN QUEUE 02:14 | `GET /me/queue` (live) | ⚠️ hardcodé |

### DuoMatch — un autre joueur proposé
| Champ | Source brief | État réel |
|-------|--------------|-----------|
| init | dérivé de `name` (2 lettres) | ✅ calculé côté front |
| name | riot summonerName | ✅ `riot_accounts.game_name` |
| tag | riot tagLine / region | ✅ `riot_accounts.tag_line` |
| match | COMPATIBILITY ENGINE | ✅ `duo_feed` RPC |
| role | rôle main | ✅ `matching_prefs.main_roles[0]` |
| looking | préférence de recherche | ✅ `matching_prefs.looking_for_roles[0]` |
| rank / tier / lp | league soloDuo | ✅ `ranks` table |
| state | présence live (queue/online/offline) | ⚠️ tous "online" |
| champs[] | top champions ce split | ✅ `champion_mastery` |
| style[] | tags onboarding | ✅ `matching_prefs.playstyles` |
| wr | stats split soloDuo | ✅ calculé depuis `ranks.wins/(wins+losses)` |
| kda | stats split soloDuo | ⚠️ affiche "—" (nécessite match history Riot) |
| games | nb parties ranked | ⚠️ non en base |
| langs[] | profil joueur | ✅ `matching_prefs.languages` |
| pitch | bio écrite par le joueur | ⚠️ `profiles.bio` existe mais non rempli |
| synergy | `{ roleFit, eloRange, schedule, languages }` | ✅ `elo_score, schedule_score, language_score, style_score` du RPC |
| availability | grille 7j pour heatmap | ✅ `availability` table (chargé lazily) |

---

## §01 — Shell / Sidebar

**Source brief :** `desktop/shell.jsx` — présent sur tous les écrans

| Élément | Donnée maquette | Source brief | État réel |
|---------|----------------|--------------|-----------|
| User chip — nom | VYRELL | `GET /me` | ✅ `riot_accounts.game_name` → `profiles.display_name` |
| User chip — rang/LP | DIAMOND II · 78 LP | `GET /me` — league soloDuo | ✅ `ranks` (via AppLayout SSR) |
| Widget IN QUEUE — timer | 02:14 | `GET /me/queue` → `elapsedSec` | ⚠️ hardcodé |
| Widget IN QUEUE — barre (64%) | fixe | `elapsedSec / etaSec` | ⚠️ hardcodé |
| Widget IN QUEUE — "EST. 0:48" | fixe | `GET /me/queue` → `etaSec` | ⚠️ hardcodé. Masquer si `inQueue === false` |
| Badge Inbox (5) | 5 non-lus | `/me/inbox/unread` | ⚠️ hardcodé (5 en dur dans AppShell) |
| Badge Training "NEW" | NEW | — | ⚪ statique voulu |

**⚠ Hardcodés identifiés dans le brief :**
- Compte + queue = le joueur connecté, pas une friendlist
- Timer 02:14 et barre 64% sont fixes → brancher `elapsedSec` / `etaSec`
- Masquer le widget queue si `inQueue === false`

---

## §02 — Duo · Feed de matching

**Source brief :** `GET /me/duo-matches` → `[DuoMatch]` trié par `match` desc  
**Implémentation réelle :** `supabase.rpc('duo_feed', params)` ← **meilleure approche** (voir §Écarts)

### Feed / liste

| Élément | Champ brief | État réel |
|---------|-------------|-----------|
| Anneau % (feed) | `match` — compatibility engine | ✅ `score` du RPC |
| Pseudo / tag | `name` / `tag` | ✅ `game_name` / `tag_line` |
| Elo / LP | `rank + tier + lp` | ✅ `ranks` table |
| Statut | `state` (queue/online/offline) | ⚠️ tous "online" — pas de présence live |
| Rôles main → looking | `role` / `looking` | ✅ `matching_prefs` |
| Compteur "N MATCHES" | longueur liste | ✅ `fitItems.length` |
| "TRIÉS PAR %" | ordre de tri | ⚪ statique — le tri est bien score DESC |
| Filtres — chips retirables | query params `duo-matches` | ✅ state React → re-déclenche le RPC |

### Panneau détail

| Élément | Champ brief | État réel |
|---------|-------------|-----------|
| Anneau % (104px) | `match` | ✅ même `score` |
| WHY YOU TWO CLICK — Role fit | `synergy.roleFit { value, note }` | ✅ filtre binaire → 100 si pass, 0 si dégradé · note = `role_note` du RPC |
| WHY YOU TWO CLICK — Elo range | `synergy.eloRange { value, note }` | ✅ `elo_score` + `elo_note` |
| WHY YOU TWO CLICK — Schedule | `synergy.schedule { value, note }` | ✅ `schedule_score` + `schedule_note` |
| WHY YOU TWO CLICK — Languages | `synergy.languages { value, note }` | ✅ `language_score` + `language_note` |
| Win rate (WR) | `wr` — stats soloDuo | ✅ `ranks.wins / (wins+losses) × 100` |
| KDA | `kda` — stats soloDuo | ⚠️ affiche "—" — nécessite match history Riot |
| Champion pool | `champs[]` ddragon, [0]=main | ✅ `champion_mastery`, images Data Dragon |
| Playstyle tags | `style[]` | ✅ `matching_prefs.playstyles` |
| Games | `games` | ⚠️ non en base — nécessite match history |
| Pitch / bio | `pitch` | ⚠️ `profiles.bio` existe mais non rempli à l'onboarding |
| Heatmap AVAILABILITY | `p.availability` (grille 7j) | ✅ `availability` table (chargé lazily) |
| "N ONLINE" (topbar) | `GET /stats/online` | ⚠️ affiche `items.length` (nb résultats feed, pas connectés réels) |
| Bouton "Voir profil complet" | `GET /players/:id` | ⚪ UI présente, non navigable — Phase suivante |
| Bouton "Send duo request" | `POST /duo-requests` | ⚠️ UI présente, non branché — tables existent |
| Bouton "Message" | `POST /conversations` | ⚠️ UI présente, non branché — tables existent |

**⚠ Hardcodés identifiés dans le brief + `desktop/duo.jsx` :**
- 4 barres "WHY YOU TWO CLICK" : valeurs de démo → renvoyer `synergy { roleFit, eloRange, schedule, languages }` **→ résolu** par le RPC
- Heatmap AVAILABILITY : grille fixe **→ résolu** (table `availability`)
- "247 ONLINE" : compteur fixe → `GET /stats/online` **→ non résolu**

---

## §12 — Onboarding (wizard Riot)

**Source brief :** wizard 8 étapes. Pivot : étape 1 = lier le Riot ID → étapes suivantes pré-remplies

| Étape | Élément | Source brief | État réel |
|-------|---------|--------------|-----------|
| 1 — Riot ID | Liaison compte | `POST /auth/riot` | ✅ `/api/riot/link` + `/api/riot/verify` + `/api/riot/sync` |
| 1 — Riot ID | Import rang | league soloDuo | ✅ `ranks` table via `sync-ranks` Edge Function |
| 1 — Riot ID | Import mastery | champion mastery | ✅ `champion_mastery` table |
| 2 — Intent | Choix duo/team/coaching | `POST /me/profile` | ✅ détermine wizard + redirect finale |
| 3 — Langues | Saisie langues | `POST /me/profile` | ✅ `matching_prefs.languages` |
| 4 — Rôle main | **Pré-remplissage "Détecté via Riot"** | rôle le plus joué | ⚠️ bandeau UI présent mais **calcul automatique absent** — l'utilisateur sélectionne manuellement |
| 5 — Champion pool | **Pré-remplissage par rôle** | mastery par rôle | ⚠️ pool affiché en liste plate — **séparation par rôle absente** |
| 6 — Playstyle | Saisie style/goals | `POST /me/profile` | ✅ `matching_prefs.playstyles + goals` |
| 7 — Disponibilités | Grille 7j | `POST /me/profile` | ✅ `availability` (weekday × slot × intensity) |
| 8 — Riot ID (fin) | Confirmation sync | affichage données Riot | ✅ données déjà importées étape 1 |
| Fin | Redirect selon intent | — | ✅ `duo→/duo` · `team→/teams` · `coach→/training` |

**⚠ Hardcodés identifiés dans le brief :**
- Pré-remplissages "Détecté depuis Riot" (MID détecté, pools importés) simulés → doivent venir de l'import Riot
- Pools de champions par rôle (POOLS) = constantes → nécessite mapping champion→rôle via `champions` table

---

## Endpoints : brief vs réalité

| Brief (hypothèse) | Code réel | Statut |
|-------------------|-----------|--------|
| `POST /auth/riot` | `/api/riot/link` + `/api/riot/verify` + `/api/riot/sync` | ✅ Découpé en 3 routes (link/verify/sync) |
| `GET /me` | Requêtes Supabase directes (pas de route dédiée) | ✅ Meilleure approche avec SSR |
| `GET /me/duo-matches?filters=…` | `supabase.rpc('duo_feed', params)` | ✅ **Meilleure implémentation** — RPC SQL, calcul Postgres, une requête |
| `GET /me/queue` | — | ❌ Absent — widget queue hardcodé |
| `GET /stats/online` | — | ❌ Absent — "N ONLINE" hardcodé |
| `POST /me/profile` | `/api/onboarding` | ✅ Existe |
| `PATCH /me/profile` | — | ❌ Absent — /me est lecture seule |

---

## Écarts où l'implémentation est meilleure que le brief

**1. `duo_feed` RPC SQL** au lieu de `GET /me/duo-matches`  
Le brief proposait une route REST calculant les scores côté serveur Node. À la place : fonction PostgreSQL qui calcule, filtre, trie et pagine en une requête. Plus rapide (pas de round-trip), scalable, le détail par axe (elo_score, schedule_score, etc.) est renvoyé nativement.

**2. Supabase direct** au lieu de routes `/me` custom  
Profil, ranks, mastery consommés via requêtes Supabase directes (SSR server components + client SDK). Évite des routes REST intermédiaires.

---

## 7 Décisions produit requises

| # | Point | Options |
|---|-------|---------|
| **D1** | **KDA + games** — match history Riot, coûteux en quota | A) Implémenter (cron sync) · B) Retirer la box KDA · C) Garder "—" acceptable |
| **D2** | **Présence live** (online/queue/offline) — tous "online" actuellement | A) Supabase Realtime Presence (heartbeat JS) · B) `last_seen_at` updated/60s · C) Spectator API pour "en partie" |
| **D3** | **"N ONLINE" counter** topbar | A) `COUNT(*) WHERE last_seen_at > now() - '5 min'` · B) Supabase Presence channel global |
| **D4** | **Pré-remplissage rôle par mastery** — mapping champion→rôle requis | A) Calculer via `champions.roles` automatiquement · B) L'user confirme manuellement (actuel) |
| **D5** | **Champion pool par rôle** — liste plate actuellement | Dépend D4 : si A → séparer par rôle · si B → reste plat |
| **D6** | **duo_requests + messaging** — boutons UI sans effet | Tables existent (`duo_requests`, `conversations`, `messages`) — à planifier |
| **D7** | **Pitch/bio** — champ en DB jamais rempli | A) Étape dans l'onboarding · B) Optionnel via /me édition · C) Retirer de l'UI |

---

## Récapitulatif global

| Catégorie | Nombre |
|-----------|--------|
| ✅ Branchés sur vraie source | 22 |
| ⚠️ Factices / en dur | 9 |
| ⚪ Statiques voulus | 3 |
| ❌ Endpoints manquants | 3 (`/me/queue`, `/stats/online`, `PATCH /me/profile`) |
| Décisions produit | 7 |

**Priorité recommandée :** D6 (duo_requests = CTA principal sans effet) → D2/D3 (présence + online counter) → D4/D5 (pré-remplissage Riot) → D7 (bio) → D1 (KDA, scope large)
