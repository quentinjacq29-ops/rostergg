# AUDIT-REPORT — v15 Onboarding + v14 Overlay Integration

Status codes: ✓ branché · ⚠ encore en dur · ○ statique voulu

---

## v15 — Onboarding CHANGEMENT 1 · Suppression étape Style de jeu

| Élément | Status | Notes |
|---|---|---|
| `ONB_STEPS_V2` (7 étapes, sans Style de jeu) | ✓ | `lib/constants.ts` — `ONB_STEPS` 8 items conservé pour TEAM |
| `[step]/page.tsx` — max guard `n > 7` | ✓ | Redirige `/onboarding/1` si hors range |
| `[step]/page.tsx` — `case 7: OnbStep7Availability` | ✓ | Ancien case 8 rebranché au 7 |
| `OnbShell.tsx` — `step < total` dynamique | ✓ | Plus de hardcode `< 8` |
| `OnbStep7Availability.tsx` — `step: 7` dans l'API call | ✓ | Était `step: 8` |
| `/api/onboarding` — `case 7` (style/goals) SUPPRIMÉ | ✓ | Seule la table `availability` est écrite au case 7 |
| TEAM wizard — inchangé | ✓ | `TeamWizard.tsx` passe `steps` override → pas affecté |
| `OnbStep6Style.tsx` | ○ | Code mort (non importé) — supprimer lors du prochain cleanup |

## v15 — Onboarding CHANGEMENT 2 · Pseudo public en step 1

| Élément | Status | Notes |
|---|---|---|
| `GET /api/auth/pseudo-suggestion?seed=<gameName>` | ✓ | Adjectif+nom, seed-based, vérifie unicité Supabase |
| `POST /api/auth/check-pseudo` | ✓ | Charset · profanité · proximity Levenshtein · unicité |
| Normalisation (NFD + strip accents + lowercase) | ✓ | `check-pseudo/route.ts` |
| Levenshtein distance + seuil adaptatif 20% | ✓ | `isTooClose()` — substring + distance |
| `OnbStep1Riot.tsx` — état `displayName` + `pseudoState` | ✓ | `'idle' \| 'checking' \| 'valid' \| 'error'` |
| Fetch suggestion dès vérif Riot | ✓ | `useEffect` sur `verified?.gameName` |
| Debounce 350ms validation live | ✓ | `debounceRef` + `checkPseudo()` |
| Re-roll button | ✓ | Nouveau `fetchSuggestion(verified.gameName)` |
| Carte PRIVÉE (gameName#tagLine + rang + pool) | ✓ | Badge "PRIVÉ · VISIBLE DE TOI SEUL" |
| `continueDisabled` — bloqué si `pseudoState !== 'valid'` | ✓ | |
| Message footer "CHOISIS UN PSEUDO DISTINCT..." | ✓ | Affiché si `pseudoState === 'error'` |
| Suggestions alternatives si pseudo pris | ✓ | Boutons cliquables pour pré-remplir |
| `/api/onboarding case 1` — persiste `display_name` | ✓ | `profiles.display_name` |
| Titre step 1 — "TON COMPTE & TON PSEUDO" | ✓ | |
| Règle R — `riotId` PRIVÉ, displayName PUBLIC | ✓ | Voir section R ci-dessous |

---

## Section 14 — Notifications (NotificationsPanel)

| Élément | Status | Notes |
|---|---|---|
| Fetch `/api/me/notifications` | ✓ | On mount, returns list + unread_count |
| Badge rouge temps réel | ✓ | Realtime `postgres_changes` dans DTopBar |
| Marquer lu (1 notif) | ✓ | POST `/api/me/notifications/:id/read` |
| Tout marquer lu | ✓ | POST `/api/me/notifications/read-all` |
| Bouton ACCEPTER duo_request | ✓ | POST `/api/duo/requests/:id/accept` |
| Bouton IGNORER duo_request | ✓ | POST `/api/duo/requests/:id/decline` |
| Bouton REJOINDRE team_invite | ✓ | POST `/api/me/team/invitations/:id/accept` |
| Riot ID révélé (duo_accepted) | ✓ | payload.revealedRiotId affiché dans meta |
| Timestamp relatif | ✓ | relTime() : s / min / h / j |
| Couleurs par type | ✓ | cyan=request, live=accepted, violet=team |
| Déclencheur SQL (insert) | ✓ | `_on_duo_request_insert()` trigger |
| Déclencheur SQL (accept) | ✓ | `_on_duo_request_accept()` trigger + riotId payload |

---

## Section 15 — Recherche (SearchPalette)

| Élément | Status | Notes |
|---|---|---|
| Input debounce 200ms | ✓ | |
| Fetch `/api/search?q=` | ✓ | |
| Résultats JOUEURS | ✓ | profiles + riot_accounts fusionnés |
| Résultats ÉQUIPES | ✓ | |
| Résultats CHAMPIONS | ✓ | CHAMPIONS_STATIC statique |
| Navigation ↑↓ ↵ | ✓ | |
| Fermer ESC / scrim | ✓ | |
| Shortcut ⌘K | ✓ | DTopBar useEffect |
| Route joueur /u/:gameName/:platform | ✓ | |

---

## Section 16 — Menu More (MoreMenu)

| Élément | Status | Notes |
|---|---|---|
| Sauvegarder / retirer | ✓ | POST/DELETE `/api/me/bookmarks` |
| Partager le profil | ✓ | navigator.share ou clipboard |
| Copier Riot ID — gaté | ✓ | `riotId: null` si duo non accepté → item désactivé |
| Copier Riot ID — révélé | ✓ | Affiche `gameName#tagLine`, copie clipboard |
| Bloquer | ✓ | confirm() → POST `/api/me/blocks` |
| Signaler → ReportModal | ✓ | setOpen('report') dans DTopBar |
| Toast feedback | ✓ | 2s auto-dismiss |

---

## Section 17 — Signalement (ReportModal)

| Élément | Status | Notes |
|---|---|---|
| 6 motifs radio | ✓ | toxic, cheat, boost, imperso, spam, other |
| Textarea détails (opt, max 500) | ✓ | |
| Soumettre POST `/api/report` | ✓ | VALID_REASONS côté serveur |
| État succès | ✓ | Remplace form, fermer manuel |
| Gestion erreur serveur | ✓ | Affichage inline |
| Scrim + fermer | ✓ | |

---

## Section 18 — Réglages (SettingsPage)

| Élément | Status | Notes |
|---|---|---|
| Sous-nav 5 onglets | ✓ | Compte / Notifs / Confidentialité / Bloqués / Langue |
| Pseudo public (PATCH `/api/me/settings`) | ✓ | |
| Email affiché | ○ | Statique (lecture seule, pas d'edit email) |
| Compte Riot — afficher / délier | ✓ | DELETE `/api/me/riot/unlink` |
| Zone dangereuse (supprimer compte) | ⚠ | UI présente, route non implémentée |
| Notifications in-app / email par type | ✓ | PATCH `/api/me/settings/notifications` |
| Profil visible (discoverable) | ✓ | PATCH `/api/me/settings` |
| Statut en ligne | ✓ | PATCH `/api/me/settings` |
| Accepter demandes de tous | ✓ | PATCH `/api/me/settings` |
| Liste bloqués + débloquer | ✓ | DELETE `/api/me/blocks/:id` |
| Changement de langue | ✓ | router.push `/:code/settings` |
| **Bouton Se déconnecter** | ✓ | `supabase.auth.signOut()` → redirect `/login` · bas de la sub-nav |

---

## Section R — Riot Identity (règle critique)

| Règle | Status | Notes |
|---|---|---|
| displayName = pseudo public partout | ✓ | profile.display_name affiché dans toute l'UI |
| riotId = privé par défaut | ✓ | server retourne `null` si duo non accepté |
| riotId révélé UNIQUEMENT à l'acceptation | ✓ | trigger `_on_duo_request_accept` + payload.revealedRiotId |
| "Copier Riot ID" conditionnel dans MoreMenu | ✓ | item désactivé si `riotId === null` |
| ProfilePage: revealedRiotId server-side | ✓ | Vérifie `duo_requests.status = accepted` |

---

## v15 — Intégration overlays globale (DTopBar dans AppShell)

| Élément | Status | Notes |
|---|---|---|
| DTopBar global dans `AppShell` (route-aware) | ✓ | `/duo` `/teams` `/training` `/inbox` `/me` `/settings` |
| Skip DTopBar pour `/u/` (profil gère le sien) | ✓ | `topbarConfig()` retourne `null` |
| `(app)/layout.tsx` — `locale` passé à AppShell | ✓ | |
| Faux header DuoFeed (boutons sans onClick) supprimé | ✓ | Remplacé par DTopBar global |
| Faux header MeClient supprimé | ✓ | Toast "ENREGISTRÉ" déplacé en fixed bottom-right |
| Faux header InboxClient supprimé | ✓ | |
| DTopBar retiré de SettingsClient | ✓ | AppShell le fournit |
| Fix realtime Strict Mode (`cancelled` flag) | ✓ | `DTopBar.tsx` — plus d'erreur "cannot add callbacks after subscribe()" |
| Fallback mock Riot API (503) en onboarding | ✓ | `OnbStep1Riot.tsx` — test sans clé valide |

---

## Infrastructure backend

| Élément | Status |
|---|---|
| Migration 20240015 — `duo_score` RPC | ✓ |
| Migration 20240016 — notifications + bookmarks + settings cols | ✓ (à push) |
| Migration 20240017 — triggers | ✓ (à push) |
| API notifications (list, read, read-all) | ✓ |
| API search | ✓ |
| API bookmarks (GET/POST/DELETE) | ✓ |
| API blocks (GET/POST/DELETE) | ✓ |
| API report | ✓ |
| API settings (account + notifications) | ✓ |
| API riot/unlink | ✓ |
| API auth/check-pseudo | ✓ |
| API auth/pseudo-suggestion | ✓ |
