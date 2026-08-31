# Guide d’originalité et de propriété intellectuelle

## Principe

Le projet vise une **expérience originale inspirée du genre action-RPG/MMORPG**, jamais une reproduction d’ODIN: Valhalla Rising ou d’un autre jeu existant.

## Ce qui peut inspirer le produit

Les concepts génériques suivants peuvent servir de référence fonctionnelle :

- monde fantasy en troisième personne ;
- classes et compétences ;
- monstres et boss ;
- quêtes, XP, niveaux et équipement ;
- raids, coop et PvP comme objectifs futurs ;
- ergonomie mobile d’un action-RPG.

Ces idées doivent être réinterprétées avec des règles, valeurs, visuels et noms propres au projet.

## Ce qui doit être créé indépendamment

Ne jamais copier ou extraire :

- noms de personnages/classes/lieux/objets spécifiques ;
- logos, typographies distinctives ou identité de marque ;
- cartes, layouts de zones ou placement caractéristique ;
- modèles 3D, rigs, animations, textures ou VFX ;
- icônes, écrans UI ou compositions reconnaissables ;
- dialogues, lore, descriptions ou textes ;
- musiques, sons ou voix ;
- fichiers du client, ressources dataminées ou assets récupérés du jeu.

## Règles d’assets

1. Un asset externe n’entre dans `assets/` que si sa source et sa licence sont consignées dans `docs/ASSET-REGISTER.md`.
2. Les assets maison/procéduraux sont marqués `original-project`.
3. Une licence avec attribution impose de conserver le texte d’attribution requis.
4. Une licence incompatible ou ambiguë bloque l’intégration.
5. Une image ou capture d’ODIN peut servir de référence de discussion, jamais d’asset distribué dans le jeu.

## Revue avant release

Avant chaque version publique :

- auditer les chemins `assets/`, `public/` et les fichiers de données ;
- vérifier que chaque entrée externe existe dans le registre ;
- rechercher les noms/marques propriétaires évidents ;
- vérifier que la preview fonctionne sans fichier provenant d’ODIN.
