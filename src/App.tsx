import React, { useState, useEffect, useRef } from 'react';
import { 
  Building2, Users, Receipt, Calendar, Calculator, Sparkles, Send, 
  CheckCircle2, AlertTriangle, Clock, Plus, Search, ChevronRight, 
  Trash2, FileText, Download, Edit, Printer, Info, Check, ShieldCheck, 
  Database, RefreshCw, FileCode, ArrowLeft, HelpCircle, X, ExternalLink,
  Settings
} from 'lucide-react';
import { 
  initialCabinet, 
  initialDossiers, 
  initialFactures, 
  initialDeclarations, 
  DossierClient, 
  Facture, 
  Declaration, 
  LigneFacture,
  formatDA, 
  numberToWordsFR 
} from './mockData';
import { 
  flutterDirectoryTree, 
  taxRulesDart, 
  dartModels, 
  sqliteSchemaAndMigration, 
  repositoriesDart, 
  riverpodProviders, 
  pdfGeneratorService 
} from './flutterCode';
import taxRulesJson from './tax_rules.json';

export default function App() {
  // Global States
  const [cabinet, setCabinet] = useState(initialCabinet);
  const [dossiers, setDossiers] = useState<DossierClient[]>(initialDossiers);
  const [factures, setFactures] = useState<Facture[]>(initialFactures);
  const [declarations, setDeclarations] = useState<Declaration[]>(initialDeclarations);
  
  // Navigation States
  const [selectedDossierId, setSelectedDossierId] = useState<string | null>("dos_1");
  const [activeTab, setActiveTab] = useState<'dashboard' | 'dossiers' | 'factures' | 'calendrier' | 'flutter'>('dashboard');
  
  // Search and Filter States
  const [dossierSearch, setDossierSearch] = useState('');
  const [invoiceSearch, setInvoiceSearch] = useState('');
  
  // Interactive Modal / Form States
  const [isDossierModalOpen, setIsDossierModalOpen] = useState(false);
  const [editingDossier, setEditingDossier] = useState<DossierClient | null>(null);
  
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [activeInvoiceForView, setActiveInvoiceForView] = useState<Facture | null>(null);
  
  // Tax Rules State (from separate JSON, fully modifiable in-app)
  const [taxRules, setTaxRules] = useState(taxRulesJson);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);

  // Cabinet Settings State
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [cabinetForm, setCabinetForm] = useState({
    name: cabinet.name,
    agrement: cabinet.agrement,
    address: cabinet.address,
    phone: cabinet.phone,
    email: cabinet.email
  });

  // Sync cabinetForm when cabinet changes
  useEffect(() => {
    setCabinetForm({
      name: cabinet.name,
      agrement: cabinet.agrement,
      address: cabinet.address,
      phone: cabinet.phone,
      email: cabinet.email
    });
  }, [cabinet]);

  // New Dossier Form State
  const [dossierForm, setDossierForm] = useState({
    raisonSociale: '',
    nif: '',
    nis: '',
    rc: '',
    adresse: '',
    activite: '',
    regime: 'reel_simplifie' as 'ifu' | 'reel_simplifie' | 'reel',
    assujettiTva: true,
    tauxTvaParDefaut: 19
  });

  // New Invoice Form State
  const [invoiceForm, setInvoiceForm] = useState({
    clientFinalName: '',
    clientFinalNif: '',
    clientFinalAdresse: '',
    modePaiement: 'Virement' as 'Especes' | 'Cheque' | 'Virement' | 'Non defini',
    conditionsReglement: 'Paiement à la réception',
    applyTap: true,
    lignes: [] as Omit<LigneFacture, 'id' | 'totalHtCentimes'>[]
  });
  
  // Dynamic temporary line for new invoices
  const [tempLine, setTempLine] = useState({
    description: '',
    quantite: 1,
    prixUnitaireHtDA: ''
  });

  // AI Assistant States
  const [aiQuery, setAiQuery] = useState('');
  const [aiThoughts, setAiThoughts] = useState<string>('');
  const [aiResponse, setAiResponse] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showAiSidebar, setShowAiSidebar] = useState(false);
  
  // Active Dossier object
  const activeDossier = dossiers.find(d => d.id === selectedDossierId) || null;

  // Sync animation helper
  const [syncing, setSyncing] = useState(false);
  const triggerSync = () => {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      // set all unsynced dossiers/invoices to synced
      setDossiers(prev => prev.map(d => ({ ...d, synced: true })));
      setFactures(prev => prev.map(f => ({ ...f, synced: true })));
      setDeclarations(prev => prev.map(dec => ({ ...dec, synced: true })));
    }, 1500);
  };

  // Tax Code preset assistant queries
  const aiPresets = [
    { label: "Quelles sont les exonérations de TAP en 2026 ?", query: "Présente un résumé détaillé de la TAP (Taxe sur l'Activité Professionnelle) en Algérie pour l'année 2026. Précise quelles activités sont totalement exonérées (ex: exportations, activités productives sous ANADE, etc.) conformément aux dernières lois de finances." },
    { label: "Régime IFU : seuils et taux applicables", query: "Explique le fonctionnement de l'IFU (Impôt Forfaitaire Unique) en Algérie : Quel est le seuil de chiffre d'affaires actuel (8 millions DA ?) ? Quels sont les taux d'imposition selon que l'activité est d'achat-revente ou de prestations de services ? Est-ce que le contribuable à l'IFU collecte de la TVA ?" },
    { label: "Déclaration G50 : Règles de retard et dates limites", query: "Quelles sont les obligations déclaratives liées à la G50 mensuelle ? Date limite de dépôt (20 du mois suivant ?), pénalités de retard applicables en cas de dépôt tardif, et comment est calculée la TAP ou l'IRG/Salaires sur ce formulaire ?" }
  ];

  // Submit AI Query
  const askAiAssistant = async (queryText: string) => {
    if (!queryText.trim() || isAiLoading) return;
    setIsAiLoading(true);
    setAiResponse('');
    setAiThoughts('');
    setAiQuery(queryText);

    try {
      const res = await fetch('/api/gemini-thinking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: queryText })
      });
      const data = await res.json();
      if (res.ok) {
        setAiResponse(data.text);
        setAiThoughts(data.thoughts);
      } else {
        setAiResponse(`Erreur : ${data.error || "Impossible d'obtenir une réponse."}`);
      }
    } catch (err) {
      console.error(err);
      setAiResponse("Une erreur réseau s'est produite. Veuillez vérifier la connexion au serveur.");
    } finally {
      setIsAiLoading(false);
    }
  };

  // Save new or edited Dossier Client
  const handleSaveDossier = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingDossier) {
      setDossiers(prev => prev.map(d => d.id === editingDossier.id ? {
        ...d,
        ...dossierForm,
        lastModified: new Date().toISOString(),
        synced: false
      } : d));
    } else {
      const newDossier: DossierClient = {
        id: `dos_${Date.now()}`,
        ...dossierForm,
        synced: false,
        lastModified: new Date().toISOString()
      };
      setDossiers(prev => [...prev, newDossier]);
      
      // Auto-generate standard declarations for the newly created dossier
      const currentYear = new Date().getFullYear();
      if (dossierForm.regime === 'ifu') {
        const newDec: Declaration = {
          id: `dec_${Date.now()}_ifu`,
          dossierClientId: newDossier.id,
          type: 'G12_PREV',
          periode: `Année ${currentYear}`,
          dateLimite: `${currentYear}-06-30`,
          statut: 'todo',
          montantCentimes: 0,
          notes: 'Déclaration prévisionnelle IFU générée automatiquement',
          synced: false,
          lastModified: new Date().toISOString()
        };
        setDeclarations(prev => [...prev, newDec]);
      } else {
        const months = ['Juillet', 'Août', 'Septembre'];
        const newDecs = months.map((m, idx) => ({
          id: `dec_${Date.now()}_${idx}`,
          dossierClientId: newDossier.id,
          type: 'G50' as const,
          periode: `${m} ${currentYear}`,
          dateLimite: `${currentYear}-0${8 + idx}-20`,
          statut: 'todo' as const,
          montantCentimes: 0,
          notes: `Déclaration G50 pour la période de ${m}`,
          synced: false,
          lastModified: new Date().toISOString()
        }));
        setDeclarations(prev => [...prev, ...newDecs]);
      }
      setSelectedDossierId(newDossier.id);
    }
    setIsDossierModalOpen(false);
    setEditingDossier(null);
  };

  // Save Cabinet settings
  const handleSaveCabinetSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setCabinet(cabinetForm);
    setIsSettingsModalOpen(false);
  };

  // Clear all draft invoices globally to keep database lean
  const handleClearDraftInvoices = () => {
    const draftCount = factures.filter(f => f.statut === 'brouillon').length;
    if (draftCount === 0) {
      alert("Aucune facture de type 'Brouillon' n'a été trouvée.");
      return;
    }
    if (confirm(`Voulez-vous vraiment supprimer définitivement les ${draftCount} brouillons de factures ? Cette action est irréversible.`)) {
      setFactures(prev => prev.filter(f => f.statut !== 'brouillon'));
      alert(`${draftCount} brouillon(s) de facture(s) supprimé(s) avec succès pour alléger la base locale.`);
    }
  };

  // Archive completed declarations globally (remove deposee ones to keep database lean)
  const handleArchiveCompletedDeclarations = () => {
    const completedCount = declarations.filter(d => d.statut === 'deposee').length;
    if (completedCount === 0) {
      alert("Aucune déclaration 'Déposée' à archiver.");
      return;
    }
    if (confirm(`Voulez-vous archiver et purger les ${completedCount} déclarations déposées pour alléger la base de données locale ?`)) {
      setDeclarations(prev => prev.filter(d => d.statut !== 'deposee'));
      alert(`${completedCount} déclaration(s) déposée(s) archivée(s) et purgée(s) avec succès.`);
    }
  };

  // Convert a draft invoice into an emitted, sequential numbered invoice
  const handleEmitDraft = (id: string) => {
    const invoice = factures.find(f => f.id === id);
    if (!invoice) return;
    if (invoice.lignes.length === 0) {
      alert("Cette facture brouillon ne contient aucune prestation. Veuillez la recréer avec des lignes de prestations pour l'émettre.");
      return;
    }

    const currentYear = new Date().getFullYear();
    const currentYearShort = currentYear.toString().slice(-2);
    
    // Calculate sequential invoice number for this specific dossier
    const emittedInvoicesThisYear = factures.filter(f => 
      f.dossierClientId === invoice.dossierClientId && 
      f.numero !== "BROUILLON" &&
      f.dateEmission.startsWith(currentYear.toString())
    );
    const sequentialNum = (emittedInvoicesThisYear.length + 1).toString().padStart(3, '0');
    const computedInvoiceNumber = `F${currentYearShort}-${sequentialNum}`;

    setFactures(prev => prev.map(f => f.id === id ? {
      ...f,
      numero: computedInvoiceNumber,
      statut: 'emise',
      dateEmission: new Date().toISOString().split('T')[0],
      lastModified: new Date().toISOString(),
      synced: false
    } : f));

    alert(`La facture a été émise avec succès sous le numéro séquentiel ${computedInvoiceNumber}.`);
  };

  // Save the invoice in memory as a draft
  const handleSaveInvoiceAsDraft = () => {
    if (!selectedDossierId || !activeDossier) return;
    if (!invoiceForm.clientFinalName.trim()) {
      alert("Veuillez saisir au moins la raison sociale du Client Final pour enregistrer un brouillon.");
      return;
    }

    // Calculations in centimes
    let montantHtCentimes = 0;
    let montantTvaCentimes = 0;
    
    const finalLines: LigneFacture[] = invoiceForm.lignes.map((l, index) => {
      const lineHt = l.prixUnitaireHtCentimes * l.quantite;
      const lineTva = activeDossier.assujettiTva ? Math.round(lineHt * (l.tauxTva / 100)) : 0;
      
      montantHtCentimes += lineHt;
      montantTvaCentimes += lineTva;
      
      return {
        id: `l_${Date.now()}_${index}`,
        ...l,
        totalHtCentimes: lineHt
      };
    });

    const isReel = activeDossier.regime === 'reel' || activeDossier.regime === 'reel_simplifie';
    const applyTap = invoiceForm.applyTap && isReel;
    const montantTapCentimes = applyTap ? Math.round(montantHtCentimes * 0.02) : 0;
    const montantTtcCentimes = montantHtCentimes + montantTvaCentimes + montantTapCentimes;

    const newInvoice: Facture = {
      id: `fac_${Date.now()}`,
      dossierClientId: selectedDossierId,
      numero: "BROUILLON",
      dateEmission: new Date().toISOString().split('T')[0],
      clientFinalName: invoiceForm.clientFinalName,
      clientFinalNif: invoiceForm.clientFinalNif || undefined,
      clientFinalAdresse: invoiceForm.clientFinalAdresse || undefined,
      statut: 'brouillon',
      modePaiement: invoiceForm.modePaiement,
      conditionsReglement: invoiceForm.conditionsReglement,
      lignes: finalLines,
      montantHtCentimes,
      montantTvaCentimes,
      montantTapCentimes,
      montantTtcCentimes,
      synced: false,
      lastModified: new Date().toISOString()
    };

    setFactures(prev => [newInvoice, ...prev]);
    setIsInvoiceModalOpen(false);
    
    // Clear form
    setInvoiceForm({
      clientFinalName: '',
      clientFinalNif: '',
      clientFinalAdresse: '',
      modePaiement: 'Virement',
      conditionsReglement: 'Paiement à la réception',
      applyTap: true,
      lignes: []
    });
  };

  // Open Dossier Editor Modal
  const openDossierEdit = (dossier: DossierClient) => {
    setEditingDossier(dossier);
    setDossierForm({
      raisonSociale: dossier.raisonSociale,
      nif: dossier.nif,
      nis: dossier.nis,
      rc: dossier.rc,
      adresse: dossier.adresse,
      activite: dossier.activite,
      regime: dossier.regime,
      assujettiTva: dossier.assujettiTva,
      tauxTvaParDefaut: dossier.tauxTvaParDefaut
    });
    setIsDossierModalOpen(true);
  };

  // Open Dossier Creator Modal
  const openDossierCreate = () => {
    setEditingDossier(null);
    setDossierForm({
      raisonSociale: '',
      nif: '',
      nis: '',
      rc: '',
      adresse: '',
      activite: '',
      regime: 'reel_simplifie',
      assujettiTva: true,
      tauxTvaParDefaut: 19
    });
    setIsDossierModalOpen(true);
  };

  // Manage temporary invoice lines
  const handleAddTempLine = () => {
    const puDA = parseFloat(tempLine.prixUnitaireHtDA);
    if (!tempLine.description.trim() || isNaN(puDA) || puDA <= 0 || tempLine.quantite <= 0) return;
    
    const prixUnitaireHtCentimes = Math.round(puDA * 100);
    const tauxTva = activeDossier?.assujettiTva ? activeDossier.tauxTvaParDefaut : 0;
    
    setInvoiceForm(prev => ({
      ...prev,
      lignes: [...prev.lignes, {
        description: tempLine.description,
        quantite: tempLine.quantite,
        prixUnitaireHtCentimes,
        tauxTva
      }]
    }));
    
    setTempLine({
      description: '',
      quantite: 1,
      prixUnitaireHtDA: ''
    });
  };

  const handleRemoveTempLine = (index: number) => {
    setInvoiceForm(prev => ({
      ...prev,
      lignes: prev.lignes.filter((_, i) => i !== index)
    }));
  };

  // Submit and create serial invoice
  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDossierId || !activeDossier) return;
    if (invoiceForm.lignes.length === 0) {
      alert("Veuillez ajouter au moins une ligne de facturation.");
      return;
    }

    const currentYear = new Date().getFullYear();
    const currentYearShort = currentYear.toString().slice(-2);
    
    // Calculate sequential invoice number for this specific dossier
    const emittedInvoicesThisYear = factures.filter(f => 
      f.dossierClientId === selectedDossierId && 
      f.numero !== "BROUILLON" &&
      f.dateEmission.startsWith(currentYear.toString())
    );
    const sequentialNum = (emittedInvoicesThisYear.length + 1).toString().padStart(3, '0');
    const computedInvoiceNumber = `F${currentYearShort}-${sequentialNum}`;

    // Calculations in centimes
    let montantHtCentimes = 0;
    let montantTvaCentimes = 0;
    
    const finalLines: LigneFacture[] = invoiceForm.lignes.map((l, index) => {
      const lineHt = l.prixUnitaireHtCentimes * l.quantite;
      const lineTva = activeDossier.assujettiTva ? Math.round(lineHt * (l.tauxTva / 100)) : 0;
      
      montantHtCentimes += lineHt;
      montantTvaCentimes += lineTva;
      
      return {
        id: `l_${Date.now()}_${index}`,
        ...l,
        totalHtCentimes: lineHt
      };
    });

    const isReel = activeDossier.regime === 'reel' || activeDossier.regime === 'reel_simplifie';
    const applyTap = invoiceForm.applyTap && isReel;
    const montantTapCentimes = applyTap ? Math.round(montantHtCentimes * 0.02) : 0;
    const montantTtcCentimes = montantHtCentimes + montantTvaCentimes + montantTapCentimes;

    const newInvoice: Facture = {
      id: `fac_${Date.now()}`,
      dossierClientId: selectedDossierId,
      numero: computedInvoiceNumber, // Strictly sequential and locked
      dateEmission: new Date().toISOString().split('T')[0],
      clientFinalName: invoiceForm.clientFinalName,
      clientFinalNif: invoiceForm.clientFinalNif || undefined,
      clientFinalAdresse: invoiceForm.clientFinalAdresse || undefined,
      statut: 'emise',
      modePaiement: invoiceForm.modePaiement,
      conditionsReglement: invoiceForm.conditionsReglement,
      lignes: finalLines,
      montantHtCentimes,
      montantTvaCentimes,
      montantTapCentimes,
      montantTtcCentimes,
      synced: false,
      lastModified: new Date().toISOString()
    };

    setFactures(prev => [newInvoice, ...prev]);
    setIsInvoiceModalOpen(false);
    
    // Clear form
    setInvoiceForm({
      clientFinalName: '',
      clientFinalNif: '',
      clientFinalAdresse: '',
      modePaiement: 'Virement',
      conditionsReglement: 'Paiement à la réception',
      applyTap: true,
      lignes: []
    });
  };

  // Delete invoice
  const handleDeleteInvoice = (id: string) => {
    if (confirm("Voulez-vous vraiment supprimer cette facture ?")) {
      setFactures(prev => prev.filter(f => f.id !== id));
    }
  };

  // Mark invoice as Paid
  const handleMarkAsPaid = (id: string) => {
    setFactures(prev => prev.map(f => f.id === id ? {
      ...f,
      statut: 'payee',
      lastModified: new Date().toISOString(),
      synced: false
    } : f));
  };

  // Helper lists & computations
  const activeDossierInvoices = factures.filter(f => f.dossierClientId === selectedDossierId);
  const activeDossierDeclarations = declarations.filter(d => d.dossierClientId === selectedDossierId);
  
  // Dashboard Metrics
  const caDuMoisCentimes = activeDossierInvoices
    .filter(f => f.statut === 'payee' || f.statut === 'emise')
    .reduce((sum, f) => sum + f.montantHtCentimes, 0);

  const tvaCollecteeCentimes = activeDossierInvoices
    .filter(f => f.statut === 'payee' || f.statut === 'emise')
    .reduce((sum, f) => sum + f.montantTvaCentimes, 0);

  const pendingInvoicesCount = activeDossierInvoices.filter(f => f.statut === 'emise' || f.statut === 'impayee').length;
  const lateDeclarationsCount = declarations.filter(d => d.statut === 'en_retard').length;
  const upcomingDeclarations = declarations.filter(d => d.statut === 'todo');

  const filteredDossiers = dossiers.filter(d => 
    d.raisonSociale.toLowerCase().includes(dossierSearch.toLowerCase()) ||
    d.nif.includes(dossierSearch) ||
    d.regime.toLowerCase().includes(dossierSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F6F6F6] text-slate-800 font-sans flex flex-col antialiased">
      
      {/* WINDOW FRAME HEADER */}
      <header className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between shadow-md border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500 text-slate-900 p-1.5 rounded-md flex items-center justify-center">
            <Building2 size={20} className="stroke-[2.5]" />
          </div>
          <div>
            <h1 className="font-bold text-base tracking-tight flex items-center gap-2">
              Vanguard Suite Comptable <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400">Windows MVP V1.0</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-mono">Cabinet : {cabinet.name} • Algérie</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={triggerSync}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs rounded-md bg-slate-800 hover:bg-slate-700 transition font-medium ${syncing ? 'text-emerald-400' : 'text-slate-200'}`}
          >
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Synchronisation locale...' : 'Synchroniser Cloud'}
          </button>
          
          <button 
            onClick={() => setIsRulesModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 transition font-medium"
          >
            <Info size={14} />
            Règles Fiscales DZ
          </button>

          <button 
            onClick={() => setIsSettingsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition font-medium"
          >
            <Settings size={14} />
            Paramètres Cabinet
          </button>
          
          <button 
            onClick={() => setShowAiSidebar(!showAiSidebar)}
            className="flex items-center gap-2 px-4 py-1.5 text-xs rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition shadow-sm animate-pulse-slow"
          >
            <Sparkles size={14} />
            Conseiller Fiscal IA
          </button>
        </div>
      </header>

      {/* WORKSPACE AREA */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* LEFT COLUMN: DOSSIER SELECTOR (ECRAN 1) */}
        <aside className="w-80 bg-white border-r border-slate-200 flex flex-col shadow-sm">
          <div className="p-4 border-b border-slate-100 bg-[#FAF9F6]">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Rechercher un dossier client..."
                value={dossierSearch}
                onChange={e => setDossierSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-md border border-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-500 bg-white"
              />
            </div>
          </div>

          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Portefeuilles ({filteredDossiers.length})</span>
            <button 
              onClick={openDossierCreate}
              className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded transition"
            >
              <Plus size={12} className="stroke-[3]" /> Nouveau
            </button>
          </div>

          {/* DOSSIER LIST */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filteredDossiers.map(doc => {
              const isActive = doc.id === selectedDossierId;
              const hasUnsynced = !doc.synced || factures.some(f => f.dossierClientId === doc.id && !f.synced);
              return (
                <div 
                  key={doc.id}
                  onClick={() => {
                    setSelectedDossierId(doc.id);
                    if (activeTab === 'dossiers') setActiveTab('dashboard');
                  }}
                  className={`p-4 cursor-pointer transition flex flex-col gap-2 ${isActive ? 'bg-slate-50 border-l-4 border-slate-800' : 'hover:bg-slate-50/50'}`}
                >
                  <div className="flex items-start justify-between">
                    <h3 className="font-bold text-xs text-slate-900 line-clamp-1">{doc.raisonSociale}</h3>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase ${
                      doc.regime === 'ifu' ? 'bg-amber-100 text-amber-800' :
                      doc.regime === 'reel_simplifie' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                    }`}>
                      {doc.regime.replace('_', ' ')}
                    </span>
                  </div>
                  
                  <div className="text-[10px] text-slate-500 flex flex-col gap-0.5 font-mono">
                    <div>NIF : {doc.nif}</div>
                    <div className="truncate">Activité : {doc.activite}</div>
                  </div>

                  <div className="flex items-center justify-between text-[9px] pt-1 border-t border-dashed border-slate-100">
                    <span className="text-slate-400 flex items-center gap-1">
                      {hasUnsynced ? (
                        <>
                          <Clock size={10} className="text-amber-500" />
                          <span className="text-amber-600 font-medium">Modifications locales</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck size={10} className="text-emerald-500" />
                          <span>Synchronisé</span>
                        </>
                      )}
                    </span>
                    <ChevronRight size={12} className="text-slate-400" />
                  </div>
                </div>
              );
            })}

            {filteredDossiers.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs">
                Aucun dossier client trouvé.
              </div>
            )}
          </div>
        </aside>

        {/* MAIN WORKSPACE AREA */}
        <main className="flex-1 bg-[#F5F5F3] p-6 overflow-y-auto flex flex-col gap-6">
          
          {/* DOSSIER INFO BANNER */}
          {activeDossier ? (
            <div className="bg-white p-5 rounded-lg border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-lg shadow">
                  {activeDossier.raisonSociale.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-bold text-slate-900">{activeDossier.raisonSociale}</h2>
                    <span className="bg-emerald-50 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full border border-emerald-200 font-semibold flex items-center gap-1">
                      <Check size={10} className="stroke-[3]" /> Actif dans l'espace
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    RC: {activeDossier.rc} • NIF: {activeDossier.nif} • NIS: {activeDossier.nis}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => openDossierEdit(activeDossier)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded border border-slate-200 bg-white hover:bg-slate-50 transition text-slate-700"
                >
                  <Edit size={12} /> Modifier la Fiche
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 p-5 rounded-lg text-amber-900 text-xs flex items-center gap-3">
              <AlertTriangle size={18} className="shrink-0" />
              <div>
                <strong>Aucun dossier actif.</strong> Sélectionnez un dossier client dans le panneau de gauche pour commencer à gérer sa comptabilité et facturation.
              </div>
            </div>
          )}

          {/* PORTFOLIO TAB NAVIGATION */}
          <div className="flex border-b border-slate-200 bg-white p-1 rounded-lg shadow-sm">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-md transition ${activeTab === 'dashboard' ? 'bg-slate-950 text-white shadow' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <Receipt size={14} /> Tableau de Bord
            </button>
            <button 
              onClick={() => setActiveTab('factures')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-md transition ${activeTab === 'factures' ? 'bg-slate-950 text-white shadow' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <FileText size={14} /> Factures Client
            </button>
            <button 
              onClick={() => setActiveTab('calendrier')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-md transition ${activeTab === 'calendrier' ? 'bg-slate-950 text-white shadow' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <Calendar size={14} /> Échéances Fiscales
            </button>
            <button 
              onClick={() => setActiveTab('flutter')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-md transition ${activeTab === 'flutter' ? 'bg-slate-950 text-white shadow' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <FileCode size={14} /> Architecture Flutter & Dart Code
            </button>
          </div>

          {/* TAB CONTENTS */}
          
          {/* TAB 1: DASHBOARD (ECRAN 2) */}
          {activeTab === 'dashboard' && activeDossier && (
            <div className="flex flex-col gap-6">
              
              {/* BENTO STATS GRID */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* METRIC 1: CA MENSUEL */}
                <div className="bg-white p-5 rounded-lg border border-slate-200/80 shadow-sm flex flex-col justify-between relative overflow-hidden group">
                  <div className="absolute right-0 top-0 p-6 opacity-5 group-hover:scale-110 transition">
                    <Receipt size={80} className="text-slate-900" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Chiffre d'Affaires Enregistré</span>
                    <h3 className="text-2xl font-black text-slate-900 mt-1 font-mono tracking-tight">{formatDA(caDuMoisCentimes)}</h3>
                    <p className="text-[10px] text-slate-500 mt-1">Cumulé sur les factures émises/payées</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-emerald-600 font-semibold">100% Hors-taxe</span>
                    <span className="text-slate-400">Exercice {taxRules.fiscalYear}</span>
                  </div>
                </div>

                {/* METRIC 2: TVA COLLECTEE */}
                <div className="bg-white p-5 rounded-lg border border-slate-200/80 shadow-sm flex flex-col justify-between relative overflow-hidden group">
                  <div className="absolute right-0 top-0 p-6 opacity-5 group-hover:scale-110 transition">
                    <Calculator size={80} className="text-slate-900" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">TVA Collectée Estimée</span>
                    <h3 className="text-2xl font-black text-slate-900 mt-1 font-mono tracking-tight">{formatDA(tvaCollecteeCentimes)}</h3>
                    <p className="text-[10px] text-slate-500 mt-1">
                      {activeDossier.assujettiTva ? `Taux applicable : ${activeDossier.tauxTvaParDefaut}%` : "Non assujetti (Exonéré/IFU)"}
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-blue-600 font-semibold">G50 à reporter</span>
                    <span className="text-slate-400">Mois en cours</span>
                  </div>
                </div>

                {/* METRIC 3: ECHEANCES DECLARATIVES */}
                <div className="bg-white p-5 rounded-lg border border-slate-200/80 shadow-sm flex flex-col justify-between relative overflow-hidden group">
                  <div className="absolute right-0 top-0 p-6 opacity-5 group-hover:scale-110 transition">
                    <Calendar size={80} className="text-slate-900" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Échéances Obligatoires</span>
                    <h3 className="text-2xl font-black text-slate-900 mt-1 font-mono tracking-tight">
                      {upcomingDeclarations.length} <span className="text-sm font-normal text-slate-500">en attente</span>
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-1">
                      {lateDeclarationsCount > 0 ? (
                        <span className="text-rose-600 font-semibold flex items-center gap-1">
                          <AlertTriangle size={10} /> {lateDeclarationsCount} échéance en retard !
                        </span>
                      ) : "Aucun retard enregistré"}
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-amber-600 font-semibold">Prochaine : 20 Juillet</span>
                    <span className="text-slate-400">Suivi strict</span>
                  </div>
                </div>

              </div>

              {/* TWO COLUMN ROW */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* ACTIVE DOSSIER DETAILS & COMPLIANCE OBLIGATIONS */}
                <div className="bg-white p-5 rounded-lg border border-slate-200/80 shadow-sm flex flex-col gap-4 lg:col-span-1">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 flex items-center gap-1.5 pb-2 border-b border-slate-100">
                    <Info size={14} /> Statut Fiscal & Régime
                  </h3>

                  <div className="flex flex-col gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Régime fiscal légal</span>
                      <strong className="text-slate-800 block text-sm mt-0.5 capitalize">
                        {activeDossier.regime.replace('_', ' ')}
                      </strong>
                      <p className="text-[10px] text-slate-500 mt-1">
                        {taxRules.regimes[activeDossier.regime as keyof typeof taxRules.regimes]?.description}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100">
                      <span className="text-slate-400 block text-[10px] uppercase">TVA applicable</span>
                      <strong className="text-slate-800">
                        {activeDossier.assujettiTva ? `Oui (${activeDossier.tauxTvaParDefaut}% par défaut)` : 'Non assujetti'}
                      </strong>
                    </div>

                    <div className="pt-2 border-t border-slate-100">
                      <span className="text-slate-400 block text-[10px] uppercase">OBLIGATIONS DÉCLARATIVES :</span>
                      <ul className="mt-1.5 flex flex-col gap-1.5">
                        {taxRules.regimes[activeDossier.regime as keyof typeof taxRules.regimes]?.obligations.map((ob, idx) => (
                          <li key={idx} className="flex items-start gap-1.5 text-[10.5px] text-slate-600">
                            <span className="text-emerald-500 font-bold">✓</span>
                            <span>{ob}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* RECENT INVOICES & RECENT DEADLINES */}
                <div className="bg-white p-5 rounded-lg border border-slate-200/80 shadow-sm flex flex-col gap-4 lg:col-span-2">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Receipt size={14} /> Factures Récentes
                    </h3>
                    <button 
                      onClick={() => setActiveTab('factures')}
                      className="text-[10px] font-bold text-slate-600 hover:text-slate-800 hover:underline"
                    >
                      Voir toutes les factures
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs divide-y divide-slate-100">
                      <thead>
                        <tr className="text-slate-400 text-[10px] uppercase">
                          <th className="py-2">Numéro</th>
                          <th className="py-2">Client Final</th>
                          <th className="py-2">Date</th>
                          <th className="py-2 text-right">Montant TTC</th>
                          <th className="py-2 text-center">Statut</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {activeDossierInvoices.slice(0, 4).map(f => (
                          <tr key={f.id} className="hover:bg-slate-50/40">
                            <td className="py-2.5 font-bold text-slate-900">{f.numero}</td>
                            <td className="py-2.5 font-sans font-medium text-slate-700">{f.clientFinalName}</td>
                            <td className="py-2.5 text-slate-500">{f.dateEmission}</td>
                            <td className="py-2.5 text-right font-bold text-slate-950">{formatDA(f.montantTtcCentimes)}</td>
                            <td className="py-2.5 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                f.statut === 'payee' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                              }`}>
                                {f.statut.toUpperCase()}
                              </span>
                            </td>
                          </tr>
                        ))}

                        {activeDossierInvoices.length === 0 && (
                          <tr>
                            <td colSpan={5} className="py-4 text-center text-slate-400 font-sans">
                              Aucune facture émise pour ce dossier.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: INVOICE MANAGER (ECRAN 4 & ECRAN 5 FOR DETAIL/PRINT) */}
          {activeTab === 'factures' && activeDossier && (
            <div className="bg-white p-6 rounded-lg border border-slate-200/80 shadow-sm flex flex-col gap-6">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-base text-slate-900">Registre des Factures Émises</h3>
                  <p className="text-xs text-slate-500 mt-0.5">La numérotation est séquentielle, chronologique et verrouillée dès émission.</p>
                </div>
                
                <button 
                  onClick={() => {
                    setInvoiceForm({
                      clientFinalName: '',
                      clientFinalNif: '',
                      clientFinalAdresse: '',
                      modePaiement: 'Virement',
                      conditionsReglement: 'Paiement à la réception',
                      applyTap: activeDossier.regime !== 'ifu', // pas de TAP en IFU
                      lignes: []
                    });
                    setIsInvoiceModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 bg-slate-950 hover:bg-slate-800 text-white px-4 py-2 text-xs font-bold rounded-md shadow transition shrink-0"
                >
                  <Plus size={14} className="stroke-[2.5]" /> Créer une Facture
                </button>
              </div>

              {/* SEARCH FACTURE */}
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
                <input 
                  type="text" 
                  placeholder="Rechercher par client final, numéro..."
                  value={invoiceSearch}
                  onChange={e => setInvoiceSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded border border-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-500"
                />
              </div>

              {/* INVOICE TABLE */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs divide-y divide-slate-100">
                  <thead>
                    <tr className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                      <th className="py-3">Numéro</th>
                      <th className="py-3">Client Final</th>
                      <th className="py-3">Date d'Émission</th>
                      <th className="py-3 text-right">Montant HT</th>
                      <th className="py-3 text-right">TVA</th>
                      <th className="py-3 text-right">Montant TTC</th>
                      <th className="py-3 text-center">Statut</th>
                      <th className="py-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {activeDossierInvoices
                      .filter(f => f.clientFinalName.toLowerCase().includes(invoiceSearch.toLowerCase()) || f.numero.includes(invoiceSearch))
                      .map(f => (
                        <tr key={f.id} className="hover:bg-slate-50/50">
                          <td className="py-3.5 font-bold text-slate-900">{f.numero}</td>
                          <td className="py-3.5 font-sans font-semibold text-slate-700">{f.clientFinalName}</td>
                          <td className="py-3.5 text-slate-500">{f.dateEmission}</td>
                          <td className="py-3.5 text-right text-slate-600">{formatDA(f.montantHtCentimes)}</td>
                          <td className="py-3.5 text-right text-slate-600">
                            {f.montantTvaCentimes > 0 ? formatDA(f.montantTvaCentimes) : <span className="text-slate-300">-</span>}
                          </td>
                          <td className="py-3.5 text-right font-extrabold text-slate-950">{formatDA(f.montantTtcCentimes)}</td>
                          <td className="py-3.5 text-center">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                              f.statut === 'payee' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                              f.statut === 'brouillon' ? 'bg-slate-100 text-slate-600 border border-slate-200' :
                              f.statut === 'emise' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                              'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}>
                              {f.statut}
                            </span>
                          </td>
                          <td className="py-3.5 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {f.statut !== 'brouillon' && (
                                <button 
                                  onClick={() => setActiveInvoiceForView(f)}
                                  className="p-1 rounded text-slate-500 hover:text-slate-950 hover:bg-slate-100 transition"
                                  title="Visualiser l'export PDF légal"
                                >
                                  <Printer size={13} />
                                </button>
                              )}
                              {f.statut === 'brouillon' && (
                                <button 
                                  onClick={() => handleEmitDraft(f.id)}
                                  className="px-2 py-0.5 text-[9px] font-bold rounded bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition font-sans"
                                  title="Numéroter et émettre la facture"
                                >
                                  Émettre
                                </button>
                              )}
                              {f.statut === 'emise' && (
                                <button 
                                  onClick={() => handleMarkAsPaid(f.id)}
                                  className="px-2 py-0.5 text-[9px] font-bold rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition font-sans"
                                  title="Marquer comme payée"
                                >
                                  Marquer Payée
                                </button>
                              )}
                              <button 
                                onClick={() => handleDeleteInvoice(f.id)}
                                className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition"
                                title="Supprimer la facture"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                    ))}

                    {activeDossierInvoices.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-400 font-sans">
                          Aucune facture enregistrée pour ce dossier. Cliquez sur "Créer une Facture" pour commencer.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {/* TAB 3: DECLARATION CALENDAR (ECRAN 6) */}
          {activeTab === 'calendrier' && (
            <div className="bg-white p-6 rounded-lg border border-slate-200/80 shadow-sm flex flex-col gap-6">
              <div>
                <h3 className="font-bold text-base text-slate-900">Calendrier d'Échéances Fiscales Global</h3>
                <p className="text-xs text-slate-500 mt-0.5">Vue d'ensemble sur l'ensemble des dossiers clients gérés par le cabinet comptable.</p>
              </div>

              {/* LIST OF DEADLINES FOR ALL PORTFOLIOS */}
              <div className="flex flex-col gap-4">
                {declarations.map(dec => {
                  const doc = dossiers.find(d => d.id === dec.dossierClientId);
                  const isLate = dec.statut === 'en_retard' || (dec.statut === 'todo' && new Date(dec.dateLimite) < new Date());
                  return (
                    <div 
                      key={dec.id}
                      className={`p-4 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition ${
                        dec.statut === 'deposee' ? 'bg-slate-50 border-slate-200/60 text-slate-500' :
                        isLate ? 'bg-rose-50/50 border-rose-200 text-rose-950' : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-md ${
                          dec.statut === 'deposee' ? 'bg-slate-100 text-slate-400' :
                          isLate ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          <Calendar size={18} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <strong className="text-xs font-bold text-slate-900">{dec.type} - {dec.periode}</strong>
                            <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-semibold">
                              {doc?.raisonSociale}
                            </span>
                            {isLate && (
                              <span className="text-[9px] bg-rose-600 text-white px-1.5 py-0.5 rounded font-bold uppercase animate-pulse">
                                Retard
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">{dec.notes || "Suivi de conformité légal algérien."}</p>
                          <div className="text-[10px] font-mono text-slate-400 mt-1">Date limite de dépôt : {dec.dateLimite}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-auto">
                        {dec.montantCentimes > 0 && (
                          <span className="text-xs font-mono font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded">
                            {formatDA(dec.montantCentimes)}
                          </span>
                        )}
                        
                        {dec.statut === 'todo' ? (
                          <button 
                            onClick={() => {
                              setDeclarations(prev => prev.map(d => d.id === dec.id ? {
                                ...d,
                                statut: 'deposee',
                                lastModified: new Date().toISOString(),
                                synced: false
                              } : d));
                            }}
                            className="px-3 py-1.5 text-xs font-bold rounded bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition"
                          >
                            Valider Dépôt
                          </button>
                        ) : (
                          <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-100">
                            <CheckCircle2 size={12} /> Déposée
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          )}

          {/* TAB 4: FLUTTER EXPORT DESK */}
          {activeTab === 'flutter' && (
            <div className="flex flex-col gap-6">
              
              <div className="bg-white p-6 rounded-lg border border-slate-200/80 shadow-sm">
                <h3 className="font-bold text-base text-slate-900">Espace Code & Architecture Flutter</h3>
                <p className="text-xs text-slate-500 mt-0.5">Copiez l'arborescence et les fichiers Dart/SQLite prêts pour la production de l'application Desktop Windows.</p>
                
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-6">
                  
                  {/* DIRECTORY TREE */}
                  <div className="bg-slate-900 text-emerald-400 p-4 rounded-lg border border-slate-800 font-mono text-xs flex flex-col h-[500px]">
                    <div className="border-b border-slate-800 pb-2 mb-2 flex items-center justify-between text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                      <span>📂 Structure de Dossiers Flutter</span>
                    </div>
                    <pre className="overflow-auto flex-1 text-[10.5px] leading-relaxed select-all">
                      {flutterDirectoryTree}
                    </pre>
                  </div>

                  {/* CODE PREVIEW */}
                  <div className="xl:col-span-2 bg-slate-950 text-slate-100 rounded-lg border border-slate-800 overflow-hidden flex flex-col h-[500px]">
                    <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex items-center justify-between text-xs font-bold text-slate-400">
                      <span>💻 Fichiers Source Dart & SQLite</span>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 space-y-6 select-all font-mono text-[11px]">
                      
                      <div>
                        <h4 className="text-xs text-amber-400 border-b border-slate-800 pb-1 mb-2 font-bold">1. Fichier de Règles Fiscales (config/tax_rules.dart)</h4>
                        <pre className="overflow-x-auto whitespace-pre-wrap">{taxRulesDart}</pre>
                      </div>

                      <div className="pt-4 border-t border-slate-800">
                        <h4 className="text-xs text-amber-400 border-b border-slate-800 pb-1 mb-2 font-bold">2. Modèles de Données Dart (models/)</h4>
                        <pre className="overflow-x-auto whitespace-pre-wrap">{dartModels}</pre>
                      </div>

                      <div className="pt-4 border-t border-slate-800">
                        <h4 className="text-xs text-amber-400 border-b border-slate-800 pb-1 mb-2 font-bold">3. Schéma SQLite & Initialisation (database/app_database.dart)</h4>
                        <pre className="overflow-x-auto whitespace-pre-wrap">{sqliteSchemaAndMigration}</pre>
                      </div>

                      <div className="pt-4 border-t border-slate-800">
                        <h4 className="text-xs text-amber-400 border-b border-slate-800 pb-1 mb-2 font-bold">4. Contrats & Repositories CRUD (repositories/)</h4>
                        <pre className="overflow-x-auto whitespace-pre-wrap">{repositoriesDart}</pre>
                      </div>

                      <div className="pt-4 border-t border-slate-800">
                        <h4 className="text-xs text-amber-400 border-b border-slate-800 pb-1 mb-2 font-bold">5. Providers Riverpod Offline-First (providers/)</h4>
                        <pre className="overflow-x-auto whitespace-pre-wrap">{riverpodProviders}</pre>
                      </div>

                      <div className="pt-4 border-t border-slate-800">
                        <h4 className="text-xs text-amber-400 border-b border-slate-800 pb-1 mb-2 font-bold">6. Service de Génération PDF Facture Conforme (services/pdf_service.dart)</h4>
                        <pre className="overflow-x-auto whitespace-pre-wrap">{pdfGeneratorService}</pre>
                      </div>

                    </div>
                  </div>

                </div>
              </div>

            </div>
          )}

        </main>
      </div>

      {/* AI ASSISTANT SLIDE-OVER SIDEBAR */}
      {showAiSidebar && (
        <div className="fixed inset-y-0 right-0 w-[450px] bg-slate-900 text-white shadow-2xl border-l border-slate-800 z-50 flex flex-col">
          <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="text-emerald-400" size={18} />
              <strong className="text-xs font-bold uppercase tracking-wider text-emerald-300">Conseiller Fiscal Algérien IA</strong>
            </div>
            <button 
              onClick={() => setShowAiSidebar(false)}
              className="text-slate-400 hover:text-white transition"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
            
            <div className="bg-emerald-950/40 border border-emerald-500/20 p-3.5 rounded text-[11px] text-emerald-100">
              <p className="font-semibold">Mode Haute Réflexion Activé (Gemini 3.1 Pro)</p>
              <p className="mt-1 text-emerald-400/80">L'IA formule un raisonnement approfondi étape par étape en se référant au Code Général des Impôts algérien.</p>
            </div>

            {/* PRESETS */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sujets d'étude fréquents :</span>
              {aiPresets.map((pr, idx) => (
                <button 
                  key={idx}
                  onClick={() => askAiAssistant(pr.query)}
                  className="p-2 bg-slate-800 hover:bg-slate-700/80 text-left rounded text-[11px] text-slate-200 border border-slate-700/40 transition flex items-center justify-between gap-2"
                >
                  <span>{pr.label}</span>
                  <ChevronRight size={12} className="text-slate-400 shrink-0" />
                </button>
              ))}
            </div>

            {/* AI THINKING LOG */}
            {aiThoughts && (
              <div className="bg-slate-950 p-3 rounded-md border border-slate-800 text-[10.5px] font-mono text-slate-400 flex flex-col gap-2 max-h-48 overflow-y-auto">
                <span className="text-[9px] uppercase tracking-wider text-emerald-500 font-bold">Processus de pensée de l'IA (Pensée Profonde) :</span>
                <pre className="whitespace-pre-wrap leading-relaxed">{aiThoughts}</pre>
              </div>
            )}

            {/* AI RESPONSE */}
            {aiResponse && (
              <div className="bg-slate-800 p-4 rounded-lg border border-slate-700/50 text-[11.5px] leading-relaxed flex flex-col gap-3">
                <span className="text-[9px] uppercase tracking-wider text-emerald-400 font-bold">Réponse d'Expert :</span>
                <div className="space-y-2 whitespace-pre-wrap">{aiResponse}</div>
              </div>
            )}

            {isAiLoading && (
              <div className="p-4 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-3 bg-slate-950 rounded border border-slate-800 py-8">
                <RefreshCw size={20} className="animate-spin text-emerald-400" />
                <span>L'IA analyse le Code Général des Impôts en profondeur...</span>
              </div>
            )}

          </div>

          {/* INPUT FORM */}
          <div className="p-4 bg-slate-950 border-t border-slate-800">
            <form 
              onSubmit={e => {
                e.preventDefault();
                askAiAssistant(aiQuery);
              }}
              className="flex gap-2"
            >
              <input 
                type="text" 
                placeholder="Ex: Taux IBS pour les services informatiques..."
                value={aiQuery}
                onChange={e => setAiQuery(e.target.value)}
                className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-white"
              />
              <button 
                type="submit"
                disabled={isAiLoading || !aiQuery.trim()}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white p-2 rounded transition flex items-center justify-center"
              >
                <Send size={14} />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 1: NEW/EDIT DOSSIER CLIENT */}
      {isDossierModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-slate-200 max-w-xl w-full shadow-2xl flex flex-col overflow-hidden">
            
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <strong className="text-sm font-bold">{editingDossier ? "Modifier le Dossier Client" : "Créer un Nouveau Dossier Client"}</strong>
              <button onClick={() => setIsDossierModalOpen(false)} className="text-slate-400 hover:text-white"><X size={18} /></button>
            </div>

            <form onSubmit={handleSaveDossier} className="p-5 flex flex-col gap-4 overflow-y-auto max-h-[80vh]">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">Raison Sociale (Nom de l'entreprise)</label>
                  <input 
                    type="text" 
                    required
                    value={dossierForm.raisonSociale}
                    onChange={e => setDossierForm(prev => ({ ...prev, raisonSociale: e.target.value }))}
                    className="w-full border border-slate-200 rounded p-2 text-xs"
                    placeholder="Ex: SARL Numidia Commerce"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">NIF (Identifiant Fiscal - 15 chiffres)</label>
                  <input 
                    type="text" 
                    required
                    pattern="\d{15}"
                    maxLength={15}
                    value={dossierForm.nif}
                    onChange={e => setDossierForm(prev => ({ ...prev, nif: e.target.value }))}
                    className="w-full border border-slate-200 rounded p-2 text-xs font-mono"
                    placeholder="Ex: 001216091234567"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">NIS (Statistique - 15 chiffres)</label>
                  <input 
                    type="text" 
                    required
                    pattern="\d{15}"
                    maxLength={15}
                    value={dossierForm.nis}
                    onChange={e => setDossierForm(prev => ({ ...prev, nis: e.target.value }))}
                    className="w-full border border-slate-200 rounded p-2 text-xs font-mono"
                    placeholder="Ex: 123456789012345"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">RC (Registre de Commerce)</label>
                  <input 
                    type="text" 
                    required
                    value={dossierForm.rc}
                    onChange={e => setDossierForm(prev => ({ ...prev, rc: e.target.value }))}
                    className="w-full border border-slate-200 rounded p-2 text-xs font-mono"
                    placeholder="Ex: 16/00-9876543B26"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">Régime Fiscal</label>
                  <select 
                    value={dossierForm.regime}
                    onChange={e => {
                      const regime = e.target.value as 'ifu' | 'reel_simplifie' | 'reel';
                      setDossierForm(prev => ({ 
                        ...prev, 
                        regime,
                        assujettiTva: regime !== 'ifu',
                        tauxTvaParDefaut: regime === 'ifu' ? 0 : 19
                      }));
                    }}
                    className="w-full border border-slate-200 rounded p-2 text-xs"
                  >
                    <option value="ifu">Impôt Forfaitaire Unique (IFU)</option>
                    <option value="reel_simplifie">Régime Réel Simplifié</option>
                    <option value="reel">Régime Réel</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">Activité Commerciale (Description)</label>
                  <input 
                    type="text" 
                    required
                    value={dossierForm.activite}
                    onChange={e => setDossierForm(prev => ({ ...prev, activite: e.target.value }))}
                    className="w-full border border-slate-200 rounded p-2 text-xs"
                    placeholder="Ex: Import-export de matériel agricole"
                  />
                </div>

                <div className="col-span-2">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">Adresse Professionnelle</label>
                  <textarea 
                    required
                    rows={2}
                    value={dossierForm.adresse}
                    onChange={e => setDossierForm(prev => ({ ...prev, adresse: e.target.value }))}
                    className="w-full border border-slate-200 rounded p-2 text-xs"
                    placeholder="Cité Cooperatives, Alger"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="assujettiTva"
                    checked={dossierForm.assujettiTva}
                    disabled={dossierForm.regime === 'ifu'}
                    onChange={e => setDossierForm(prev => ({ ...prev, assujettiTva: e.target.checked }))}
                    className="rounded border-slate-300"
                  />
                  <label htmlFor="assujettiTva" className="text-xs font-semibold text-slate-700">Assujetti à la TVA</label>
                </div>

                {dossierForm.assujettiTva && (
                  <div>
                    <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">Taux TVA par défaut (%)</label>
                    <select 
                      value={dossierForm.tauxTvaParDefaut}
                      onChange={e => setDossierForm(prev => ({ ...prev, tauxTvaParDefaut: parseInt(e.target.value) }))}
                      className="w-full border border-slate-200 rounded p-2 text-xs"
                    >
                      <option value={19}>19% (Taux normal)</option>
                      <option value={9}>9% (Taux réduit)</option>
                      <option value={0}>0% (Exonéré)</option>
                    </select>
                  </div>
                )}

              </div>

              <div className="flex gap-2 justify-end pt-4 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setIsDossierModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded"
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded shadow"
                >
                  {editingDossier ? "Enregistrer les modifications" : "Créer le Dossier"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CREATE INVOICE */}
      {isInvoiceModalOpen && activeDossier && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-slate-200 max-w-2xl w-full shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
            
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <div>
                <strong className="text-sm font-bold">Nouvelle Facture Conforme</strong>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">Dossier : {activeDossier.raisonSociale}</p>
              </div>
              <button onClick={() => setIsInvoiceModalOpen(false)} className="text-slate-400 hover:text-white"><X size={18} /></button>
            </div>

            <form onSubmit={handleCreateInvoice} className="p-5 flex flex-col gap-4 overflow-y-auto">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">Raison sociale du Client Final</label>
                  <input 
                    type="text" 
                    required
                    value={invoiceForm.clientFinalName}
                    onChange={e => setInvoiceForm(prev => ({ ...prev, clientFinalName: e.target.value }))}
                    className="w-full border border-slate-200 rounded p-2 text-xs"
                    placeholder="Ex: SPA Algérie Télécom"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">NIF du Client Final (Optionnel)</label>
                  <input 
                    type="text" 
                    maxLength={15}
                    value={invoiceForm.clientFinalNif}
                    onChange={e => setInvoiceForm(prev => ({ ...prev, clientFinalNif: e.target.value }))}
                    className="w-full border border-slate-200 rounded p-2 text-xs font-mono"
                    placeholder="Identifiant fiscal à 15 chiffres"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">Adresse du Client Final (Optionnel)</label>
                  <input 
                    type="text" 
                    value={invoiceForm.clientFinalAdresse}
                    onChange={e => setInvoiceForm(prev => ({ ...prev, clientFinalAdresse: e.target.value }))}
                    className="w-full border border-slate-200 rounded p-2 text-xs"
                    placeholder="Adresse de facturation"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">Mode de Paiement</label>
                  <select 
                    value={invoiceForm.modePaiement}
                    onChange={e => setInvoiceForm(prev => ({ ...prev, modePaiement: e.target.value as any }))}
                    className="w-full border border-slate-200 rounded p-2 text-xs"
                  >
                    <option value="Virement">Virement Bancaire</option>
                    <option value="Cheque">Chèque de Banque</option>
                    <option value="Especes">Espèces</option>
                    <option value="Non defini">Non défini</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">Conditions de Règlement</label>
                  <input 
                    type="text" 
                    value={invoiceForm.conditionsReglement}
                    onChange={e => setInvoiceForm(prev => ({ ...prev, conditionsReglement: e.target.value }))}
                    className="w-full border border-slate-200 rounded p-2 text-xs"
                  />
                </div>

                {/* TAX TOGGLES */}
                {activeDossier.regime !== 'ifu' && (
                  <div className="col-span-2 flex items-center gap-4 py-2 border-y border-slate-100 bg-[#FAF9F6] px-3 rounded">
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        id="applyTap"
                        checked={invoiceForm.applyTap}
                        onChange={e => setInvoiceForm(prev => ({ ...prev, applyTap: e.target.checked }))}
                        className="rounded border-slate-300"
                      />
                      <label htmlFor="applyTap" className="text-xs font-semibold text-slate-700">Appliquer la TAP de 2%</label>
                    </div>
                  </div>
                )}
              </div>

              {/* FACTURE LINES INPUT */}
              <div className="border-t border-slate-200 pt-4 flex flex-col gap-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Ajouter des Prestations</span>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
                  <div className="md:col-span-2">
                    <label className="text-[9px] text-slate-400 block mb-1">Désignation / Description</label>
                    <input 
                      type="text" 
                      value={tempLine.description}
                      onChange={e => setTempLine(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full border border-slate-200 rounded p-1.5 text-xs"
                      placeholder="Ex: Développement logiciel, Audit trimestriel..."
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 block mb-1">Qté</label>
                    <input 
                      type="number" 
                      min={1}
                      value={tempLine.quantite}
                      onChange={e => setTempLine(prev => ({ ...prev, quantite: parseInt(e.target.value) || 1 }))}
                      className="w-full border border-slate-200 rounded p-1.5 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 block mb-1">P.U HT (DA)</label>
                    <input 
                      type="text" 
                      placeholder="Montant DA"
                      value={tempLine.prixUnitaireHtDA}
                      onChange={e => setTempLine(prev => ({ ...prev, prixUnitaireHtDA: e.target.value }))}
                      className="w-full border border-slate-200 rounded p-1.5 text-xs font-mono"
                    />
                  </div>
                </div>
                
                <button 
                  type="button" 
                  onClick={handleAddTempLine}
                  className="flex items-center justify-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 text-[11px] font-bold rounded transition self-end"
                >
                  <Plus size={12} className="stroke-[3]" /> Ajouter la prestation
                </button>

                {/* TEMPORARY LINES TABLE */}
                {invoiceForm.lignes.length > 0 && (
                  <div className="border rounded overflow-hidden">
                    <table className="w-full text-left text-[11px] divide-y divide-slate-100">
                      <thead className="bg-[#FAF9F6]">
                        <tr>
                          <th className="p-2">Prestation</th>
                          <th className="p-2 text-center">Qté</th>
                          <th className="p-2 text-right">P.U HT</th>
                          <th className="p-2 text-right">TTC Estimé</th>
                          <th className="p-2 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {invoiceForm.lignes.map((line, idx) => {
                          const totalLineHt = line.prixUnitaireHtCentimes * line.quantite;
                          const totalLineTtc = activeDossier.assujettiTva ? totalLineHt * (1 + (line.tauxTva / 100)) : totalLineHt;
                          return (
                            <tr key={idx}>
                              <td className="p-2 font-sans">{line.description}</td>
                              <td className="p-2 text-center">{line.quantite}</td>
                              <td className="p-2 text-right">{formatDA(line.prixUnitaireHtCentimes)}</td>
                              <td className="p-2 text-right font-bold text-slate-950">{formatDA(Math.round(totalLineTtc))}</td>
                              <td className="p-2 text-center">
                                <button 
                                  type="button" 
                                  onClick={() => handleRemoveTempLine(idx)}
                                  className="text-rose-500 hover:text-rose-700 p-1 rounded"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t border-slate-200 mt-4">
                <button 
                  type="button" 
                  onClick={handleSaveInvoiceAsDraft}
                  className="px-4 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded mr-auto"
                >
                  Enregistrer comme Brouillon
                </button>
                <button 
                  type="button" 
                  onClick={() => setIsInvoiceModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded"
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded shadow-md"
                >
                  Émettre & Numéroter la Facture
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: INVOICE PRINT VIEW / PDF EMULATOR (ECRAN 5) */}
      {activeInvoiceForView && activeDossier && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full shadow-2xl flex flex-col h-[90vh] overflow-hidden">
            
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between shrink-0">
              <div>
                <strong className="text-sm font-bold">Visualisation Conforme de Facture</strong>
                <p className="text-[10px] text-slate-400 font-mono">Modèle légal algérien (conforme au Code des Impôts Directs et Taxes Assimilées)</p>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 px-3 py-1.5 text-xs font-bold rounded transition"
                >
                  <Printer size={14} /> Imprimer / Exporter PDF
                </button>
                <button onClick={() => setActiveInvoiceForView(null)} className="text-slate-400 hover:text-white"><X size={18} /></button>
              </div>
            </div>

            {/* PRINT COMPONENT */}
            <div className="flex-1 overflow-y-auto p-12 bg-[#F0EFF0] flex justify-center">
              <div id="print-area" className="bg-white w-[210mm] min-h-[297mm] p-12 text-slate-900 shadow-lg relative font-sans">
                
                {/* HEADERS */}
                <div className="flex justify-between items-start">
                  <div className="max-w-xs flex flex-col gap-0.5">
                    <strong className="text-sm font-bold block">{cabinet.name}</strong>
                    <span className="text-[10px] text-slate-500 font-medium font-mono">{cabinet.agrement}</span>
                    <span className="text-[10px] leading-relaxed text-slate-500">{cabinet.address}</span>
                    <span className="text-[10px] font-mono text-slate-500">Tél : {cabinet.phone}</span>
                    <span className="text-[10px] font-mono text-slate-500">Email : {cabinet.email}</span>
                  </div>

                  <div className="text-right flex flex-col gap-1 items-end">
                    <div className="border border-slate-900 p-2 text-center w-36 font-black uppercase tracking-widest text-sm">
                      Facture
                    </div>
                    <div className="text-xs font-bold font-mono mt-2">N° : {activeInvoiceForView.numero}</div>
                    <div className="text-xs font-mono text-slate-500">Date d'émission : {activeInvoiceForView.dateEmission}</div>
                  </div>
                </div>

                <div className="border-t border-slate-300 my-6"></div>

                {/* DOSSIER INFOS VS FINAL CLIENT */}
                <div className="grid grid-cols-2 gap-8 text-xs">
                  
                  <div className="flex flex-col gap-1 border-r border-slate-100 pr-4">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Émetteur (Prestataire)</span>
                    <strong className="text-sm font-extrabold text-slate-950">{activeDossier.raisonSociale}</strong>
                    <div className="text-[11px] leading-relaxed text-slate-700 mt-1">{activeDossier.adresse}</div>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 mt-2 font-mono text-[10.5px]">
                      <div>NIF :</div> <div>{activeDossier.nif}</div>
                      <div>NIS :</div> <div>{activeDossier.nis}</div>
                      <div>RC :</div> <div>{activeDossier.rc}</div>
                      <div>Régime :</div> <div className="uppercase">{activeDossier.regime.replace('_', ' ')}</div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 pl-4">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Client Destinataire</span>
                    <strong className="text-sm font-extrabold text-slate-950">{activeInvoiceForView.clientFinalName}</strong>
                    <div className="text-[11px] leading-relaxed text-slate-700 mt-1">{activeInvoiceForView.clientFinalAdresse || "Adresse non fournie"}</div>
                    {activeInvoiceForView.clientFinalNif && (
                      <div className="mt-2 font-mono text-[10.5px]">
                        <strong>NIF Client :</strong> {activeInvoiceForView.clientFinalNif}
                      </div>
                    )}
                  </div>

                </div>

                <div className="my-8"></div>

                {/* FACTURE LINES TABLE */}
                <table className="w-full text-xs text-left border-collapse border border-slate-300">
                  <thead className="bg-slate-50 uppercase tracking-wider text-[9.5px]">
                    <tr className="border-b border-slate-300 text-slate-900">
                      <th className="p-3 border-r border-slate-300">Désignation des Prestations</th>
                      <th className="p-3 border-r border-slate-300 text-center w-12">Qté</th>
                      <th className="p-3 border-r border-slate-300 text-right w-28">P.U HT (DA)</th>
                      <th className="p-3 border-r border-slate-300 text-center w-16">TVA</th>
                      <th className="p-3 text-right w-28">Total HT (DA)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 border-b border-slate-300 font-sans text-slate-800">
                    {activeInvoiceForView.lignes.map(line => (
                      <tr key={line.id} className="hover:bg-slate-50/20">
                        <td className="p-3 border-r border-slate-200">{line.description}</td>
                        <td className="p-3 border-r border-slate-200 text-center font-mono">{line.quantite}</td>
                        <td className="p-3 border-r border-slate-200 text-right font-mono">{(line.prixUnitaireHtCentimes / 100).toFixed(2)}</td>
                        <td className="p-3 border-r border-slate-200 text-center font-mono">
                          {activeDossier.assujettiTva ? `${line.tauxTva}%` : "0% (Exonéré)"}
                        </td>
                        <td className="p-3 text-right font-mono font-semibold">{(line.totalHtCentimes / 100).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* SYNTHESE DE CALCUL */}
                <div className="grid grid-cols-2 gap-8 mt-6">
                  
                  {/* TERMS & VERBAL SPELLING */}
                  <div className="flex flex-col gap-3">
                    <div className="bg-[#FAF9F6] border p-3 rounded text-[10.5px] leading-relaxed">
                      <div><strong>Mode de Règlement :</strong> {activeInvoiceForView.modePaiement}</div>
                      <div><strong>Conditions de Règlement :</strong> {activeInvoiceForView.conditionsReglement}</div>
                    </div>
                    
                    <p className="text-[10px] leading-relaxed text-slate-500 italic">
                      Arrêtée la présente facture à la somme de : <br />
                      <strong className="text-slate-800 font-extrabold not-italic block mt-1 font-sans">
                        {numberToWordsFR(activeInvoiceForView.montantTtcCentimes / 100)}
                      </strong>
                    </p>
                  </div>

                  {/* FINANCIAL SUMMARY TABLE */}
                  <div className="flex flex-col gap-1.5 text-xs font-mono border border-slate-200 p-4 rounded bg-[#FAF9F6]">
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-sans">Total Général HT :</span>
                      <strong className="text-slate-900 font-black">{(activeInvoiceForView.montantHtCentimes / 100).toFixed(2)} DA</strong>
                    </div>
                    {activeInvoiceForView.montantTvaCentimes > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-sans">TVA :</span>
                        <strong className="text-slate-900 font-black">{(activeInvoiceForView.montantTvaCentimes / 100).toFixed(2)} DA</strong>
                      </div>
                    )}
                    {activeInvoiceForView.montantTapCentimes > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-sans">TAP (2%) :</span>
                        <strong className="text-slate-900 font-black">{(activeInvoiceForView.montantTapCentimes / 100).toFixed(2)} DA</strong>
                      </div>
                    )}
                    <div className="border-t border-slate-300 my-1"></div>
                    <div className="flex justify-between text-slate-950 font-black text-sm uppercase">
                      <span className="font-sans">Net à Payer TTC :</span>
                      <strong className="font-extrabold font-mono text-emerald-700">{(activeInvoiceForView.montantTtcCentimes / 100).toFixed(2)} DA</strong>
                    </div>
                  </div>

                </div>

                {/* SIGNATURE AREA */}
                <div className="mt-16 flex justify-end">
                  <div className="text-center w-64 flex flex-col items-center">
                    <strong className="text-[11px] uppercase tracking-wider text-slate-800 block">Le Cabinet / Comptable Agréé</strong>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Signature et cachet humide</span>
                    <div className="border-b border-dashed border-slate-300 w-48 mt-16"></div>
                  </div>
                </div>

                {/* SECURE BLOCKCHAIN-LIKE TRANSACTION STAMP */}
                <div className="absolute bottom-8 left-12 text-[8px] font-mono text-slate-400 flex items-center gap-1">
                  <span>Document certifié MVP Vanguard Compta • ID transaction : {activeInvoiceForView.id}</span>
                </div>

              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 4: DYNAMIC TAX RULES REVIEWER */}
      {isRulesModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-slate-200 max-w-xl w-full shadow-2xl flex flex-col overflow-hidden max-h-[85vh]">
            
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <strong className="text-sm font-bold flex items-center gap-2"><Info size={16} /> Configuration Légale des Règles Fiscales Algériennes</strong>
              <button onClick={() => setIsRulesModalOpen(false)} className="text-slate-400 hover:text-white"><X size={18} /></button>
            </div>

            <div className="p-5 overflow-y-auto flex flex-col gap-5 text-xs">
              <p className="text-slate-500">Ces règles fiscales proviennent de notre fichier de configuration indépendant <code>tax_rules.json</code> pour un ajustement facile et rapide sans toucher au code métier.</p>
              
              <div>
                <strong className="text-slate-900 font-bold block uppercase border-b pb-1 mb-2">Seuils IFU de l'exercice :</strong>
                <div className="bg-slate-50 p-3 rounded font-mono text-slate-700">
                  <div>Année : {taxRules.fiscalYear}</div>
                  <div>Seuil maximum de Chiffre d'Affaires : <strong className="text-slate-950">{formatDA(taxRules.regimes.ifu.thresholdDzd * 100)}</strong></div>
                  <div className="mt-2 text-[10px] font-sans text-slate-500">Taux par défaut en IFU : 5% pour la production et vente, 12% pour les services et professions libérales.</div>
                </div>
              </div>

              <div>
                <strong className="text-slate-900 font-bold block uppercase border-b pb-1 mb-2">Impôt sur le Revenu des Sociétés (IBS) :</strong>
                <div className="grid grid-cols-3 gap-2 font-mono">
                  <div className="bg-slate-50 p-2.5 rounded text-center">
                    <span className="text-[10px] block text-slate-400 font-sans">Production</span>
                    <strong className="text-slate-900 text-sm mt-1 block">{taxRules.taxes.ibs.rates.production}%</strong>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded text-center">
                    <span className="text-[10px] block text-slate-400 font-sans">BTP / Tourisme</span>
                    <strong className="text-slate-900 text-sm mt-1 block">{taxRules.taxes.ibs.rates.btp_tourisme}%</strong>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded text-center">
                    <span className="text-[10px] block text-slate-400 font-sans">Services</span>
                    <strong className="text-slate-900 text-sm mt-1 block">{taxRules.taxes.ibs.rates.commerce_services}%</strong>
                  </div>
                </div>
              </div>

              <div>
                <strong className="text-slate-900 font-bold block uppercase border-b pb-1 mb-2">Taxe sur l'Activité Professionnelle (TAP) :</strong>
                <p className="text-[11px] text-slate-500 mb-2 leading-relaxed">{taxRules.taxes.tap.description}</p>
                <div className="bg-slate-50 p-3 rounded font-mono text-slate-700 flex justify-between">
                  <span>Taux standard configuré :</span>
                  <strong>{taxRules.taxes.tap.rate}%</strong>
                </div>
              </div>

              <div className="flex justify-end mt-2 pt-3 border-t">
                <button 
                  onClick={() => setIsRulesModalOpen(false)}
                  className="bg-slate-950 text-white px-4 py-2 font-bold rounded shadow text-xs"
                >
                  Fermer
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: CABINET SETTINGS & DATA MANAGEMENT */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-slate-200 max-w-2xl w-full shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
            
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <strong className="text-sm font-bold flex items-center gap-2">
                <Settings size={16} /> Paramètres du Cabinet & Gestion des Données
              </strong>
              <button 
                onClick={() => setIsSettingsModalOpen(false)} 
                className="text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex flex-col gap-6 text-xs">
              
              {/* SECTION 1: CABINET INFORMATION */}
              <form onSubmit={handleSaveCabinetSettings} className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex flex-col gap-3">
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider border-b pb-1.5 flex items-center gap-1.5">
                  <Building2 size={14} className="text-slate-500" /> Informations Légales du Cabinet
                </h3>
                <p className="text-[11px] text-slate-500 mb-1">
                  Ces informations s'affichent sur l'en-tête de toutes vos factures et documents officiels.
                </p>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Nom ou Raison Sociale</label>
                    <input 
                      type="text" 
                      value={cabinetForm.name}
                      onChange={e => setCabinetForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-slate-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Numéro d'Agrément</label>
                    <input 
                      type="text" 
                      value={cabinetForm.agrement}
                      onChange={e => setCabinetForm(prev => ({ ...prev, agrement: e.target.value }))}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-slate-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Téléphone</label>
                    <input 
                      type="text" 
                      value={cabinetForm.phone}
                      onChange={e => setCabinetForm(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-slate-500"
                      required
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Adresse Professionnelle</label>
                    <input 
                      type="text" 
                      value={cabinetForm.address}
                      onChange={e => setCabinetForm(prev => ({ ...prev, address: e.target.value }))}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-slate-500"
                      required
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">E-mail de Contact</label>
                    <input 
                      type="email" 
                      value={cabinetForm.email}
                      onChange={e => setCabinetForm(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-slate-500"
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end mt-2">
                  <button 
                    type="submit" 
                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-1.5 rounded shadow text-xs transition"
                  >
                    Mettre à Jour le Cabinet
                  </button>
                </div>
              </form>

              {/* SECTION 2: DATA MANAGEMENT (LA PURGE DE LA BASE LOCALE) */}
              <div className="border border-slate-200 p-4 rounded-lg flex flex-col gap-4">
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider border-b pb-1.5 flex items-center gap-1.5 text-rose-700">
                  <Database size={14} className="text-rose-600" /> Gestion des Données & Allègement
                </h3>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Conformément aux contraintes du mode <strong>Offline-First obligatoire</strong>, les données de vos dossiers sont stockées en cache local (SQLite / IndexedDB). Utilisez ces outils d'administration pour libérer de l'espace et optimiser la rapidité de l'application.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-1">
                  
                  {/* DATA ACTION 1: CLEAR ALL DRAFT INVOICES */}
                  <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 flex flex-col justify-between gap-3">
                    <div>
                      <strong className="text-slate-900 font-bold block mb-1">Nettoyer les Brouillons</strong>
                      <p className="text-[10px] text-slate-500 leading-relaxed">
                        Supprime définitivement toutes les factures restées à l'état de brouillon pour tous vos clients.
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between mt-1">
                      <span className="font-mono text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-bold">
                        {factures.filter(f => f.statut === 'brouillon').length} Brouillon(s)
                      </span>
                      
                      <button 
                        onClick={handleClearDraftInvoices}
                        className="px-3 py-1.5 rounded font-bold text-xs bg-rose-600 hover:bg-rose-500 text-white transition shadow-sm"
                      >
                        Purger les Brouillons
                      </button>
                    </div>
                  </div>

                  {/* DATA ACTION 2: ARCHIVE COMPLETED DECLARATIONS */}
                  <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 flex flex-col justify-between gap-3">
                    <div>
                      <strong className="text-slate-900 font-bold block mb-1">Archiver les Déclarations</strong>
                      <p className="text-[10px] text-slate-500 leading-relaxed">
                        Purge les obligations fiscales déposées (G50, G12) de l'historique actif pour alléger les dossiers.
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between mt-1">
                      <span className="font-mono text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-bold">
                        {declarations.filter(d => d.statut === 'deposee').length} Déposée(s)
                      </span>
                      
                      <button 
                        onClick={handleArchiveCompletedDeclarations}
                        className="px-3 py-1.5 rounded font-bold text-xs bg-amber-600 hover:bg-amber-500 text-white transition shadow-sm"
                      >
                        Archiver & Purger
                      </button>
                    </div>
                  </div>

                </div>
              </div>

            </div>

            <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex justify-end gap-2">
              <button 
                onClick={() => setIsSettingsModalOpen(false)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded text-xs"
              >
                Fermer
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
