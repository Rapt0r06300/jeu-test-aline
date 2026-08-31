# Jeu Test Aline

Prototype web original d’action-RPG fantasy destiné à valider le gameplay et l’ergonomie mobile avant une future version Unreal Engine iOS/Android.

## Commandes

Prérequis : Node.js 20+.

```bash
npm test
npm run build
npm run serve
```

- `npm test` : tests de structure et logique pure.
- `npm run build` : génère le site statique dans `dist/`.
- `npm run serve` : sert la source sur `http://127.0.0.1:4173`.
- `node scripts/serve.mjs --dist` : sert le build `dist/`.

## Preview GitHub Pages

URL cible : `https://rapt0r06300.github.io/jeu-test-aline/`

Le workflow `Deploy GitHub Pages` est versionné dans `.github/workflows/pages.yml`. Il teste et construit la preview puis publie `dist/` avec les actions officielles GitHub Pages. Si GitHub Pages n’est pas encore activé sur le dépôt, sélectionner **Settings → Pages → Source: GitHub Actions** une seule fois.

## Documentation

- `docs/MVP.md` — contrat de la première version jouable.
- `docs/ARCHITECTURE.md` — responsabilités et arborescence.
- `docs/IP-SAFETY.md` — règles d’originalité.
- `docs/ASSET-REGISTER.md` — provenance/licence des assets.
