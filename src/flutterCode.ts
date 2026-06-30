export const flutterDirectoryTree = `
algeria_compta/
├── android/
├── assets/
│   └── config/
│       └── tax_rules.json         <-- Fichier de configuration modifiable
├── ios/
├── windows/                        <-- Cible prioritaire (Desktop Windows)
├── pubspec.yaml                    <-- Dépendances (sqflite_common_ffi, riverpod, pdf)
└── lib/
    ├── main.dart                   <-- Initialisation du Desktop (window_manager, sqflite)
    ├── core/
    │   ├── config/
    │   │   └── tax_rules_loader.dart <-- Service de chargement dynamique des règles fiscales
    │   ├── database/
    │   │   ├── app_database.dart   <-- Gestionnaire SQLite avec migrations
    │   │   └── database_helper.dart
    │   └── theme/
    │       └── app_theme.dart      <-- Thème épuré professionnel
    ├── models/
    │   ├── cabinet.dart
    │   ├── dossier_client.dart     <-- Régime, NIF, NIS, assujetti TVA
    │   ├── declaration.dart        <-- Échéances fiscales (G50, G12, IBS)
    │   ├── facture.dart            <-- Numérotation séquentielle bloquée
    │   └── ligne_facture.dart      <-- Calculs financiers stricts en centimes
    ├── repositories/
    │   ├── dossier_repository.dart <-- Contrats et CRUD sqflite
    │   ├── facture_repository.dart
    │   └── declaration_repository.dart
    ├── providers/
    │   ├── cabinet_provider.dart    <-- Riverpod state management
    │   ├── dossier_provider.dart
    │   ├── facture_provider.dart
    │   └── declaration_provider.dart
    ├── services/
    │   └── pdf_service.dart        <-- Générateur de factures PDF conforme (package pdf)
    └── ui/
        ├── navigation/
        │   └── navigation_rail.dart <-- Navigation adaptative Desktop
        ├── screens/
        │   ├── dossier_selector_screen.dart <-- Écran d'accueil
        │   ├── dashboard_screen.dart        <-- Métriques du dossier actif
        │   ├── dossier_edit_screen.dart      <-- Création/Édition d'un dossier client
        │   ├── invoice_list_screen.dart     <-- Gestion des factures par dossier
        │   ├── invoice_create_screen.dart   <-- Écran d'édition de facture
        │   └── calendar_screen.dart         <-- Calendrier des échéances globales
        └── widgets/
            ├── stat_card.dart
            ├── tax_deadline_tile.dart
            └── invoice_pdf_preview.dart
`;

export const taxRulesDart = `// lib/core/config/tax_rules.dart

import 'dart:convert';
import 'package:flutter/services.dart';

class TaxRules {
  final int fiscalYear;
  final Map<String, RegimeRule> regimes;
  final TvaRules tva;
  final TapRules tap;
  final IbsRules ibs;
  final List<DeadlineRule> deadlines;

  TaxRules({
    required this.fiscalYear,
    required this.regimes,
    required this.tva,
    required this.tap,
    required this.ibs,
    required this.deadlines,
  });

  factory TaxRules.fromJson(Map<String, dynamic> json) {
    var regimesMap = <String, RegimeRule>{};
    json['regimes'].forEach((key, val) {
      regimesMap[key] = RegimeRule.fromJson(val);
    });

    var deadlinesList = <DeadlineRule>[];
    json['deadlines'].forEach((v) {
      deadlinesList.add(DeadlineRule.fromJson(v));
    });

    return TaxRules(
      fiscalYear: json['fiscalYear'],
      regimes: regimesMap,
      tva: TvaRules.fromJson(json['taxes']['tva']),
      tap: TapRules.fromJson(json['taxes']['tap']),
      ibs: IbsRules.fromJson(json['taxes']['ibs']),
      deadlines: deadlinesList,
    );
  }

  // Permet de charger dynamiquement depuis les assets de l'application
  static Future<TaxRules> loadFromAssets() async {
    final jsonString = await rootBundle.loadString('assets/config/tax_rules.json');
    final jsonResponse = json.decode(jsonString);
    return TaxRules.fromJson(jsonResponse);
  }
}

class RegimeRule {
  final String name;
  final String description;
  final int thresholdDzd;
  final Map<String, double> defaultRates;
  final List<String> obligations;
  final bool collectsTva;
  final bool paysTap;

  RegimeRule({
    required this.name,
    required this.description,
    required this.thresholdDzd,
    required this.defaultRates,
    required this.obligations,
    required this.collectsTva,
    required this.paysTap,
  });

  factory RegimeRule.fromJson(Map<String, dynamic> json) {
    return RegimeRule(
      name: json['name'],
      description: json['description'],
      thresholdDzd: json['thresholdDzd'],
      defaultRates: Map<String, double>.from(json['defaultRates'] ?? {}),
      obligations: List<String>.from(json['obligations']),
      collectsTva: json['collectsTva'],
      paysTap: json['paysTap'],
    );
  }
}

class TvaRules {
  final double normalRate;
  final double reducedRate;
  final double exemptRate;

  TvaRules({
    required this.normalRate,
    required this.reducedRate,
    required this.exemptRate,
  });

  factory TvaRules.fromJson(Map<String, dynamic> json) {
    return TvaRules(
      normalRate: (json['normalRate'] as num).toDouble(),
      reducedRate: (json['reducedRate'] as num).toDouble(),
      exemptRate: (json['exemptRate'] as num).toDouble(),
    );
  }
}

class TapRules {
  final double standardRate;
  final String description;
  final bool active;
  final double rate;

  TapRules({
    required this.standardRate,
    required this.description,
    required this.active,
    required this.rate,
  });

  factory TapRules.fromJson(Map<String, dynamic> json) {
    return TapRules(
      standardRate: (json['standardRate'] as num).toDouble(),
      description: json['description'],
      active: json['active'] ?? false,
      rate: (json['rate'] as num).toDouble(),
    );
  }
}

class IbsRules {
  final Map<String, double> rates;

  IbsRules({required this.rates});

  factory IbsRules.fromJson(Map<String, dynamic> json) {
    return IbsRules(
      rates: Map<String, double>.from(json['rates'] ?? {}),
    );
  }
}

class DeadlineRule {
  final String code;
  final String name;
  final String periodicity;
  final int? dayOfMonth;
  final String? deadlineDate;
  final String description;

  DeadlineRule({
    required this.code,
    required this.name,
    required this.periodicity,
    this.dayOfMonth,
    this.deadlineDate,
    required this.description,
  });

  factory DeadlineRule.fromJson(Map<String, dynamic> json) {
    return DeadlineRule(
      code: json['code'],
      name: json['name'],
      periodicity: json['periodicity'],
      dayOfMonth: json['dayOfMonth'],
      deadlineDate: json['deadlineDate'],
      description: json['description'],
    );
  }
}
`;

export const dartModels = `// lib/models/dossier_client.dart
class DossierClient {
  final String id;
  final String raisonSociale;
  final String nif;
  final String nis;
  final String rc;
  final String adresse;
  final String activite;
  final String regime; // 'ifu' | 'reel_simplifie' | 'reel'
  final bool assujettiTva;
  final double tauxTvaParDefaut;
  final bool synced;
  final DateTime lastModified;

  DossierClient({
    required this.id,
    required this.raisonSociale,
    required this.nif,
    required this.nis,
    required this.rc,
    required this.adresse,
    required this.activite,
    required this.regime,
    required this.assujettiTva,
    required this.tauxTvaParDefaut,
    this.synced = false,
    required this.lastModified,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'raison_sociale': raisonSociale,
      'nif': nif,
      'nis': nis,
      'rc': rc,
      'adresse': adresse,
      'activite': activite,
      'regime': regime,
      'assujetti_tva': assujettiTva ? 1 : 0,
      'taux_tva_par_defaut': tauxTvaParDefaut,
      'synced': synced ? 1 : 0,
      'last_modified': lastModified.toIso8601String(),
    };
  }

  factory DossierClient.fromMap(Map<String, dynamic> map) {
    return DossierClient(
      id: map['id'],
      raisonSociale: map['raison_sociale'],
      nif: map['nif'],
      nis: map['nis'],
      rc: map['rc'],
      adresse: map['adresse'],
      activite: map['activite'],
      regime: map['regime'],
      assujettiTva: map['assujetti_tva'] == 1,
      tauxTvaParDefaut: map['taux_tva_par_defaut'] as double,
      synced: map['synced'] == 1,
      lastModified: DateTime.parse(map['last_modified']),
    );
  }
}

// lib/models/ligne_facture.dart
class LigneFacture {
  final String id;
  final String description;
  final int quantite;
  final int prixUnitaireHtCentimes; // Stocké en centimes pour éviter les floats
  final double tauxTva;

  LigneFacture({
    required this.id,
    required this.description,
    required this.quantite,
    required this.prixUnitaireHtCentimes,
    required this.tauxTva,
  });

  // Chiffre d'affaires HT de la ligne en centimes
  int get totalHtCentimes => prixUnitaireHtCentimes * quantite;

  // Montant de la TVA de la ligne en centimes
  int get totalTvaCentimes => ((totalHtCentimes * tauxTva) / 100).round();

  Map<String, dynamic> toMap(String factureId) {
    return {
      'id': id,
      'facture_id': factureId,
      'description': description,
      'quantite': quantite,
      'prix_unitaire_ht_centimes': prixUnitaireHtCentimes,
      'taux_tva': tauxTva,
    };
  }

  factory LigneFacture.fromMap(Map<String, dynamic> map) {
    return LigneFacture(
      id: map['id'],
      description: map['description'],
      quantite: map['quantite'],
      prixUnitaireHtCentimes: map['prix_unitaire_ht_centimes'],
      tauxTva: map['taux_tva'] as double,
    );
  }
}

// lib/models/facture.dart
import 'ligne_facture.dart';

class Facture {
  final String id;
  final String dossierClientId;
  final String numero; // Doit être bloqué séquentiellement après émission
  final DateTime dateEmission;
  final String clientFinalName;
  final String? clientFinalNif;
  final String? clientFinalAdresse;
  final String statut; // 'brouillon' | 'emise' | 'payee' | 'impayee'
  final String modePaiement; // 'Especes' | 'Cheque' | 'Virement' | 'Non defini'
  final String conditionsReglement;
  final List<LigneFacture> lignes;
  final bool synced;
  final DateTime lastModified;

  Facture({
    required this.id,
    required this.dossierClientId,
    required this.numero,
    required this.dateEmission,
    required this.clientFinalName,
    this.clientFinalNif,
    this.clientFinalAdresse,
    required this.statut,
    required this.modePaiement,
    required this.conditionsReglement,
    required this.lignes,
    this.synced = false,
    required this.lastModified,
  });

  // Calculs monétaires globaux stricts en centimes
  int get montantHtCentimes => lignes.fold(0, (sum, item) => sum + item.totalHtCentimes);
  
  int get montantTvaCentimes => lignes.fold(0, (sum, item) => sum + item.totalTvaCentimes);

  // TAP de 2% sur le HT si applicable (Régime réel, hors exportations exonérées)
  int getMontantTapCentimes({bool applicable = true}) {
    if (!applicable) return 0;
    return (montantHtCentimes * 0.02).round();
  }

  int getMontantTtcCentimes({bool avecTap = true}) {
    return montantHtCentimes + montantTvaCentimes + getMontantTapCentimes(applicable: avecTap);
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'dossier_client_id': dossierClientId,
      'numero': numero,
      'date_emission': dateEmission.toIso8601String(),
      'client_final_name': clientFinalName,
      'client_final_nif': clientFinalNif,
      'client_final_adresse': clientFinalAdresse,
      'statut': statut,
      'mode_paiement': modePaiement,
      'conditions_reglement': conditionsReglement,
      'synced': synced ? 1 : 0,
      'last_modified': lastModified.toIso8601String(),
    };
  }

  factory Facture.fromMap(Map<String, dynamic> map, List<LigneFacture> lines) {
    return Facture(
      id: map['id'],
      dossierClientId: map['dossier_client_id'],
      numero: map['numero'],
      dateEmission: DateTime.parse(map['date_emission']),
      clientFinalName: map['client_final_name'],
      clientFinalNif: map['client_final_nif'],
      clientFinalAdresse: map['client_final_adresse'],
      statut: map['statut'],
      modePaiement: map['mode_paiement'],
      conditionsReglement: map['conditions_reglement'] ?? '',
      lignes: lines,
      synced: map['synced'] == 1,
      lastModified: DateTime.parse(map['last_modified']),
    );
  }
}

// lib/models/declaration.dart
class Declaration {
  final String id;
  final String dossierClientId;
  final String type; // 'G50' | 'G12_PREV' | 'G12_DEF' | 'LIASSE_ANNUELLE'
  final String periode;
  final DateTime dateLimite;
  final String statut; // 'todo' | 'deposee' | 'en_retard'
  final int montantCentimes;
  final String? notes;
  final bool synced;
  final DateTime lastModified;

  Declaration({
    required this.id,
    required this.dossierClientId,
    required this.type,
    required this.periode,
    required this.dateLimite,
    required this.statut,
    required this.montantCentimes,
    this.notes,
    this.synced = false,
    required this.lastModified,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'dossier_client_id': dossierClientId,
      'type': type,
      'periode': periode,
      'date_limite': dateLimite.toIso8601String(),
      'statut': statut,
      'montant_centimes': montantCentimes,
      'notes': notes,
      'synced': synced ? 1 : 0,
      'last_modified': lastModified.toIso8601String(),
    };
  }

  factory Declaration.fromMap(Map<String, dynamic> map) {
    return Declaration(
      id: map['id'],
      dossierClientId: map['dossier_client_id'],
      type: map['type'],
      periode: map['periode'],
      dateLimite: DateTime.parse(map['date_limite']),
      statut: map['statut'],
      montantCentimes: map['montant_centimes'],
      notes: map['notes'],
      synced: map['synced'] == 1,
      lastModified: DateTime.parse(map['last_modified']),
    );
  }
}
`;

export const sqliteSchemaAndMigration = `// lib/core/database/app_database.dart

import 'package:sqflite_common_ffi/sqflite_ffi.dart';
import 'package:path/path.dart';
import 'dart:io';

class AppDatabase {
  static final AppDatabase instance = AppDatabase._init();
  static Database? _database;

  AppDatabase._init();

  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDB('algeria_compta.db');
    return _database!;
  }

  Future<Database> _initDB(String filePath) async {
    // Initialise sqflite pour le Desktop (Windows/macOS/Linux)
    if (Platform.isWindows || Platform.isLinux || Platform.isMacOS) {
      sqfliteFfiInit();
      databaseFactory = databaseFactoryFfi;
    }

    final dbPath = await getDatabasesPath();
    final path = join(dbPath, filePath);

    return await openDatabase(
      path,
      version: 1, // Version 1 du MVP
      onCreate: _createDB,
      onUpgrade: _upgradeDB,
    );
  }

  // Schéma de base de données initial
  Future _createDB(Database db, int version) async {
    // Table Cabinet (Infos de l'utilisateur principal)
    await db.execute('''
      CREATE TABLE cabinet (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        agrement TEXT NOT NULL,
        address TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT NOT NULL
      )
    ''');

    // Table DossierClient
    await db.execute('''
      CREATE TABLE dossier_client (
        id TEXT PRIMARY KEY,
        raison_sociale TEXT NOT NULL,
        nif TEXT NOT NULL,
        nis TEXT NOT NULL,
        rc TEXT NOT NULL,
        adresse TEXT NOT NULL,
        activite TEXT NOT NULL,
        regime TEXT NOT NULL,
        assujetti_tva INTEGER NOT NULL,
        taux_tva_par_defaut REAL NOT NULL,
        synced INTEGER NOT NULL DEFAULT 0,
        last_modified TEXT NOT NULL
      )
    ''');

    // Table Facture
    await db.execute('''
      CREATE TABLE facture (
        id TEXT PRIMARY KEY,
        dossier_client_id TEXT NOT NULL,
        numero TEXT NOT NULL,
        date_emission TEXT NOT NULL,
        client_final_name TEXT NOT NULL,
        client_final_nif TEXT,
        client_final_adresse TEXT,
        statut TEXT NOT NULL,
        mode_paiement TEXT NOT NULL,
        conditions_reglement TEXT,
        synced INTEGER NOT NULL DEFAULT 0,
        last_modified TEXT NOT NULL,
        FOREIGN KEY (dossier_client_id) REFERENCES dossier_client (id) ON DELETE CASCADE
      )
    ''');

    // Table LigneFacture
    await db.execute('''
      CREATE TABLE ligne_facture (
        id TEXT PRIMARY KEY,
        facture_id TEXT NOT NULL,
        description TEXT NOT NULL,
        quantite INTEGER NOT NULL,
        prix_unitaire_ht_centimes INTEGER NOT NULL,
        taux_tva REAL NOT NULL,
        FOREIGN KEY (facture_id) REFERENCES facture (id) ON DELETE CASCADE
      )
    ''');

    // Table Declaration (Suivi des obligations fiscales)
    await db.execute('''
      CREATE TABLE declaration (
        id TEXT PRIMARY KEY,
        dossier_client_id TEXT NOT NULL,
        type TEXT NOT NULL,
        periode TEXT NOT NULL,
        date_limite TEXT NOT NULL,
        statut TEXT NOT NULL,
        montant_centimes INTEGER NOT NULL,
        notes TEXT,
        synced INTEGER NOT NULL DEFAULT 0,
        last_modified TEXT NOT NULL,
        FOREIGN KEY (dossier_client_id) REFERENCES dossier_client (id) ON DELETE CASCADE
      )
    ''');

    // Insertion du cabinet par défaut au premier démarrage
    await db.insert('cabinet', {
      'id': 'main_cabinet',
      'name': 'Mon Cabinet Comptable',
      'agrement': 'Agrément National N° 2026/019',
      'address': 'Alger Centre, Alger',
      'phone': '021 00 00 00',
      'email': 'cabinet@compta.dz'
    });
  }

  // Script d'évolution future (V2 avec sync cloud, indexation, etc.)
  Future _upgradeDB(Database db, int oldVersion, int newVersion) async {
    if (oldVersion < 2) {
      // Exemple de migration pour la version 2
      // await db.execute('ALTER TABLE dossier_client ADD COLUMN code_dossier TEXT');
    }
  }
}
`;

export const repositoriesDart = `// lib/repositories/dossier_repository.dart
import '../models/dossier_client.dart';
import '../core/database/app_database.dart';

abstract class DossierRepository {
  Future<List<DossierClient>> getAllDossiers();
  Future<DossierClient?> getDossierById(String id);
  Future<void> insertDossier(DossierClient dossier);
  Future<void> updateDossier(DossierClient dossier);
  Future<void> deleteDossier(String id);
}

class SqliteDossierRepository implements DossierRepository {
  final _dbProvider = AppDatabase.instance;

  @override
  Future<List<DossierClient>> getAllDossiers() async {
    final db = await _dbProvider.database;
    final res = await db.query('dossier_client', orderBy: 'raison_sociale ASC');
    return res.isNotEmpty ? res.map((entry) => DossierClient.fromMap(entry)).toList() : [];
  }

  @override
  Future<DossierClient?> getDossierById(String id) async {
    final db = await _dbProvider.database;
    final res = await db.query('dossier_client', where: 'id = ?', whereArgs: [id]);
    return res.isNotEmpty ? DossierClient.fromMap(res.first) : null;
  }

  @override
  Future<void> insertDossier(DossierClient dossier) async {
    final db = await _dbProvider.database;
    await db.insert('dossier_client', dossier.toMap());
  }

  @override
  Future<void> updateDossier(DossierClient dossier) async {
    final db = await _dbProvider.database;
    await db.update(
      'dossier_client',
      dossier.toMap(),
      where: 'id = ?',
      whereArgs: [dossier.id],
    );
  }

  @override
  Future<void> deleteDossier(String id) async {
    final db = await _dbProvider.database;
    await db.delete('dossier_client', where: 'id = ?', whereArgs: [id]);
  }
}

// lib/repositories/facture_repository.dart
import '../models/facture.dart';
import '../models/ligne_facture.dart';
import '../core/database/app_database.dart';

abstract class FactureRepository {
  Future<List<Facture>> getFacturesByDossier(String dossierId);
  Future<int> getNextInvoiceSequentialNumber(String dossierId, int year);
  Future<void> saveFacture(Facture facture);
  Future<void> deleteFacture(String id);
}

class SqliteFactureRepository implements FactureRepository {
  final _dbProvider = AppDatabase.instance;

  @override
  Future<List<Facture>> getFacturesByDossier(String dossierId) async {
    final db = await _dbProvider.database;
    
    // Récupérer les factures
    final facturesRes = await db.query(
      'facture',
      where: 'dossier_client_id = ?',
      whereArgs: [dossierId],
      orderBy: 'date_emission DESC'
    );

    List<Facture> list = [];
    for (var fMap in facturesRes) {
      // Récupérer les lignes associées
      final linesRes = await db.query(
        'ligne_facture',
        where: 'facture_id = ?',
        whereArgs: [fMap['id']]
      );
      
      List<LigneFacture> lines = linesRes.map((l) => LigneFacture.fromMap(l)).toList();
      list.add(Facture.fromMap(fMap, lines));
    }
    return list;
  }

  @override
  Future<int> getNextInvoiceSequentialNumber(String dossierId, int year) async {
    final db = await _dbProvider.database;
    
    // Compter les factures émises ou payées pour ce dossier et cette année
    final res = await db.rawQuery('''
      SELECT COUNT(*) as count FROM facture 
      WHERE dossier_client_id = ? 
      AND numero != 'BROUILLON' 
      AND strftime('%Y', date_emission) = ?
    ''', [dossierId, year.toString()]);
    
    int count = res.first['count'] as int? ?? 0;
    return count + 1;
  }

  @override
  Future<void> saveFacture(Facture facture) async {
    final db = await _dbProvider.database;
    
    // Exécuter dans une transaction pour garantir la cohérence
    await db.transaction((txn) async {
      // Insérer ou remplacer la facture
      await txn.insert('facture', facture.toMap(), conflictAlgorithm: ConflictAlgorithm.replace);
      
      // Supprimer les anciennes lignes
      await txn.delete('ligne_facture', where: 'facture_id = ?', whereArgs: [facture.id]);
      
      // Insérer les nouvelles lignes
      for (var line in facture.lignes) {
        await txn.insert('ligne_facture', line.toMap(facture.id));
      }
    });
  }

  @override
  Future<void> deleteFacture(String id) async {
    final db = await _dbProvider.database;
    await db.delete('facture', where: 'id = ?', whereArgs: [id]);
  }
}
`;

export const riverpodProviders = `// lib/providers/dossier_provider.dart

import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/dossier_client.dart';
import '../repositories/dossier_repository.dart';

// Provider pour l'instance du Repository
final dossierRepositoryProvider = Provider<DossierRepository>((ref) {
  return SqliteDossierRepository();
});

// StateNotifier pour gérer la liste des dossiers
class DossiersNotifier extends StateNotifier<AsyncValue<List<DossierClient>>> {
  final DossierRepository _repository;

  DossiersNotifier(this._repository) : super(const AsyncValue.loading()) {
    loadDossiers();
  }

  Future<void> loadDossiers() async {
    state = const AsyncValue.loading();
    try {
      final list = await _repository.getAllDossiers();
      state = AsyncValue.data(list);
    } catch (err, stack) {
      state = AsyncValue.error(err, stack);
    }
  }

  Future<void> addDossier(DossierClient dossier) async {
    try {
      await _repository.insertDossier(dossier);
      await loadDossiers();
    } catch (err, stack) {
      state = AsyncValue.error(err, stack);
    }
  }

  Future<void> updateDossier(DossierClient dossier) async {
    try {
      await _repository.updateDossier(dossier);
      await loadDossiers();
    } catch (err, stack) {
      state = AsyncValue.error(err, stack);
    }
  }

  Future<void> removeDossier(String id) async {
    try {
      await _repository.deleteDossier(id);
      await loadDossiers();
    } catch (err, stack) {
      state = AsyncValue.error(err, stack);
    }
  }
}

// Provider global accessible par l'UI
final dossiersListProvider = StateNotifierProvider<DossiersNotifier, AsyncValue<List<DossierClient>>>((ref) {
  final repo = ref.watch(dossierRepositoryProvider);
  return DossiersNotifier(repo);
});

// Provider pour mémoriser le dossier actuellement sélectionné (Dossier Actif)
final activeDossierIdProvider = StateProvider<String?>((ref) => null);

final activeDossierProvider = Provider<DossierClient?>((ref) {
  final dossiersAsync = ref.watch(dossiersListProvider);
  final activeId = ref.watch(activeDossierIdProvider);
  
  if (activeId == null) return null;
  
  return dossiersAsync.maybeWhen(
    data: (list) => list.firstWhere((doc) => doc.id == activeId),
    orElse: () => null,
  );
});
`;

export const pdfGeneratorService = `// lib/services/pdf_service.dart

import 'dart:io';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import '../models/cabinet.dart';
import '../models/dossier_client.dart';
import '../models/facture.dart';

class PdfInvoiceGenerator {
  
  static Future<pw.Document> generateDocument({
    required Cabinet cabinet,
    required DossierClient dossier,
    required Facture facture,
    required bool applyTap,
  }) async {
    final pdf = pw.Document();

    // Configuration du style général (police de caractères)
    final font = await PdfGoogleFonts.openSansRegular();
    final fontBold = await PdfGoogleFonts.openSansBold();

    pdf.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(36),
        build: (pw.Context context) {
          return [
            // ENTÊTE CABINET
            pw.Row(
              mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
              crossAxisAlignment: pw.CrossAxisAlignment.start,
              children: [
                pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    pw.Text(cabinet.name, style: pw.TextStyle(font: fontBold, fontSize: 14)),
                    pw.Text(cabinet.agrement, style: pw.TextStyle(font: font, fontSize: 10, color: PdfColors.grey700)),
                    pw.Text(cabinet.address, style: pw.TextStyle(font: font, fontSize: 9)),
                    pw.Text("Tél: \${cabinet.phone}", style: pw.TextStyle(font: font, fontSize: 9)),
                    pw.Text("Email: \${cabinet.email}", style: pw.TextStyle(font: font, fontSize: 9)),
                  ],
                ),
                pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.end,
                  children: [
                    pw.Container(
                      padding: const pw.EdgeInsets.all(6),
                      decoration: pw.BoxDecoration(
                        border: pw.Border.all(color: PdfColors.blue800, width: 2),
                      ),
                      child: pw.Text(
                        "FACTURE",
                        style: pw.TextStyle(font: fontBold, fontSize: 16, color: PdfColors.blue800),
                      ),
                    ),
                    pw.SizedBox(height: 8),
                    pw.Text("N°: \${facture.numero}", style: pw.TextStyle(font: fontBold, fontSize: 12)),
                    pw.Text("Date: \${facture.dateEmission.toLocal().toString().substring(0, 10)}", style: pw.TextStyle(font: font, fontSize: 10)),
                  ],
                )
              ],
            ),
            pw.Divider(thickness: 1, color: PdfColors.grey400),
            pw.SizedBox(height: 15),

            // INFORMATIONS ÉMETTEUR & CLIENT
            pw.Row(
              mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
              crossAxisAlignment: pw.CrossAxisAlignment.start,
              children: [
                // Prestataire (Dossier du cabinet)
                pw.Expanded(
                  child: pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text("ÉMETTEUR (PRESTATAIRE):", style: pw.TextStyle(font: fontBold, fontSize: 10, color: PdfColors.blue900)),
                      pw.SizedBox(height: 4),
                      pw.Text(dossier.raisonSociale, style: pw.TextStyle(font: fontBold, fontSize: 11)),
                      pw.Text("Adresse: \${dossier.adresse}", style: pw.TextStyle(font: font, fontSize: 9)),
                      pw.Text("NIF: \${dossier.nif}", style: pw.TextStyle(font: font, fontSize: 9)),
                      pw.Text("NIS: \${dossier.nis}", style: pw.TextStyle(font: font, fontSize: 9)),
                      pw.Text("RC: \${dossier.rc}", style: pw.TextStyle(font: font, fontSize: 9)),
                      pw.Text("Régime: \${dossier.regime.toUpperCase()}", style: pw.TextStyle(font: font, fontSize: 9)),
                    ],
                  ),
                ),
                pw.SizedBox(width: 20),
                // Client Final
                pw.Expanded(
                  child: pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text("CLIENT:", style: pw.TextStyle(font: fontBold, fontSize: 10, color: PdfColors.blue900)),
                      pw.SizedBox(height: 4),
                      pw.Text(facture.clientFinalName, style: pw.TextStyle(font: fontBold, fontSize: 11)),
                      pw.Text("Adresse: \${facture.clientFinalAdresse ?? 'Non spécifiée'}", style: pw.TextStyle(font: font, fontSize: 9)),
                      if (facture.clientFinalNif != null)
                        pw.Text("NIF Client: \${facture.clientFinalNif}", style: pw.TextStyle(font: font, fontSize: 9)),
                    ],
                  ),
                ),
              ],
            ),
            pw.SizedBox(height: 25),

            // TABLEAU DES LIGNES DE FACTURATION
            pw.Table(
              border: pw.TableBorder.all(color: PdfColors.grey300, width: 0.5),
              columnWidths: const {
                0: pw.FlexColumnWidth(4), // Description
                1: pw.FlexColumnWidth(1), // Qté
                2: pw.FlexColumnWidth(2), // PU HT
                3: pw.FlexColumnWidth(1), // TVA
                4: pw.FlexColumnWidth(2), // Total HT
              },
              children: [
                // En-tête de table
                pw.TableRow(
                  decoration: const pw.BoxDecoration(color: PdfColors.blue100),
                  children: [
                    _cell("Désignation des prestations", fontBold, true),
                    _cell("Qté", fontBold, true, align: pw.TextAlign.center),
                    _cell("P.U HT (DA)", fontBold, true, align: pw.TextAlign.right),
                    _cell("TVA", fontBold, true, align: pw.TextAlign.center),
                    _cell("Total HT (DA)", fontBold, true, align: pw.TextAlign.right),
                  ]
                ),
                // Lignes de facture
                ...facture.lignes.map((line) {
                  return pw.TableRow(
                    children: [
                      _cell(line.description, font, false),
                      _cell(line.quantite.toString(), font, false, align: pw.TextAlign.center),
                      _cell((line.prixUnitaireHtCentimes / 100).toStringAsFixed(2), font, false, align: pw.TextAlign.right),
                      _cell("\${line.tauxTva.round()}%", font, false, align: pw.TextAlign.center),
                      _cell((line.totalHtCentimes / 100).toStringAsFixed(2), font, false, align: pw.TextAlign.right),
                    ]
                  );
                }).toList(),
              ]
            ),
            pw.SizedBox(height: 20),

            // SYNTHÈSE FINANCIÈRE (CADRE DE CALCUL)
            pw.Row(
              mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
              crossAxisAlignment: pw.CrossAxisAlignment.start,
              children: [
                // Mode de règlement & Conditions légales
                pw.Expanded(
                  flex: 3,
                  child: pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text("Mode de Paiement: \${facture.modePaiement}", style: pw.TextStyle(font: font, fontSize: 9)),
                      pw.Text("Conditions: \${facture.conditionsReglement}", style: pw.TextStyle(font: font, fontSize: 9, color: PdfColors.grey700)),
                      pw.SizedBox(height: 10),
                      pw.Text(
                        "Mention légale: Chiffre d'affaires arrêté conformément au code fiscal algérien.",
                        style: pw.TextStyle(font: font, fontSize: 8, italic: true, color: PdfColors.grey600),
                      ),
                    ],
                  ),
                ),
                // Totaux financiers
                pw.Expanded(
                  flex: 2,
                  child: pw.Column(
                    children: [
                      _totalRow("Total Général HT", facture.montantHtCentimes / 100, font),
                      _totalRow("Total TVA", facture.montantTvaCentimes / 100, font),
                      if (applyTap)
                        _totalRow("TAP (2%)", facture.getMontantTapCentimes() / 100, font),
                      pw.Divider(thickness: 1, color: PdfColors.grey500),
                      _totalRow(
                        "NET À PAYER TTC",
                        facture.getMontantTtcCentimes(avecTap: applyTap) / 100,
                        fontBold,
                        color: PdfColors.blue900,
                        size: 11
                      ),
                    ],
                  ),
                ),
              ],
            ),
            pw.SizedBox(height: 40),

            // SIGNATURE & CACHET
            pw.Row(
              mainAxisAlignment: pw.MainAxisAlignment.end,
              children: [
                pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.center,
                  children: [
                    pw.Text("Le Comptable Agréé", style: pw.TextStyle(font: fontBold, fontSize: 10)),
                    pw.Text("Signature & Cachet", style: pw.TextStyle(font: font, fontSize: 9, color: PdfColors.grey700)),
                    pw.SizedBox(height: 50),
                    pw.Container(
                      width: 120,
                      height: 1,
                      color: PdfColors.grey400,
                    )
                  ],
                )
              ],
            )
          ];
        },
      ),
    );

    return pdf;
  }

  static pw.Widget _cell(String text, pw.Font font, bool isHeader, {pw.TextAlign align = pw.TextAlign.left}) {
    return pw.Padding(
      padding: const pw.EdgeInsets.all(6),
      child: pw.Text(
        text,
        textAlign: align,
        style: pw.TextStyle(
          font: font,
          fontSize: isHeader ? 9 : 8,
          color: isHeader ? PdfColors.blue950 : PdfColors.black,
        ),
      ),
    );
  }

  static pw.Widget _totalRow(String title, double value, pw.Font font, {PdfColor color = PdfColors.black, double size = 9}) {
    return pw.Padding(
      padding: const pw.EdgeInsets.symmetric(vertical: 2),
      child: pw.Row(
        mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
        children: [
          pw.Text(title, style: pw.TextStyle(font: font, fontSize: size, color: color)),
          pw.Text("\${value.toStringAsFixed(2)} DA", style: pw.TextStyle(font: font, fontSize: size, color: color)),
        ],
      ),
    );
  }

  // Permet de lancer l'impression système ou de sauvegarder le fichier PDF sous Windows
  static Future<void> printInvoice(pw.Document doc) async {
    await Printing.layoutPdf(
      onLayout: (PdfPageFormat format) async => doc.save(),
    );
  }
}
`;
