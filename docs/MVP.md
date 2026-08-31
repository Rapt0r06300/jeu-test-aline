# Jeu Test Aline — Contrat MVP

## Objectif

Livrer une **preview web 3D jouable** d’un action-RPG fantasy original, accessible depuis GitHub Pages sur ordinateur et mobile. Le MVP web sert à prouver la boucle de jeu, l’ergonomie tactile et la structure de données avant la migration vers Unreal Engine.

## Parcours démontrable obligatoire

Une session MVP complète doit permettre de :

1. charger la page sans erreur fatale ;
2. déplacer le personnage au clavier ou au joystick tactile ;
3. explorer une petite zone fantasy originale ;
4. cibler et combattre des ennemis ;
5. utiliser une attaque de base et 4 compétences avec mana et cooldowns ;
6. gagner de l’XP et monter de niveau ;
7. obtenir du loot, ouvrir l’inventaire et équiper au moins un objet ;
8. parler à un PNJ, accepter puis terminer une quête ;
9. atteindre et vaincre un boss à plusieurs patterns ;
10. recharger la page et retrouver la progression essentielle.

## Capacités obligatoires et preuves observables

| Capacité | Preuve dans la preview |
| --- | --- |
| Scène 3D | Zone, ciel, éclairage, profondeur et décor visibles sans écran noir. |
| Desktop | WASD/flèches déplacent le joueur ; caméra lisible. |
| Mobile | Joystick tactile et boutons d’action utilisables en paysage. |
| Combat | Dégâts, portée, cible, mana et cooldowns sont visibles et cohérents. |
| IA | Les ennemis passent idle → chase → attack → dead → respawn. |
| HUD | HP, mana, XP, niveau, cible et cooldowns reflètent l’état réel du jeu. |
| Progression | L’XP franchit des seuils déterministes et déclenche un level-up visible. |
| Loot | Un objet peut être gagné, vu dans l’inventaire puis équipé/retiré. |
| Quête | Un PNJ pilote accepted → active → completed → rewarded sans double récompense. |
| Boss | Au moins 3 patterns lisibles et une variation de phase/comportement. |
| Sauvegarde | Rechargement sans perte de progression essentielle. |
| Delivery | `main` construit, teste et publie automatiquement la preview. |

## Exclusions explicites du MVP web

Ne font pas partie du MVP :

- monde ouvert massif avec streaming de continents ;
- authentification Apple/Google et comptes en ligne ;
- serveur persistant, shards ou instances multijoueur ;
- guildes, hôtel des ventes, chat global, sièges ou PvP massif ;
- monétisation, boutique, paiements ou gacha ;
- assets 3D AAA finaux et cinématiques ;
- anti-cheat production ;
- publication App Store / Google Play ;
- conversion automatique du code web vers Unreal Engine.

Ces sujets sont explicitement différés afin que la première boucle jouable reste petite et démontrable.

## Budgets de performance initiaux

### Mobile récent

- cible : **45 FPS ou plus** en qualité standard ;
- seuil de garde : frametime médian < 22 ms ;
- mode qualité réduit disponible si la cible n’est pas tenue ;
- résolution/pixel ratio plafonné pour éviter le sur-rendu ;
- aucun freeze notable lors d’un changement d’orientation.

### Desktop

- cible : **60 FPS** en qualité standard ;
- frametime médian < 16,7 ms sur machine de développement moderne ;
- pas de fuite évidente après plusieurs minutes et plusieurs respawns.

Ces valeurs sont des budgets de prototype, pas une garantie sur tous les appareils.

## Originalité obligatoire

Le jeu peut s’inspirer de mécaniques générales des action-RPG/MMORPG (classes, compétences, boss, loot, progression, quêtes), mais doit utiliser une identité indépendante : noms, lore, silhouettes, UI, cartes, personnages, monstres, icônes, textures, musiques et effets doivent être originaux ou issus d’assets dont la licence est documentée.

Le nom « ODIN » reste uniquement une référence de genre dans la documentation interne. Aucun contenu propriétaire d’ODIN ne doit être nécessaire pour compiler ou lancer le projet.

## Definition of Done du MVP

Le MVP est démontré seulement lorsqu’une session complète du chargement au boss est réalisable dans la preview, que les contrôles tactiles sont utilisables, que les systèmes obligatoires ont une preuve observable, que les tests/builds sont verts et que la provenance de chaque asset externe est documentée.
