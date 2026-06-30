export interface Cabinet {
  name: string;
  agrement: string;
  address: string;
  phone: string;
  email: string;
}

export interface DossierClient {
  id: string;
  raisonSociale: string;
  nif: string; // Numéro d'Identification Fiscale (15 chiffres)
  nis: string; // Numéro d'Identification Statistique (15 chiffres)
  rc: string;  // Registre de Commerce (ex: 16/00-1234567B20)
  adresse: string;
  activite: string;
  regime: 'ifu' | 'reel_simplifie' | 'reel';
  assujettiTva: boolean;
  tauxTvaParDefaut: number; // 19, 9, ou 0
  synced: boolean;
  lastModified: string;
}

export interface LigneFacture {
  id: string;
  description: string;
  quantite: number;
  prixUnitaireHtCentimes: number; // en centimes
  tauxTva: number; // 19, 9, 0
  totalHtCentimes: number;
}

export interface Facture {
  id: string;
  dossierClientId: string;
  numero: string; // Ex: F26-001 or "BROUILLON"
  dateEmission: string;
  clientFinalName: string;
  clientFinalNif?: string;
  clientFinalAdresse?: string;
  statut: 'brouillon' | 'emise' | 'payee' | 'impayee';
  lignes: LigneFacture[];
  montantHtCentimes: number;
  montantTvaCentimes: number;
  montantTapCentimes: number; // TAP 2% si applicable
  montantTtcCentimes: number;
  modePaiement: 'Especes' | 'Cheque' | 'Virement' | 'Non defini';
  conditionsReglement: string;
  synced: boolean;
  lastModified: string;
}

export interface Declaration {
  id: string;
  dossierClientId: string;
  type: 'G50' | 'G12_PREV' | 'G12_DEF' | 'LIASSE_ANNUELLE' | 'IBS_ACOMPTE';
  periode: string; // Ex: "Juin 2026", "Année 2026"
  dateLimite: string; // YYYY-MM-DD
  statut: 'todo' | 'deposee' | 'en_retard';
  montantCentimes: number;
  notes?: string;
  synced: boolean;
  lastModified: string;
}

export const initialCabinet: Cabinet = {
  name: "Cabinet de Comptabilité & d'Audit El-Amine",
  agrement: "Agrément National N° 2024/4820-C",
  address: "04, Boulevard Mohamed V, Alger Centre, Alger",
  phone: "021 63 45 89 / 0550 12 34 56",
  email: "contact@elamine-audit.dz"
};

export const initialDossiers: DossierClient[] = [
  {
    id: "dos_1",
    raisonSociale: "Sarl Numidia Tech",
    nif: "001216091234567",
    nis: "123456789012345",
    rc: "16/00-9876543B26",
    adresse: "Cité Cooperatives, Dely Ibrahim, Alger",
    activite: "Services Informatiques et Édition de Logiciels",
    regime: "reel_simplifie",
    assujettiTva: true,
    tauxTvaParDefaut: 19,
    synced: true,
    lastModified: "2026-06-28T14:30:00Z"
  },
  {
    id: "dos_2",
    raisonSociale: "Eurl Agri-Export Mitidja",
    nif: "000509012345678",
    nis: "543210987654321",
    rc: "09/00-4567891A25",
    adresse: "Zone Industrielle Ben Boulaid, Blida",
    activite: "Conditionnement et Exportation d'Agrumes",
    regime: "reel",
    assujettiTva: true,
    tauxTvaParDefaut: 9, // Taux réduit pour l'agroalimentaire
    synced: true,
    lastModified: "2026-06-29T10:15:00Z"
  },
  {
    id: "dos_3",
    raisonSociale: "Boulangerie Traditionnelle Oranaise (Kada)",
    nif: "198531010123456",
    nis: "987654321012345",
    rc: "31/00-1122334A23",
    adresse: "12, Rue Larbi Ben M'hidi, Oran",
    activite: "Boulangerie-Pâtisserie de Détail",
    regime: "ifu", // Forfaitaire
    assujettiTva: false, // Pas de TVA en IFU
    tauxTvaParDefaut: 0,
    synced: false,
    lastModified: "2026-06-30T06:00:00Z"
  }
];

export const initialFactures: Facture[] = [
  {
    id: "fac_1_1",
    dossierClientId: "dos_1",
    numero: "F26-001",
    dateEmission: "2026-06-05",
    clientFinalName: "Spa Algérie Télécom",
    clientFinalNif: "000216001234567",
    clientFinalAdresse: "Route Nationale 36, El Biar, Alger",
    statut: "payee",
    modePaiement: "Virement",
    conditionsReglement: "Paiement à 30 jours fin de mois",
    montantHtCentimes: 45000000, // 450 000,00 DA
    montantTvaCentimes: 8550000, // 85 500,00 DA (19%)
    montantTapCentimes: 900000,  // 9 000,00 DA (2% si applicable)
    montantTtcCentimes: 54450000, // 544 500,00 DA (avec TAP)
    lignes: [
      {
        id: "l_1",
        description: "Développement d'un portail web de gestion des abonnés",
        quantite: 1,
        prixUnitaireHtCentimes: 35000000,
        tauxTva: 19,
        totalHtCentimes: 35000000
      },
      {
        id: "l_2",
        description: "Support technique de niveau 3 et maintenance (Mois de Juin)",
        quantite: 1,
        prixUnitaireHtCentimes: 10000000,
        tauxTva: 19,
        totalHtCentimes: 10000000
      }
    ],
    synced: true,
    lastModified: "2026-06-06T11:20:00Z"
  },
  {
    id: "fac_1_2",
    dossierClientId: "dos_1",
    numero: "F26-002",
    dateEmission: "2026-06-20",
    clientFinalName: "Sarl Al-Atlas Distribution",
    clientFinalNif: "002016124578963",
    clientFinalAdresse: "Zone Artisanale, Baba Hassen, Alger",
    statut: "emise",
    modePaiement: "Cheque",
    conditionsReglement: "Paiement à la réception de la facture",
    montantHtCentimes: 12000000, // 120 000,00 DA
    montantTvaCentimes: 2280000,  // 22 800,00 DA
    montantTapCentimes: 240000,   // 2 400,00 DA
    montantTtcCentimes: 14520000, // 145 200,00 DA
    lignes: [
      {
        id: "l_3",
        description: "Licence d'utilisation du logiciel de facturation 'Numidia-Compta'",
        quantite: 3,
        prixUnitaireHtCentimes: 4000000,
        tauxTva: 19,
        totalHtCentimes: 12000000
      }
    ],
    synced: true,
    lastModified: "2026-06-20T16:00:00Z"
  },
  {
    id: "fac_2_1",
    dossierClientId: "dos_2",
    numero: "F26-001",
    dateEmission: "2026-06-12",
    clientFinalName: "Agro-import Paris SAS",
    clientFinalNif: "FR82348576921",
    clientFinalAdresse: "Rungis International Market, France",
    statut: "payee",
    modePaiement: "Virement",
    conditionsReglement: "Virement bancaire sous 15 jours",
    montantHtCentimes: 185000000, // 1 850 000,00 DA
    montantTvaCentimes: 16650000,  // 166 500,00 DA (9% taux réduit agro)
    montantTapCentimes: 0,         // Exonéré de TAP car activité exportatrice (Loi algérienne)
    montantTtcCentimes: 201650000, // 2 016 500,00 DA
    lignes: [
      {
        id: "l_4",
        description: "Exportation Lot d'Oranges de la Mitidja (Variété Thomson Navel) - 15 Tonnes",
        quantite: 15,
        prixUnitaireHtCentimes: 10000000, // 100 000 DA la tonne
        tauxTva: 9,
        totalHtCentimes: 150000000
      },
      {
        id: "l_5",
        description: "Frais de logistique, douane et conditionnement export",
        quantite: 1,
        prixUnitaireHtCentimes: 35000000,
        tauxTva: 9,
        totalHtCentimes: 35000000
      }
    ],
    synced: true,
    lastModified: "2026-06-13T09:00:00Z"
  },
  {
    id: "fac_3_1",
    dossierClientId: "dos_3",
    numero: "F26-001",
    dateEmission: "2026-06-15",
    clientFinalName: "Hôtel Plaza Oran",
    clientFinalNif: "001631024567891",
    clientFinalAdresse: "Front de Mer, Oran",
    statut: "payee",
    modePaiement: "Especes",
    conditionsReglement: "Paiement immédiat",
    montantHtCentimes: 3200000, // 32 000,00 DA
    montantTvaCentimes: 0,       // Régime IFU - Exonéré de TVA
    montantTapCentimes: 0,       // Pas de TAP en IFU
    montantTtcCentimes: 3200000, // 32 000,00 DA
    lignes: [
      {
        id: "l_6",
        description: "Commande de viennoiseries et pains spéciaux pour événement",
        quantite: 1,
        prixUnitaireHtCentimes: 3200000,
        tauxTva: 0,
        totalHtCentimes: 3200000
      }
    ],
    synced: false,
    lastModified: "2026-06-15T18:30:00Z"
  }
];

export const initialDeclarations: Declaration[] = [
  // Déclarations pour Sarl Numidia Tech
  {
    id: "dec_1",
    dossierClientId: "dos_1",
    type: "G50",
    periode: "Mai 2026",
    dateLimite: "2026-06-20",
    statut: "deposee",
    montantCentimes: 11450000, // 114 500,00 DA
    notes: "Déposée et payée par chèque de banque N° 481920",
    synced: true,
    lastModified: "2026-06-18T10:00:00Z"
  },
  {
    id: "dec_2",
    dossierClientId: "dos_1",
    type: "G50",
    periode: "Juin 2026",
    dateLimite: "2026-07-20",
    statut: "todo",
    montantCentimes: 10830000, // 108 300,00 DA calculé
    notes: "À préparer sur la base du chiffre d'affaires de Juin",
    synced: true,
    lastModified: "2026-06-30T07:00:00Z"
  },
  
  // Déclarations pour Eurl Agri-Export Mitidja
  {
    id: "dec_3",
    dossierClientId: "dos_2",
    type: "G50",
    periode: "Mai 2026",
    dateLimite: "2026-06-20",
    statut: "deposee",
    montantCentimes: 24500000, // 245 000,00 DA
    notes: "Quittance N° 28319-A",
    synced: true,
    lastModified: "2026-06-19T11:00:00Z"
  },
  {
    id: "dec_4",
    dossierClientId: "dos_2",
    type: "G50",
    periode: "Juin 2026",
    dateLimite: "2026-07-20",
    statut: "todo",
    montantCentimes: 16650000, // 166 500,00 DA
    notes: "Bénéficie d'exonération de TAP pour activité d'export",
    synced: true,
    lastModified: "2026-06-30T07:00:00Z"
  },

  // Déclarations pour Kada Boulangerie (IFU - Annuelle)
  {
    id: "dec_5",
    dossierClientId: "dos_3",
    type: "G12_PREV",
    periode: "Année 2026",
    dateLimite: "2026-06-30", // Date limite 30 Juin
    statut: "todo",
    montantCentimes: 18500000, // Impôt estimé
    notes: "Déclaration prévisionnelle IFU (G12). Urgent !",
    synced: false,
    lastModified: "2026-06-30T07:00:00Z"
  }
];

/**
 * Helper function to format Dinars Algériens (DA)
 */
export function formatDA(centimes: number): string {
  const dinars = centimes / 100;
  return new Intl.NumberFormat('fr-DZ', {
    style: 'currency',
    currency: 'DZD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(dinars).replace('DZD', 'DA');
}

/**
 * Helper function to spell out numbers in French letters (useful for Algerian invoices)
 */
export function numberToWordsFR(amount: number): string {
  const units = ["", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf"];
  const teens = ["dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"];
  const tens = ["", "dix", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante-dix", "quatre-vingt", "quatre-vingt-dix"];

  function convertLessThanThousand(num: number): string {
    let result = "";
    if (num >= 100) {
      const h = Math.floor(num / 100);
      result += (h === 1 ? "" : units[h] + " ") + "cent" + (h > 1 && num % 100 === 0 ? "s" : "") + " ";
      num %= 100;
    }
    if (num >= 20) {
      const t = Math.floor(num / 10);
      const u = num % 10;
      if (t === 7) {
        result += "soixante-et-" + teens[u];
      } else if (t === 9) {
        result += "quatre-vingt-" + teens[u];
      } else {
        result += tens[t] + (u === 1 ? "-et-un" : (u > 0 ? "-" + units[u] : ""));
      }
    } else if (num >= 10) {
      result += teens[num - 10];
    } else if (num > 0) {
      result += units[num];
    }
    return result.trim();
  }

  if (amount === 0) return "zéro dinar";
  
  let integerPart = Math.floor(amount);
  let decimalPart = Math.round((amount - integerPart) * 100);
  
  let result = "";
  
  if (integerPart >= 1000000) {
    const m = Math.floor(integerPart / 1000000);
    result += convertLessThanThousand(m) + " million" + (m > 1 ? "s" : "") + " ";
    integerPart %= 1000000;
  }
  
  if (integerPart >= 1000) {
    const k = Math.floor(integerPart / 1000);
    result += (k === 1 ? "" : convertLessThanThousand(k) + " ") + "mille ";
    integerPart %= 1000;
  }
  
  if (integerPart > 0) {
    result += convertLessThanThousand(integerPart);
  }
  
  result = result.trim() + " Dinars Algériens";
  
  if (decimalPart > 0) {
    result += " et " + convertLessThanThousand(decimalPart) + " centimes";
  } else {
    result += " et zéro centimes";
  }
  
  return result.charAt(0).toUpperCase() + result.slice(1);
}
