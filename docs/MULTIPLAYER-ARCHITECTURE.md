# Architecture multijoueur future — serveur autoritaire

## Principe

Le multijoueur n’est pas ajouté au prototype web par imitation. Le client Unreal évoluera par étapes, avec **serveur autoritaire** sur les résultats qui affectent progression, combat et économie.

## Étapes produit

### O0 — Solo déterministe

- un client ;
- sauvegarde locale ;
- règles de combat/data stabilisées ;
- aucune dépendance réseau pour jouer.

**Gate vers O1 :** combat, loot, inventaire et quêtes ont des contrats de données stables et des tests déterministes.

### O1 — Coop instanciée 2–4 joueurs

- session courte ;
- serveur dédié autoritaire ;
- matchmaking/invitation basique ;
- mouvement répliqué ;
- combat, ennemis et loot validés serveur ;
- résultat de session persisté à la fin.

**Gate vers O2 :** reconnexion, latence, duplication de loot, déconnexion hôte et reprise de session sont testés.

### O2 — Hub persistant + instances

- compte joueur ;
- personnages persistants ;
- inventaire serveur ;
- amis/groupes ;
- chat de groupe ;
- hub social ;
- donjons et boss en instances séparées.

**Gate vers O3 :** cohérence transactionnelle de l’inventaire et montée en charge des sessions démontrées.

### O3 — Monde persistant zoné

- zones/shards ;
- transitions de zone ;
- présence de joueurs ;
- world events/boss ;
- services sociaux plus larges ;
- observabilité et autoscaling.

### O4 — MMO avancé

Seulement après preuves d’échelle : guildes, économie/market, PvP massif, guerres/sièges et autres fonctions à fort coût opérationnel.

## Autorité par domaine

| Domaine | Client | Serveur |
| --- | --- | --- |
| Input local | Capture/prédiction | Validation |
| Position | Prédiction/interpolation | État autoritaire + corrections |
| Cible | Suggestion/UX | Validation portée/ligne de vue |
| Cooldowns | Affichage prédictif | Source de vérité |
| Mana/HP | Affichage | Source de vérité |
| Dégâts | Effets visuels prédits limités | Calcul/résultat autoritaire |
| IA ennemis | Interpolation/présentation | Simulation autoritaire |
| Mort/respawn | Présentation | Décision et timers |
| XP/niveau | Affichage | Attribution/persistance |
| Loot drop | Animation/présentation | RNG/drop autoritaire |
| Ramassage | Requête | Validation + transaction |
| Inventaire | Cache/UI | Source de vérité persistante |
| Équipement | Requête/UI | Validation + stats autoritaires |
| Quêtes | Affichage | Progression/récompenses persistantes |
| Monnaies | Affichage | Source de vérité transactionnelle |

## Architecture runtime cible

```text
Mobile/PC Client (Unreal)
  │
  ├─ Gateway/Auth
  │    └─ tokens/session identity
  │
  ├─ Matchmaking/Party
  │    └─ composition groupe + allocation instance
  │
  └─ Dedicated Game Server (Unreal)
       ├─ movement validation
       ├─ combat/abilities
       ├─ AI
       ├─ encounter state
       └─ commands toward persistence services

Persistence Services
  ├─ Character/Profile
  ├─ Inventory/Equipment
  ├─ Progression/Quest
  ├─ Social/Guild (later)
  └─ Economy/Market (much later)

Data Layer
  ├─ relational durable store
  ├─ cache/session state
  └─ append-only audit/events for critical economy operations
```

## Réplication et latence

### Mouvement

- prédiction client pour réactivité ;
- serveur valide vitesse/accélération/téléportations ;
- corrections avec reconciliation ;
- interpolation des autres joueurs.

### Combat

- le client peut anticiper animation et VFX ;
- le serveur tranche disponibilité de l’ability, portée, ressources, cible et dégâts ;
- les événements confirmés ont un identifiant pour empêcher double application.

### Loot/inventaire

- jamais d’attribution finale uniquement côté client ;
- chaque opération d’inventaire devient une commande idempotente ;
- les mutations critiques utilisent transaction/version d’état afin d’empêcher duplication et écrasement concurrent.

## Identité et comptes

Ordre recommandé :

1. compte interne anonyme/dev pour prototypes ;
2. identity provider production ;
3. liens Apple/Google/plateformes ;
4. migration/liaison de comptes testée avant lancement.

Le game server reçoit une identité vérifiée, pas un `playerId` librement choisi par le client.

## Groupes et chat

- Party service distinct de l’instance de jeu ;
- groupe survivant au changement d’instance ;
- chat de groupe avant chat global ;
- modération, rate limits et blocage utilisateur obligatoires avant ouverture large.

## Anti-triche minimal par étape

### O1

- serveur autoritaire combat/loot ;
- validation vitesse/position ;
- rate limits commandes ;
- séquences/IDs anti-replay ;
- logs d’événements suspects.

### O2+

- contrôle d’intégrité supplémentaire selon plateforme ;
- détection statistique d’anomalies ;
- sanctions/modération auditables ;
- secrets et clés absents du client ;
- sécurité de l’économie traitée comme un système transactionnel.

## Observabilité nécessaire avant persistant

- taux de connexion/échec ;
- RTT, packet loss, corrections mouvement ;
- durée/issue des instances ;
- erreurs de persistance ;
- duplications/rejets idempotents ;
- files d’attente matchmaking ;
- CPU/mémoire par serveur et joueurs/instance.

## Tests de passage

### Combat

Test : deux clients tentent simultanément une ability incompatible avec le même cooldown.

**Attendu :** une seule vérité serveur, aucun double dégât.

### Loot

Test : deux requêtes de ramassage identiques/rejouées.

**Attendu :** un seul objet attribué grâce à une commande idempotente.

### Inventaire

Test : équiper le même item depuis deux sessions concurrentes.

**Attendu :** version/transaction serveur empêche un état impossible.

## Règle de non-surarchitecture

Aucun service MMO avancé n’est implémenté avant son gate. Le premier objectif online est une **coop instanciée fiable**, pas un monde massif incomplet.
