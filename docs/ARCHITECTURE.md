# Architecture du prototype web

## Objectif

Le prototype est volontairement petit, statique et portable. Le build ne dépend d’aucun service distant : `npm run build` copie les modules ES vers `dist/`, qui peut être publié tel quel sur GitHub Pages.

## Arborescence

```text
index.html                  Entrée web
src/
  core/                     Cycle de vie et orchestration
  render/                   Rendu de scène, caméra et effets
  gameplay/                 État et règles de jeu sans dépendance au renderer
  data/                     Configuration et données statiques
  ui/                       HUD et interactions DOM
  main.js                   Bootstrap uniquement
  styles.css                Styles globaux
assets/                     Assets distribués (registre obligatoire)
docs/                       Contrats, architecture, licences
scripts/                    Build/serve/audits Node
tests/                      Tests unitaires/intégration/smoke
.github/workflows/           CI et publication GitHub Pages
```

## Règles de dépendance

- `gameplay/` ne doit pas importer le renderer.
- `data/` contient des objets sérialisables et ne dépend pas du DOM.
- `render/` traduit les données/états en représentation visuelle.
- `ui/` affiche l’état et émet des intentions ; les règles restent dans `gameplay/`.
- `core/` assemble les modules et possède le cycle de vie start/stop.
- les assets externes sont refusés s’ils ne figurent pas dans `docs/ASSET-REGISTER.md`.

## Choix technique de la preview

La première fondation utilise des **ES modules natifs** et un build Node sans dépendance pour rendre GitHub Pages reproductible même dans un environnement contraint. La tâche de scène 3D peut charger Three.js depuis une version CDN épinglée, avec un fallback local afin qu’un échec réseau ne produise jamais un écran blanc.

Ce choix est spécifique au prototype web ; le client mobile final sera réimplémenté dans Unreal Engine et ne dépendra pas de cette stack.
