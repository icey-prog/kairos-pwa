# Suivi Frontend — Neuro-Kaizen (kairos-pwa)

> Dernière mise à jour : 2026-06-12
> Repo front : `kairos-pwa/` → déployé sur **Vercel** (`https://kairos-pwa.vercel.app`)
> Backend : `mile_api/` → **Coolify** (`https://kairosapi.duckdns.org:8443/api`)

---

## Ce qui est fait (cette session)

### UI / Thème
- **FAB speed-dial** remplace la bottom nav : bouton flottant menu → 5 items animés (Focus / Apprendre / Stats / Accès rapide / Thème) + bottom sheet « Accès rapide ».
- **ThemeToggle déplacé** dans le FAB speed-dial (5ᵉ item Lune/Soleil) — ne chevauche plus le FAB.
- **Dark mode refait** : classe `dark-mode` (ex-`glass-mode`), tokens OLED (`#000` fond, `#111`/`#1c1c1e` surfaces, primaire `#007aff` conservé). `sonner.tsx` mis à jour.
- **Couleurs hardcodées purgées** : `InterleavingTimer`, `MoodGate`, `DailyPlanner` → CSS vars (`--color-foreground`, `--color-secondary`, etc.) → dark mode correct partout.
- Skills appliqués : mobile-design (touch ≥44px, thumb zone), haptics (`src/lib/haptic.js`), PWA (offline.html, manifest), frontend-design.

### PWA / Service Worker
- `public/sw.js` : network-first navigation HTML + fallback `offline.html`, stale-while-revalidate API.
- Fix race `clone` (clone synchrone avant cache.put async).
- Fallback offline retourne **503 valide** (au lieu de `[]` qui corrompait `/xp/balance`).
- Cache bumpé **v5**.
- `App.jsx` : détection mise à jour SW → toast « Recharger ».

### Connexion backend
- `src/lib/api.js` : défaut prod → `https://kairosapi.duckdns.org:8443/api`.
- CORS backend : regex `*.vercel.app` + origin prod (corrigé dans `main.py`).

### Module Révision (PLAN_REVISION_V2)
**Phase 2 — bugs révision (`SpacedRepetition.jsx`)** ✅
- Champ **Réponse** (`back`) requis à la création + bloc réponse affiché en révision + badge « Sans réponse ».
- File de révision **figée** (`reviewQueue`) au lancement → plus de cartes sautées / `undefined`.
- Calcul « dû » par jour entier (`!isAfter(startOfDay)`).
- **XP session** : `POST /api/xp` (+5/carte, plafond +50) en fin de session.
- Reviews via `POST /spaced-cards/{id}/review` (trace `ReviewLog`).

**Phase 3 — disciplines dynamiques + filtres** ✅
- `src/hooks/useDisciplines.js` : `GET /api/disciplines` (fallback `DISCIPLINE_CONFIG` si offline/vide), tolère array nu / `{disciplines}` / `{data}`, filtre `is_active`.
- `src/lib/disciplineIcons.js` : map statique d'icônes Lucide (pas de wildcard → évite +600 Ko).
- `src/components/DisciplineChips.jsx` : pastilles colorées scrollables + compteurs + haptics.
- `src/components/NewDisciplineDialog.jsx` : création discipline inline (nom/couleur/icône) → `POST /api/disciplines` → sélection immédiate.
- `SpacedRepetition` : chips + segmented statut (Toutes/À réviser/Cette semaine/Maîtrisées) + recherche texte ; stats recalculées sur le set filtré.
- `FeynmanNotes` : mêmes chips (remplacent l'ancien Select) + select discipline dynamique.

### Correctifs crash
- `SpacedRepetition` + `FeynmanNotes` : garde `?? fallback` sur discipline inconnue (`Cannot read 'color'`).

---

## Reste à faire (frontend)

| Phase | Contenu | Dépend |
|---|---|---|
| **4** | Bottom sheets carte/note : éditer, historique SM-2, supprimer, convertir note→cartes | 3 ✅ |
| **5** | Page Formation par discipline (`DisciplineDetail` + stats) | 3,4 |
| **6** | Header `X-API-Key` (wrapper `apiFetch` depuis `VITE_API_KEY`) | — |

---

## ⚠️ Action requise — seed des disciplines (sinon 3 chips au lieu de 16)

La table `discipline` est **vide** sur le volume déployé → l'API renvoie `[]` → le front affiche le fallback (3 disciplines). Le `lifespan` backend crée les tables mais **ne seede pas**.

### Fix — lancer le seed une fois (idempotent)
Sur la machine serveur, terminal :

```bash
docker exec -it kairos_api python seed.py
```
→ poste les **16 disciplines** + cartes/notes/récompenses démo via l'API locale (`localhost:8000`, pas de CORS/SSL). Skip ce qui existe déjà.

Contenu supplémentaire (optionnel) :
```bash
docker exec -it kairos_api python seed_kairos_mile.py
docker exec -it kairos_api python seed_server_config.py
```

### Vérifier
```
https://kairosapi.duckdns.org:8443/api/disciplines
```
→ doit lister 16 items. Puis hard-refresh le front (Ctrl+Shift+R) → les 16 chips apparaissent.

### (Optionnel) rendre le seed automatique au démarrage
Ajouter un `_seed_disciplines()` idempotent dans `database.create_db_and_tables()` (après `_migrate()`) → un volume neuf / redeploy n'aura plus jamais le souci. Modif **backend**.

---

## Commandes utiles

```bash
# Front (dev / build)
npm run dev          # Vite :5173
npm run build        # bundle dist/

# Déploiement
git push origin main # Vercel redéploie auto

# Anti-cache SW (si vieux bundle servi)
# DevTools → Application → Service Workers → Unregister
# DevTools → Application → Storage → Clear site data → Ctrl+Shift+R
```
