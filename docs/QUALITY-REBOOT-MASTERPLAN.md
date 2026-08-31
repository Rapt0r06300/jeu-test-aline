# QUALITY REBOOT — Vertical Slice Premium

> Source d’exécution P0 du projet Jeu Test Aline.
> Créée le 31/08/2026 après audit de la preview réelle.

## 0. Décision produit

La preview actuelle doit être traitée comme un **prototype technique**, pas comme un jeu présentable. Tant que ce masterplan n’est pas terminé, les systèmes MMO lointains passent derrière la qualité de la première expérience joueur.

Objectif du reboot : transformer les 10 premières minutes en une expérience fantasy originale, lisible, animée, sonore et visuellement crédible, avec une histoire immédiate, un tutoriel progressif, de vrais feedbacks de combat, un HUD premium, une zone travaillée et un boss servant de climax.

### Interdictions absolues

- Ne jamais considérer une fonctionnalité « terminée » uniquement parce que sa logique fonctionne.
- Aucun personnage final visible sous forme de cubes/cylindres/sphères évidents.
- Aucune compétence importante sans animation + VFX + SFX + feedback de résultat.
- Aucun écran principal composé de boutons HTML bruts sans design system.
- Aucun moment où le joueur doit deviner son objectif principal.
- Aucun placeholder majeur dans une build candidate publique.
- Ne jamais copier code, assets, lore, cartes, noms, UI, musiques ou expression protégée d’ODIN. Les références servent uniquement à comprendre le niveau de profondeur attendu.

## 1. Gate final du reboot

Le reboot n’est considéré terminé que lorsque **JTA-1062 / QR-32** passe.

Un testeur sans contexte doit pouvoir, en 10 minutes :

1. comprendre où il est et quelle menace existe ;
2. comprendre quoi faire dans les 10 premières secondes après chaque transition majeure ;
3. se déplacer et contrôler la caméra ;
4. identifier une cible ;
5. utiliser attaque + 4 pouvoirs et distinguer visuellement chacun ;
6. comprendre les dégâts, cooldowns, mana et erreurs d’action ;
7. suivre un objectif sans aide extérieure ;
8. parler à un PNJ et comprendre le dialogue ;
9. obtenir du loot, comprendre sa rareté et l’équiper ;
10. affronter le boss avec télégraphes, phase, climax et récompense ;
11. terminer sans erreur fatale, écran vide, chevauchement critique ou blocage de progression.

Pour tout élément perceptible par le joueur, une preuve visuelle/E2E est obligatoire avant Review/Done.

---

# TRAIN D’EXÉCUTION UNIQUE

Ordre obligatoire : **QR-A → QR-B → QR-C → QR-D → QR-E → QR-F → QR-G → QR-H**.

Les tâches internes de chaque Work Unit suivent leur numéro croissant. Ne pas sauter de phase pour ajouter des systèmes MMO plus lointains.

## QR-A — Qualité, art bible et design system — JTA-WU-90

### JTA-1031 — [QR-01] Figuer le contrat qualité visible du reboot
Définir le gate binaire qualité : intro, compréhension, graphismes, animations, VFX, audio, UI, objectifs, mobile, stabilité et preuves.

### JTA-1032 — [QR-02] Créer le directeur de séquence de première session
Orchestration data-driven : title → intro → spawn → FTUE → dialogue → combat → loot → boss → conclusion. Reprise sûre après reload.

### JTA-1033 — [QR-03] Définir une art bible originale et des budgets de qualité
Silhouettes, palette, matériaux, densité, budgets textures/geometry, LOD, règles clean-room, standard minimum par asset.

### JTA-1034 — [QR-04] Construire le design system UI premium
Tokens, typographie, boutons, panneaux, icônes, états, animations, responsive et zones tactiles.

**Exit gate QR-A** : tout le travail suivant possède une direction visuelle/UX mesurable et un contrat de qualité commun.

---

## QR-B — Intro, histoire et tutoriel guidé — JTA-WU-91

### JTA-1035 — [QR-05] Créer écran titre, identité et démarrage cinématique
Logo original, background vivant, Jouer/Continuer/Paramètres, loading propre, transitions.

### JTA-1036 — [QR-06] Produire une cinématique d’introduction et un hook narratif
Présenter le monde, la menace, la motivation immédiate et l’arrivée au sanctuaire. Sous-titres, audio, caméra, skip sûr.

### JTA-1037 — [QR-07] Écrire et intégrer le prologue jouable
Arrivée → Elyra → menace des brumes → premier combat → artefact → montée de tension → Gardien → conclusion temporaire.

### JTA-1038 — [QR-08] Créer tutoriel contextuel et guidance dynamique
Mouvement, caméra, cible, attaque, pouvoirs, interaction, quête, loot, équipement et boss enseignés progressivement.

**Exit gate QR-B** : un nouveau joueur comprend immédiatement pourquoi il joue et ce qu’il doit faire.

---

## QR-C — Personnage et animations de production — JTA-WU-92

### JTA-1039 — [QR-09] Remplacer le héros placeholder par un personnage original crédible
Remplacer le mannequin procédural visible par une silhouette de personnage réellement crédible, originale, animable et optimisable.

### JTA-1040 — [QR-10] Implémenter locomotion animée complète
Idle, marche, course, rotation, strafe, start/stop et transitions synchronisées à la vitesse.

### JTA-1041 — [QR-11] Implémenter animations de l’attaque et des quatre pouvoirs
Une animation reconnaissable par action, avec anticipation, impact/cast et recovery synchronisés aux dégâts.

### JTA-1042 — [QR-12] Ajouter hit reactions, mort, interaction et transitions de personnage
Hit/stagger, mort/reprise, interaction PNJ, victoire, reset propre des poses.

**Exit gate QR-C** : le héros ne donne plus l’impression d’un mannequin de debug et toutes les actions importantes possèdent un langage corporel.

---

## QR-D — VFX, impacts et spectacle de combat — JTA-WU-93

### JTA-1043 — [QR-13] Construire un moteur VFX de combat réutilisable
Trails, projectiles, zones, impacts, decals, flashes, pooling, durée et profils qualité ; jamais d’autorité gameplay dans le VFX.

### JTA-1044 — [QR-14] Créer des visuels uniques pour attaque et quatre compétences
Cinq signatures visuelles distinctes, lisibles sur mobile et cohérentes avec l’art bible.

### JTA-1045 — [QR-15] Ajouter feedback d’impact premium au combat
Hit flash, hitstop léger, micro shake, damage numbers, critiques, trails, son et feedback d’action invalide.

### JTA-1046 — [QR-16] Refaire ennemis et boss avec animation, télégraphes et VFX
Idle/chase/attack/hit/death, télégraphes, impacts, phase boss et signaux de danger.

**Exit gate QR-D** : aucun combat important ne ressemble à deux objets qui se touchent avec une barre de vie qui descend.

---

## QR-E — Monde, éclairage et caméra premium — JTA-WU-94

### JTA-1047 — [QR-17] Refaire sol, terrain et matériaux du monde
Relief, matériaux, transitions de sol, chemin naturel, rochers, zones de combat et limites crédibles.

### JTA-1048 — [QR-18] Ajouter végétation, props, ruines et landmarks
Spawn, sanctuaire, clairière et arène boss doivent chacun avoir une identité reconnaissable.

### JTA-1049 — [QR-19] Refaire éclairage, ciel, fog et post-traitement
Ciel, soleil, rim, fog, tonemapping, bloom contrôlé, grading, ombres et profils qualité.

### JTA-1050 — [QR-20] Polir caméra action-RPG et mise en scène dynamique
Suivi amorti, collision, boss framing, zooms narratifs et transitions de caméra confortables.

**Exit gate QR-E** : une capture d’écran du monde doit ressembler à une zone de jeu intentionnelle, pas à un bac à sable technique.

---

## QR-F — HUD, navigation et récompenses — JTA-WU-95

### JTA-1051 — [QR-21] Refaire le HUD principal comme un vrai RPG mobile
HUD hiérarchisé, compact, contextualisé, panneaux secondaires non permanents.

### JTA-1052 — [QR-22] Créer boutons de compétences illustrés et feedback de cooldown
Icônes originales, cooldown radial, mana, invalidité, press, highlight/proc et tactile.

### JTA-1053 — [QR-23] Ajouter minimap, marqueurs et navigation d’objectif
Minimap, world markers, off-screen indicators, distance et zone d’objectif.

### JTA-1054 — [QR-24] Refaire loot, inventaire, équipement et récompenses visuelles
Drop/pickup, rareté, panneau d’inventaire, comparaison, equip et reward presentation.

**Exit gate QR-F** : le joueur sait toujours quoi faire, où aller, quelle compétence est prête et ce qu’il vient de gagner.

---

## QR-G — Audio, narration et climax boss — JTA-WU-96

### JTA-1055 — [QR-25] Composer musique, ambiance et identité sonore de la zone
Titre, sanctuaire, exploration, combat, boss, victoire et transitions de mix.

### JTA-1056 — [QR-26] Ajouter SFX de combat, monde et UI
Armes, cast, impacts, pas, télégraphes, loot, UI et validation/refus.

### JTA-1057 — [QR-27] Refaire dialogues, portraits, sous-titres et présentation narrative
Dialogue panel, portrait, nom, rythme, skip/replay, sous-titres et historique court.

### JTA-1058 — [QR-28] Produire intro boss, phases et victoire spectaculaire
Entrée, title card, phase, VFX/audio renforcés, final, récompense et conclusion du prologue.

**Exit gate QR-G** : le jeu possède une identité audiovisuelle et le boss donne une vraie sensation de climax.

---

## QR-H — Mobile, accessibilité, performance et gate final — JTA-WU-97

### JTA-1059 — [QR-29] Ajouter aide, codex de commandes et accessibilité
Aide en jeu, commandes, icônes, objectif, taille UI/texte, réduction shake/flash, contraste.

### JTA-1060 — [QR-30] Polir interactions tactiles et responsive mobile
Joystick + caméra + skill simultanés, safe areas, orientation, multi-touch, pointer cancel.

### JTA-1061 — [QR-31] Optimiser assets, rendu et profils qualité sans casser le style
LOD, culling, compression, pooling, instancing, DPR, FPS, mémoire et profils low/medium/high.

### JTA-1062 — [QR-32] Valider la build avec un gate première expérience de 10 minutes
Test E2E final desktop/mobile + preuves visuelles. Aucun placeholder majeur, bouton brut, action sans feedback, progression incompréhensible ou erreur fatale.

**Exit gate QR-H = REBOOT VALIDÉ.**

---

# Règles d’exécution pour un run unique

1. Lire ce fichier en entier avant toute modification.
2. Travailler strictement dans l’ordre QR-A → QR-H.
3. Pour chaque tâche : analyser l’architecture existante, implémenter le minimum complet visible, ajouter/adapter les tests, exécuter tests/build/smoke, puis fournir preuve avant de passer à la suivante.
4. Ne jamais cocher un critère visuel sans preuve visuelle/E2E.
5. Ne jamais sacrifier la séparation gameplay ↔ rendu ↔ UI : la logique décide, le renderer représente, le HUD informe/émet des intentions.
6. Toute ressource externe doit avoir provenance/licence archivée dans le registre d’assets.
7. Préférer les assets originaux ou CC0/compatibles ; ne jamais importer un asset ODIN.
8. Les effets, animations et sons doivent être liés aux événements gameplay, jamais décider eux-mêmes des dégâts/loot/progression.
9. Les changements doivent rester compatibles avec GitHub Pages et le fallback si le renderer principal échoue.
10. Les tests unitaires ne remplacent pas les tests visuels ; les tests visuels ne remplacent pas les tests de logique.
11. À la fin de chaque Work Unit, produire : commit clair, résumé, captures/vidéo si pertinent, résultat tests, risques restants.
12. Si une dépendance externe manque (asset, device, outil), utiliser un fallback original de qualité acceptable et documenter le remplacement futur ; ne jamais prétendre que l’élément final est livré.
13. Le run ne doit pas repartir vers marketplace/guildes/backend/MMO tant que JTA-1062 n’est pas PASS.

# Definition of Done globale

Le reboot est réussi seulement si :

- le jeu possède une vraie ouverture ;
- le joueur comprend l’histoire immédiate ;
- le joueur sait toujours quoi faire ;
- le personnage et les ennemis sont animés ;
- toutes les compétences ont animation/VFX/SFX ;
- les impacts ont du poids ;
- le monde a une identité visuelle et des landmarks ;
- le HUD et les boutons ont une qualité cohérente de jeu mobile ;
- navigation, minimap, loot et récompenses sont compréhensibles ;
- musique/SFX/dialogues sont présents ;
- le boss est mis en scène ;
- desktop et mobile restent utilisables et stables ;
- aucun placeholder majeur n’est visible dans la build candidate ;
- les preuves E2E et visuelles existent.

Tant qu’un de ces points manque, la build reste **prototype / non promouvable**.
