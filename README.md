# Cabinet Compta DZ

Application desktop multi-dossiers pour cabinets comptables algériens, permettant de gérer la facturation et le suivi des échéances déclaratives de plusieurs clients depuis une seule interface.

## Problème résolu

Les cabinets comptables algériens gèrent souvent 10 à 50 clients en parallèle (sociétés ou indépendants), chacun avec son propre régime fiscal (forfaitaire IFU, réel simplifié, réel), ses propres factures, et ses propres échéances déclaratives (G50, IRG, TAP, IBS). La plupart des cabinets jonglent encore avec Excel ou des outils non adaptés, ce qui crée un risque d'oubli d'échéance et une perte de temps sur la facturation.

Cette app centralise la gestion multi-dossiers avec une vue claire des échéances à venir, tous clients confondus.

## Stack technique

- **Flutter desktop** (Windows en priorité)
- **SQLite** (via `sqflite_common_ffi`) pour le stockage local, mode offline-first
- **Riverpod** pour la gestion d'état
- **pdf** + **printing** pour la génération de factures PDF

## Statut du projet

🚧 MVP en cours de développement — non destiné à la production pour le moment.

## Fonctionnalités MVP

- [ ] Gestion multi-dossiers clients (NIF, NIS, RC, régime fiscal)
- [ ] Facturation avec numérotation séquentielle conforme par dossier
- [ ] Calcul automatique HT/TVA/TTC selon le régime du client
- [ ] Export PDF de factures conformes
- [ ] Vue calendrier des échéances déclaratives (tous dossiers confondus)
- [ ] Configuration fiscale modifiable (taux TVA, IFU, TAP, dates limites)

## Hors périmètre MVP (prévu en V2)

- Authentification multi-utilisateurs
- Synchronisation cloud entre postes
- Paiement en ligne (intégration SATIM/Edahabia)
- Télédéclaration automatique
- Export comptable avancé

## ⚠️ Avertissement fiscal

Les règles fiscales (taux TVA, seuils IFU, dates limites G50, etc.) sont centralisées dans un fichier de configuration séparé et **doivent être vérifiées et tenues à jour manuellement**, car elles évoluent chaque année avec la loi de finances. Ce projet ne garantit pas l'exactitude des règles par défaut.

## Installation

```bash
flutter pub get
flutter run -d windows
```

## Structure du projet

```
lib/
  models/        # Classes de données (Cabinet, DossierClient, Facture, etc.)
  repositories/  # Accès SQLite (CRUD par entité)
  providers/     # State management Riverpod
  screens/       # Écrans de l'application
  config/        # Règles fiscales modifiables (tax_rules.dart)
```

## Licence

Propriétaire — usage interne / commercial à définir.
