# UI Design System — Jeu Test Aline

Ce document définit le contrat visuel et interactif commun du prototype. Il décrit une identité **tellurique-astrale originale** et ne constitue pas une reproduction de l’interface d’un autre jeu.

## Principes

1. **Gameplay d’abord** : danger, objectif et récompense doivent être identifiables avant la décoration.
2. **Mobile-first** : toute action interactive conserve une cible tactile minimale de `44px`, y compris en paysage.
3. **Sémantique avant couleur** : les états importants utilisent texte, libellés et structure en plus de la couleur.
4. **Composants avant exceptions** : panneau, bouton, badge et typographie viennent du design system ; les feuilles feature ne règlent que leur disposition.
5. **Réduction de mouvement** : les transitions respectent `prefers-reduced-motion`.
6. **Clean-room** : aucune texture, icône, composition ou palette d’ODIN n’est copiée ; les références externes servent uniquement à fixer un niveau de qualité.

## Tokens

Source canonique : `src/ui/design-system.css`.

- typographie : `--font-*`, `--type-*`, `--line-*` ;
- surfaces : `--surface-*` ;
- texte : `--text-*` ;
- accents sémantiques : `--accent-primary`, `--accent-reward`, `--accent-danger` ;
- rythme : `--space-*`, `--radius-*`, `--touch-min` ;
- effets : `--shadow-*`, `--blur-panel`, `--motion-*`, `--focus-ring`.

Une feature ne doit pas recréer localement un équivalent de ces tokens sans raison documentée.

## Primitives

### `.ui-panel`

Panneau de base. Variantes :

- `.ui-panel--compact` : informations secondaires ;
- `.ui-panel--objective` : progression/objectif actif ;
- `.ui-panel--danger` ou `data-ui-state="danger"` : menace immédiate ;
- `.ui-panel--reward` ou `data-ui-state="reward"` : gain/complétion ;
- `.ui-panel--muted` : aide et information tertiaire.

### `.ui-button`

Contrôle tactile/clavier de base. Variantes : `--primary`, `--secondary`, `--ghost`, `--danger`, `--inventory`, `--skill`.

États obligatoires :

- `ready` ;
- `hover` sur pointeur fin uniquement ;
- `active/pressed` ;
- `disabled` + `aria-disabled` ;
- `cooldown` pour les compétences ;
- `focus-visible` pour le clavier.

Les états `disabled` et `cooldown` ne doivent jamais faire disparaître le nom ou la silhouette du contrôle.

## Hiérarchie sémantique

Ordre de priorité à l’écran :

1. **danger** — télégraphe boss, mort, menace imminente ;
2. **objective** — action requise pour progresser ;
3. **reward** — gain, équipement, victoire ;
4. **neutral/muted** — aide, contexte, métadonnées.

La couleur seule n’est jamais l’unique signal : les textes `OBJECTIF MAJEUR`, `RÉCOMPENSE`, avertissements et libellés d’état complètent le contraste visuel.

## Responsabilités

- `design-system.css` : tokens + primitives + états partagés ;
- `styles.css` : layout HUD et spécialisations gameplay ;
- `first-session.css` : disposition du panneau de première session uniquement ;
- `hud.js` : composition des primitives et exposition des états sémantiques ;
- gameplay/renderer : aucune dépendance au design system.

## Gate QR-04

Le gate est considéré satisfait quand :

- les principaux composants HUD composent les primitives partagées ;
- les compétences exposent `ready/cooldown/disabled` et restent compréhensibles au mobile ;
- les contrôles restent à au moins `44px` ;
- danger/objectif/récompense sont explicites ;
- les tests source passent ;
- le browser-smoke passe en 1440×900, 390×844, 320×568 et 844×390.
