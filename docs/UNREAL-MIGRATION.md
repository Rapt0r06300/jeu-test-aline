# Contrat de migration vers Unreal Engine 5.8

## But

La preview web valide le produit ; **elle n’est pas le client mobile final**. La migration vers Unreal Engine 5.8 est une réimplémentation contrôlée des systèmes, en réutilisant les données et les spécifications vérifiées plutôt qu’en essayant de convertir automatiquement le code JavaScript/Three.js.

## Classification de ce qui existe

| Élément web | Statut lors de la migration | Cible Unreal |
| --- | --- | --- |
| `src/render/**` | Jetable / référence visuelle | Renderer Unreal, materials, Niagara, World Partition selon besoin |
| `src/ui/**` | Jetable / référence UX | UMG/CommonUI |
| `src/core/**` | Réimplémenter | GameInstance, GameMode, Subsystems, Actor lifecycle |
| `src/gameplay/**` | Spécification réutilisable | C++ gameplay components + Gameplay Ability System quand pertinent |
| `src/data/**` | Portable après normalisation | UPrimaryDataAsset/DataTable/JSON d’import |
| Quêtes/items/abilities en données | Portable | DataAssets/DataTables avec IDs stables |
| Tests de règles pures | Spécification réutilisable | Unreal Automation Tests / Functional Tests |
| Sauvegarde JSON versionnée | Contrat portable | USaveGame local puis modèle serveur |
| Workflow GitHub Pages | Jetable | CI build/cook/package iOS/Android |

## Règle de portabilité des données

Les données réutilisables doivent rester :

- sérialisables ;
- identifiées par des IDs stables (`ability.fire_bolt`, `item.iron_blade`, etc.) ;
- indépendantes des objets DOM, Three.js ou classes Unreal ;
- versionnées lorsqu’elles sont persistées ;
- validables par schéma/tests avant import.

Le prototype web ne doit jamais stocker une référence Three.js dans un modèle `player`, `item`, `quest` ou `ability`.

## Arborescence cible Unreal

```text
Config/
Content/
  Art/
  Audio/
  Data/
    Abilities/
    Items/
    Quests/
    Enemies/
  Maps/
  UI/
Source/JeuTestAline/
  Core/
    JTAGameInstance.*
    JTAGameMode.*
    JTAPlayerState.*
    Subsystems/
  Player/
    JTACharacter.*
    JTAPlayerController.*
    Components/
  Abilities/
    JTAAbilitySystemComponent.*
    Abilities/
    Effects/
  AI/
    JTAEnemyCharacter.*
    JTAEnemyController.*
    Behavior/
  Items/
    JTAItemDefinition.*
    JTAInventoryComponent.*
  Quests/
    JTAQuestDefinition.*
    JTAQuestComponent.*
  Save/
    JTASaveGame.*
    JTASaveSubsystem.*
  Online/
    Session/
    Replication/
  UI/
    ViewModels/
Tests/
```

## Correspondance d’un système : Ability

### Web

Une ability est définie par des données :

```text
id, name, manaCost, cooldownSeconds, range, damage, targetingRule, vfxKey
```

Le moteur web consomme ces données pour vérifier disponibilité, portée et résultat.

### Unreal

- définition : `UPrimaryDataAsset` ou `FTableRowBase` ;
- exécution : `UGameplayAbility` ou composant C++ ciblé ;
- coût mana : GameplayEffect / règle serveur ;
- cooldown : tag/effect ou timer autoritaire ;
- ciblage : trace/query contrôlée par l’ability ;
- dégâts : GameplayEffect/ExecutionCalculation ou fonction serveur ;
- VFX : Niagara référencé par clé/data asset.

Ainsi, la **spécification** et les valeurs sont réutilisées, pas l’implémentation JavaScript.

## Ordre de migration

### M0 — Projet vide mobile

- créer projet Unreal 5.8 C++ ;
- activer Enhanced Input, CommonUI et modules gameplay nécessaires ;
- établir profils Device/Scalability ;
- obtenir un build vide Android et un build iOS signé sur la chaîne Apple prévue.

**Gate M0 :** application vide installable et démarrable sur au moins un Android cible et un appareil iOS de test.

### M1 — Mouvement + caméra + scène

- Character/Controller ;
- Enhanced Input tactile + manette/clavier de debug ;
- caméra troisième personne ;
- petite map de référence ;
- profils de performance mobile.

**Gate M1 :** déplacement/caméra comparables au vertical slice web.

### M2 — Combat + IA

- stats ;
- abilities ;
- ciblage ;
- ennemis ;
- dégâts/mort/respawn ;
- HUD de combat.

**Gate M2 :** encounter standard jouable de bout en bout.

### M3 — Boucle RPG

- XP/niveau ;
- loot ;
- inventaire/équipement ;
- quêtes ;
- boss ;
- sauvegarde locale versionnée.

**Gate M3 :** vertical slice complet reproduit nativement.

### M4 — Online

Introduire la réplication et l’autorité serveur seulement après stabilité du slice natif. Suivre `docs/MULTIPLAYER-ARCHITECTURE.md`.

## Contraintes iOS

- le packaging/signing final iOS nécessite la chaîne Apple (macOS/Xcode, certificats/provisioning) compatible avec la version UE utilisée ;
- le développement peut rester principalement sur Windows, mais une machine/runner Mac doit exister avant le gate M0 ;
- valider Metal, mémoire, thermals, safe areas et contrôles tactiles sur appareils physiques ;
- ne pas figer dans ce document des versions SDK susceptibles d’évoluer : la matrice de compatibilité Epic UE 5.8 est la source au moment du build.

## Contraintes Android

- installer les SDK/NDK/JDK correspondant à la matrice UE 5.8 ;
- cibler le niveau Android exigé par Google Play au moment de la soumission ;
- valider Vulkan, variantes GPU, mémoire, frame pacing et thermals sur appareils réels ;
- produire un Android App Bundle pour la distribution lorsque le projet arrive au stade store.

## Stratégie CI/build

1. **PR CI** : compile C++, Automation Tests, validation data/assets.
2. **Nightly Android** : cook/package Development + smoke appareil/émulateur si disponible.
3. **Nightly iOS** : runner Mac, cook/package et signature de test.
4. **Release candidate** : build Shipping reproductible, symboles archivés, version/commit intégrés.
5. **Store** : signature/provisioning et secrets gérés hors dépôt.

## Anti-couplage avec le web

La migration n’est autorisée à commencer que si :

- les règles gameplay importantes ont des tests ou exemples déterministes ;
- les IDs de données sont stables ;
- aucun modèle portable ne contient d’objet de rendu ;
- les écarts volontaires entre le prototype et la cible Unreal sont documentés.
