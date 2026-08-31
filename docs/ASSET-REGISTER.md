# Registre des assets

Le registre machine lisible `assets/manifest.json` est la source de vérité pour tout fichier d'asset distribué avec le projet. Ce document explique la politique humaine associée.

## État actuel

La preview utilise encore uniquement des géométries, matériaux et animations procédurales créés par le code du projet. Le héros humanoïde, le PNJ et les ennemis introduits dans la preview sont donc **PROJECT-ORIGINAL** et ne nécessitent aucun fichier binaire externe.

| Asset / chemin | Origine | Licence | Attribution | Statut |
| --- | --- | --- | --- | --- |
| Décors procéduraux de la preview | original-project | PROJECT-ORIGINAL | Aucune | Autorisé |
| Humanoïdes procéduraux articulés | original-project | PROJECT-ORIGINAL | Aucune | Autorisé |
| Géométries primitives de la preview | générées par le code du projet | PROJECT-ORIGINAL | Aucune | Autorisé |
| Matériaux/couleurs procéduraux | original-project | PROJECT-ORIGINAL | Aucune | Autorisé |

## Manifest obligatoire

Tout fichier 3D, texture, audio, vidéo ou police ajouté au dépôt doit être enregistré **avant son merge** dans `assets/manifest.json` avec :

- identifiant interne stable ;
- chemin exact dans le dépôt ;
- URL source ou `original-project` ;
- auteur ;
- licence exacte ;
- date de récupération ;
- SHA-256 du fichier ;
- transformations effectuées ;
- attribution ;
- restrictions ;
- pour un asset externe : chemin vers un snapshot de licence archivé dans le dépôt.

Le script `npm run check:assets` scanne le dépôt et applique une politique **fail-closed**. Un asset non enregistré, un hash modifié, une licence non autorisée ou un snapshot manquant fait échouer la CI.

## Licences automatiquement autorisées

La liste blanche technique actuelle est volontairement conservatrice :

- `PROJECT-ORIGINAL`
- `CC0-1.0`
- `CC-BY-4.0`
- `MIT`
- `BSD-3-Clause`
- `Apache-2.0`

Une nouvelle licence n'est jamais considérée comme autorisée implicitement : elle doit d'abord être auditée, puis ajoutée explicitement à la politique versionnée.

## Sources candidates déjà auditées

Pour le remplacement futur des personnages procéduraux par des meshes plus détaillés :

- **MakeHuman / MPFB core assets** : CC0 pour les assets core/exports conformes ; vérifier séparément tout asset tiers.
- **Quaternius Universal Base Characters** : la page du pack consultée le 31/08/2026 affiche CC0 ; archiver la licence exacte avec le fichier retenu.
- **Mixamo** : utilisable dans un jeu intégré selon les conditions Adobe consultées, mais les fichiers bruts de personnages/animations ne doivent pas être redistribués comme pack d'assets. Toute utilisation devra être auditée et enregistrée avant intégration.

## Règle clean-room

Aucun asset d'ODIN: Valhalla Rising n'est autorisé. ODIN sert uniquement de benchmark public de fonctionnalités et de niveau de production ; modèles, textures, animations, sons, cartes, UI et autres expressions propriétaires ne sont jamais copiés.
