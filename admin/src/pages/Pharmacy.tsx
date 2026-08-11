import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, Search, ShoppingCart, Plus, Minus, Trash2, Check, X,
  Phone, Clock, Package, Store, ClipboardList, ChevronRight, Bell,
  MapPin, AlertCircle, CheckCircle2, Sparkles, Pill, Edit3, Upload, Loader2,
  RotateCcw, BarChart3, Printer, CalendarClock, TrendingUp, AlertTriangle,
} from "lucide-react";
import jsPDF from "jspdf";

// ============================================================
// COMMISSION GALIMO — 10% du sous-total médicaments (hors transport)
// ============================================================
const GALIMO_COMMISSION_RATE = 0.10;
const galimoCommission = (subtotal: number) => Math.round(subtotal * GALIMO_COMMISSION_RATE);
const pharmacyNet = (subtotal: number) => subtotal - galimoCommission(subtotal);
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast as sonner } from "sonner";
import { formatGNF, generateOrderRef } from "../lib/pharmacy";
import { api, getToken } from "../api";

import imgDoliprane from "../assets/meds/doliprane.jpg";
import imgEfferalgan from "../assets/meds/efferalgan.jpg";
import imgNurofen from "../assets/meds/nurofen.jpg";
import imgAmoxicilline from "../assets/meds/amoxicilline.jpg";
import imgAugmentin from "../assets/meds/augmentin.jpg";
import imgBetadine from "../assets/meds/betadine.jpg";
import imgVitamineC from "../assets/meds/vitaminec.jpg";
import imgSmecta from "../assets/meds/smecta.jpg";
import imgSpasfon from "../assets/meds/spasfon.jpg";
import imgMagnesium from "../assets/meds/magnesium.jpg";
import imgAspirine from "../assets/meds/aspirine.jpg";
import imgVoltarene from "../assets/meds/voltarene.jpg";
import imgToplexil from "../assets/meds/toplexil.jpg";
import imgVentoline from "../assets/meds/ventoline.jpg";
import imgLaitBebe from "../assets/meds/lait-bebe.jpg";
import imgDolipraneBebe from "../assets/meds/doliprane-bebe.jpg";
import imgAmlodipine from "../assets/meds/amlodipine.jpg";
import imgPansements from "../assets/meds/pansements.jpg";
import imgImodium from "../assets/meds/imodium.jpg";
import imgGaviscon from "../assets/meds/gaviscon.jpg";
import imgCoartem from "../assets/meds/coartem.jpg";
import imgAsaq from "../assets/meds/asaq.jpg";
import imgQuinine from "../assets/meds/quinine.jpg";
import imgFansidar from "../assets/meds/fansidar.jpg";
import imgMetronidazole from "../assets/meds/metronidazole.jpg";
import imgCotrimoxazole from "../assets/meds/cotrimoxazole.jpg";
import imgDoxycycline from "../assets/meds/doxycycline.jpg";
import imgCeftriaxone from "../assets/meds/ceftriaxone.jpg";
import imgAlbendazole from "../assets/meds/albendazole.jpg";
import imgIvermectine from "../assets/meds/ivermectine.jpg";
import imgSro from "../assets/meds/sro.jpg";
import imgFerFolate from "../assets/meds/fer-folate.jpg";
import imgMetformine from "../assets/meds/metformine.jpg";
import imgMoustiquaire from "../assets/meds/moustiquaire.jpg";
import imgRepulsif from "../assets/meds/repulsif.jpg";
import imgAzithromycine from "../assets/meds/azithromycine.jpg";
import imgCiprofloxacine from "../assets/meds/ciprofloxacine.jpg";
import imgVitamineD3 from "../assets/meds/vitamined3.jpg";
import imgOmega3 from "../assets/meds/omega3.jpg";
import imgMultivitamines from "../assets/meds/multivitamines.jpg";
import imgAspirineCardio from "../assets/meds/aspirine-cardio.jpg";
import imgBisoprolol from "../assets/meds/bisoprolol.jpg";
import imgAtorvastatine from "../assets/meds/atorvastatine.jpg";
import imgAlcool70 from "../assets/meds/alcool70.jpg";
import imgMasques from "../assets/meds/masques.jpg";
import imgSerumPhysio from "../assets/meds/serum-physio.jpg";
import imgVitDBebe from "../assets/meds/vitd-bebe.jpg";
import imgCamoquin from "../assets/meds/camoquin.jpg";
import imgPaluject from "../assets/meds/paluject.jpg";
import imgParacetamolDenk from "../assets/meds/paracetamol-denk.jpg";
import imgErythromycine from "../assets/meds/erythromycine.jpg";
import imgAmpicilline from "../assets/meds/ampicilline.jpg";
import imgPraziquantel from "../assets/meds/praziquantel.jpg";
import imgZinc from "../assets/meds/zinc.jpg";
import imgCharbon from "../assets/meds/charbon.jpg";
import imgKetoconazole from "../assets/meds/ketoconazole.jpg";
import imgCanesten from "../assets/meds/canesten.jpg";
import imgGriseofulvine from "../assets/meds/griseofulvine.jpg";
import imgCetirizine from "../assets/meds/cetirizine.jpg";
import imgLoratadine from "../assets/meds/loratadine.jpg";
import imgTotheme from "../assets/meds/totheme.jpg";
import imgAcideFolique from "../assets/meds/acide-folique.jpg";
import imgDaonil from "../assets/meds/daonil.jpg";
import imgCaptopril from "../assets/meds/captopril.jpg";
import imgNifedipine from "../assets/meds/nifedipine.jpg";
import imgLasix from "../assets/meds/lasix.jpg";
import imgCerelac from "../assets/meds/cerelac.jpg";
import imgEfferalganPed from "../assets/meds/efferalgan-ped.jpg";
import imgVermifugeEnfant from "../assets/meds/vermifuge-enfant.jpg";

// ============================================================
// TYPES & MOCK DATA
// ============================================================

type Category = "all" | "fievre" | "antibio" | "vitamines" | "cardio" | "soins" | "bebe";
type StockLevel = "high" | "medium" | "low" | "out";

interface Medicine {
  id: string;
  emoji: string;
  image?: string;
  name: string;
  dosage: string;
  description: string;
  category: Exclude<Category, "all">;
  prescription: boolean;
  onOrder: boolean;
  stock: StockLevel;
  price?: number; // GNF — visible uniquement côté pharmacien
  indications?: string[]; // maux / maladies pour lesquels le produit est indiqué
}

interface CartLine { medicineId: string; quantity: number; }

function PrescriptionBadge({ small = false }: { small?: boolean }) {
  return (
    <span className={`font-bold text-amber-700 bg-amber-50 rounded-full flex items-center gap-1 ${small ? "text-[9px] px-1.5 py-0.5" : "text-[10px] px-2 py-1"}`}>
      <AlertCircle className={small ? "h-2.5 w-2.5" : "h-3 w-3"} /> Ordonnance
    </span>
  );
}

// Prix catalogue réaliste en GNF, déterministe par id + catégorie.
// Visible UNIQUEMENT côté pharmacien.
const PRICE_RANGES: Record<Exclude<Category, "all">, [number, number]> = {
  fievre:    [ 5000,  25000],
  antibio:   [25000,  95000],
  vitamines: [15000,  55000],
  cardio:    [30000, 120000],
  soins:     [ 4000,  35000],
  bebe:      [ 8000,  40000],
};
function defaultPriceFor(m: { id: string; category: Exclude<Category, "all"> }): number {
  const [lo, hi] = PRICE_RANGES[m.category] ?? [10000, 30000];
  // Hash simple sur l'id pour un prix stable
  let h = 0;
  for (let i = 0; i < m.id.length; i++) h = (h * 31 + m.id.charCodeAt(i)) >>> 0;
  const raw = lo + (h % (hi - lo));
  // Arrondi au 500 GNF le plus proche
  return Math.max(500, Math.round(raw / 500) * 500);
}
export function pharmacistPrice(m: Medicine): number {
  return typeof m.price === "number" ? m.price : defaultPriceFor(m);
}

// ============================================================
// Mapping vers/depuis l'API réelle (backend/src/routes/medicines.ts)
// ============================================================
function apiMedicineToDemo(m: any): Medicine {
  const category = (CATEGORIES.some((c) => c.id === m.category) ? m.category : "soins") as Exclude<Category, "all">;
  const base = {
    id: m.id,
    emoji: CATEGORIES.find((c) => c.id === category)?.emoji ?? "💊",
    image: m.image_url ?? undefined,
    name: m.name,
    dosage: m.form ?? "",
    description: m.description ?? "",
    category,
    prescription: !!m.requires_prescription,
    onOrder: false,
    stock: (m.in_stock ? "high" : "out") as StockLevel,
    price: typeof m.price === "number" ? m.price : Number(m.price),
  };
  return { ...base, indications: deriveIndications(base) };
}

function demoMedicineToApiBody(m: Medicine, pharmacyId: string) {
  return {
    pharmacyId,
    name: m.name,
    price: pharmacistPrice(m),
    category: m.category,
    form: m.dosage || undefined,
    imageUrl: m.image || undefined,
    description: m.description || undefined,
    inStock: m.stock !== "out",
    requiresPrescription: m.prescription,
  };
}

// Indications dérivées automatiquement pour la recherche par mal / symptôme
function deriveIndications(m: Medicine): string[] {
  const base: string[] = [];
  switch (m.category) {
    case "fievre":
      base.push("fièvre", "douleur", "maux de tête", "mal de tête", "maux de dents", "règles douloureuses", "fièvre typhoïde", "grippe");
      break;
    case "antibio":
      base.push("infection", "bactérie", "fièvre", "gorge", "angine", "poumon", "bronchite", "pneumonie", "urine", "infection urinaire", "amibiase", "giardiase");
      break;
    case "vitamines":
      base.push("fatigue", "carence", "anémie", "grossesse", "convalescence", "faiblesse");
      break;
    case "cardio":
      base.push("hypertension", "tension", "cholestérol", "diabète", "cœur", "insuffisance cardiaque");
      break;
    case "soins":
      base.push("plaie", "brûlure", "diarrhée", "toux", "allergie", "peau", "mycose", "désinfection", "ver", "gale", "maux de ventre", "mal de ventre", "colique");
      break;
    case "bebe":
      base.push("bébé", "nourrisson", "fièvre", "diarrhée", "vaccination");
      break;
  }
  const desc = m.description.toLowerCase();
  const illnessKeywords = [
    "paludisme", "malaria", "diarrhée", "toux", "fièvre", "douleur", "hypertension", "cholestérol",
    "diabète", "infection", "allergie", "anémie", "grossesse", "ver", "mycose", "brûlure", "plaie",
    "asthme", "rhinite", "sinusite", "bronchite", "pneumonie", "amibiase", "giardiase", "schistosomiase",
    "onchocercose", "gale", "filariose", "colique", "spasme", "reflux", "constipation", "nausée",
    "vomissement", "maux de gorge", "mal de gorge", "conjonctivite", "otite", "sinusite", "migraine",
    "insomnie", "anxiété", "dépression", "épilepsie", "thyroïde", "contraception", "gynéco",
    "brûlure", "coup de soleil", "démangeaison", "acné", "eczéma", "psoriasis",
  ];
  illnessKeywords.forEach((k) => {
    if (desc.includes(k) && !base.includes(k)) base.push(k);
  });
  return base;
}

const SYMPTOM_ALIASES: Record<string, string[]> = {
  "maux de tête": ["maux de tête", "mal de tête", "douleur", "fièvre", "migraine"],
  "mal de tête": ["maux de tête", "mal de tête", "douleur", "fièvre", "migraine"],
  "maux de ventre": ["maux de ventre", "mal de ventre", "diarrhée", "colique", "spasme", "antispasmodique"],
  "mal de ventre": ["maux de ventre", "mal de ventre", "diarrhée", "colique", "spasme", "antispasmodique"],
  "gorge": ["gorge", "angine", "pharyngite", "amygdaite", "toux"],
  "paludisme": ["paludisme", "malaria", "artéméther", "artésunate", "amodiaquine", "luméfantrine", "quinine", "fansidar"],
  "malaria": ["paludisme", "malaria", "artéméther", "artésunate", "amodiaquine", "luméfantrine", "quinine", "fansidar"],
  "toux": ["toux", "toplexil", "ventoline", "bronchite", "expectorant", "antitussif"],
  "fièvre": ["fièvre", "paracétamol", "ibuprofène", "aspirine"],
  "diarrhée": ["diarrhée", "smecta", "imodium", "sro", "zinc"],
  "ver": ["vermifuge", "albendazole", "mébendazole", "parasite", "oxyurose", "helminthe", "ascaris"],
  "tension": ["tension", "hypertension"],
  "diabète": ["diabète", "metformine", "glucophage", "daonil", "glipizide", "insuline"],
  "allergie": ["allergie", "cétirizine", "loratadine", "antihistaminique"],
  "plaie": ["plaie", "betadine", "alcool", "pansement", "antiseptique"],
  "brûlure": ["brûlure", "betadine", "antiseptique"],
  "peau": ["peau", "mycose", "kétoconazole", "clotrimazole", "griséofulvine"],
  "grossesse": ["grossesse", "acide folique", "fer", "folate"],
  "bébé": ["bébé", "nourrisson", "pédiatrique", "sirop"],
};

const QUICK_SYMPTOMS = ["Fièvre", "Paludisme", "Toux", "Diarrhée", "Maux de tête", "Allergie"];

type OrderStatus =
  | "pending_pharmacist"   // Envoyée, en attente
  | "awaiting_client"      // Prix confirmés, en attente d'acceptation
  | "accepted"             // Payée
  | "ready"                // Prête au retrait
  | "delivered"            // Livrée
  | "cancelled"
  | "expired";

interface OrderItem {
  medicineId: string;
  quantity: number;
  isAvailable: boolean | null;   // null = pas encore répondu
  confirmedPrice: number | null;
}

interface Order {
  id: string;
  ref: string;
  createdAt: number;
  expiresAt: number;
  deliveryMode: "retrait" | "livraison";
  deliveryFee: number | null;
  items: OrderItem[];
  status: OrderStatus;
  clientName: string;
  clientPhone: string;
  city?: string;
  deliveryAddress?: string;
  prescriptionUrl?: string;
  prescriptionRequested?: boolean;
}

const MOCK_MEDICINES: Medicine[] = [
  // Fièvre & douleur
  { id: "m1",  emoji: "💊", image: imgDoliprane,     name: "Doliprane",         dosage: "1000 mg — 8 cp",           description: "Paracétamol dosé pour adultes. Soulage douleurs et fièvre.", category: "fievre",     prescription: false, onOrder: false, stock: "high" },
  { id: "m2",  emoji: "🌡️", image: imgEfferalgan,    name: "Efferalgan",        dosage: "500 mg — 16 cp eff.",      description: "Paracétamol effervescent. Action rapide contre douleurs et fièvre.", category: "fievre", prescription: false, onOrder: false, stock: "high" },
  { id: "m3",  emoji: "💊", image: imgNurofen,       name: "Nurofen",           dosage: "400 mg — 20 cp",           description: "Ibuprofène anti-inflammatoire, douleurs et fièvre.", category: "fievre",   prescription: false, onOrder: false, stock: "high" },
  { id: "m4",  emoji: "💊", image: imgAspirine,      name: "Aspirine UPSA",     dosage: "500 mg — 20 cp",           description: "Acide acétylsalicylique. Douleurs légères à modérées, fièvre.", category: "fievre", prescription: false, onOrder: false, stock: "medium" },
  { id: "m5",  emoji: "🧴", image: imgVoltarene,     name: "Voltarène Emulgel", dosage: "Tube 100 g",               description: "Gel anti-inflammatoire local pour douleurs musculaires et articulaires.", category: "fievre", prescription: false, onOrder: false, stock: "medium" },

  // Antibiotiques
  { id: "m6",  emoji: "💉", image: imgAmoxicilline,  name: "Amoxicilline",      dosage: "500 mg — 12 gél",          description: "Antibiotique à large spectre. Infections bactériennes.", category: "antibio",    prescription: true,  onOrder: false, stock: "medium" },
  { id: "m7",  emoji: "🧪", image: imgAugmentin,     name: "Augmentin",         dosage: "1 g — 14 cp",              description: "Amoxicilline + acide clavulanique. Ordonnance obligatoire.", category: "antibio", prescription: true, onOrder: true,  stock: "low" },
  { id: "m8",  emoji: "💊", image: imgAzithromycine,                          name: "Azithromycine",     dosage: "500 mg — 3 cp",            description: "Antibiotique macrolide, cure courte 3 jours.", category: "antibio",              prescription: true,  onOrder: false, stock: "medium" },
  { id: "m9",  emoji: "💊", image: imgCiprofloxacine,                          name: "Ciprofloxacine",    dosage: "500 mg — 10 cp",           description: "Antibiotique fluoroquinolone. Infections urinaires et respiratoires.", category: "antibio", prescription: true, onOrder: true, stock: "low" },

  // Vitamines & compléments
  { id: "m10", emoji: "🍊", image: imgVitamineC,     name: "Vitamine C",        dosage: "1000 mg — 20 cp eff.",     description: "Complément vitaminique pour renforcer les défenses.", category: "vitamines", prescription: false, onOrder: false, stock: "high" },
  { id: "m11", emoji: "🌿", image: imgMagnesium,     name: "Magnésium B6",      dosage: "60 gélules",               description: "Réduit fatigue et stress. Cure d'un mois.", category: "vitamines",              prescription: false, onOrder: false, stock: "medium" },
  { id: "m12", emoji: "☀️", image: imgVitamineD3,                          name: "Vitamine D3",       dosage: "Ampoule 100 000 UI",       description: "Prévention et traitement de la carence en vitamine D.", category: "vitamines",  prescription: false, onOrder: false, stock: "high" },
  { id: "m13", emoji: "🐟", image: imgOmega3,                          name: "Oméga 3",            dosage: "60 capsules",              description: "Acides gras essentiels pour le cœur et le cerveau.", category: "vitamines",     prescription: false, onOrder: false, stock: "medium" },
  { id: "m14", emoji: "🌱", image: imgMultivitamines,                          name: "Multivitamines",    dosage: "30 cp",                    description: "Complexe multivitaminé pour toute la famille.", category: "vitamines",           prescription: false, onOrder: false, stock: "high" },

  // Cardio
  { id: "m15", emoji: "❤️", image: imgAmlodipine,    name: "Amlodipine",        dosage: "5 mg — 30 cp",             description: "Traitement de l'hypertension artérielle.", category: "cardio",                   prescription: true,  onOrder: false, stock: "medium" },
  { id: "m16", emoji: "🩺", image: imgAspirineCardio,                          name: "Aspirine cardio",   dosage: "100 mg — 30 cp",           description: "Prévention cardiovasculaire à faible dose.", category: "cardio",                 prescription: true,  onOrder: false, stock: "high" },
  { id: "m17", emoji: "❤️", image: imgBisoprolol,                          name: "Bisoprolol",        dosage: "5 mg — 30 cp",             description: "Bêta-bloquant pour l'hypertension et l'insuffisance cardiaque.", category: "cardio", prescription: true, onOrder: false, stock: "medium" },
  { id: "m18", emoji: "💉", image: imgAtorvastatine,                          name: "Atorvastatine",     dosage: "20 mg — 30 cp",            description: "Statine pour réduire le cholestérol.", category: "cardio",                       prescription: true,  onOrder: true,  stock: "low" },

  // Digestif / respiratoire (regroupés dans soins)
  { id: "m19", emoji: "🧴", image: imgBetadine,      name: "Bétadine dermique", dosage: "Flacon 125 ml",            description: "Antiseptique cutané pour plaies et petites blessures.", category: "soins",   prescription: false, onOrder: false, stock: "high" },
  { id: "m20", emoji: "🩹", image: imgPansements,    name: "Pansements Urgo",   dosage: "Boîte de 20",              description: "Pansements adhésifs stériles, formats assortis.", category: "soins",         prescription: false, onOrder: false, stock: "high" },
  { id: "m21", emoji: "💊", image: imgSmecta,        name: "Smecta",            dosage: "Boîte 30 sachets",         description: "Diosmectite anti-diarrhée pour adultes et enfants.", category: "soins",        prescription: false, onOrder: false, stock: "high" },
  { id: "m22", emoji: "💊", image: imgSpasfon,       name: "Spasfon",           dosage: "80 mg — 30 cp",            description: "Antispasmodique digestif. Coliques et douleurs abdominales.", category: "soins", prescription: false, onOrder: false, stock: "high" },
  { id: "m23", emoji: "💧", image: imgGaviscon,      name: "Gaviscon",          dosage: "24 sachets",               description: "Anti-acide et anti-reflux gastro-œsophagien.", category: "soins",             prescription: false, onOrder: false, stock: "medium" },
  { id: "m24", emoji: "💊", image: imgImodium,       name: "Imodium",           dosage: "2 mg — 20 gél",            description: "Lopéramide, anti-diarrhée d'urgence.", category: "soins",                       prescription: false, onOrder: false, stock: "medium" },
  { id: "m25", emoji: "🌿", image: imgToplexil,      name: "Toplexil sirop",    dosage: "Flacon 150 ml",            description: "Sirop antitussif pour toux sèche de l'adulte.", category: "soins",              prescription: false, onOrder: false, stock: "medium" },
  { id: "m26", emoji: "💨", image: imgVentoline,     name: "Ventoline",         dosage: "Aérosol 200 doses",        description: "Salbutamol bronchodilatateur. Crise d'asthme.", category: "soins",              prescription: true,  onOrder: false, stock: "medium" },
  { id: "m27", emoji: "🧼", image: imgAlcool70,                          name: "Alcool 70°",        dosage: "Flacon 250 ml",            description: "Alcool désinfectant à usage externe.", category: "soins",                       prescription: false, onOrder: false, stock: "high" },
  { id: "m28", emoji: "😷", image: imgMasques,                          name: "Masques chirurgicaux", dosage: "Boîte de 50",           description: "Masques 3 plis à usage unique.", category: "soins",                             prescription: false, onOrder: false, stock: "high" },

  // Bébé
  { id: "m29", emoji: "🍼", image: imgLaitBebe,      name: "Nan Optipro 1",     dosage: "Boîte 800 g",              description: "Lait infantile 0-6 mois.", category: "bebe",                                    prescription: false, onOrder: true,  stock: "low" },
  { id: "m30", emoji: "👶", image: imgDolipraneBebe, name: "Doliprane pédiatrique", dosage: "Suspension 100 ml",    description: "Paracétamol pédiatrique en suspension buvable.", category: "bebe",              prescription: false, onOrder: false, stock: "medium" },
  { id: "m31", emoji: "🧴", image: imgSerumPhysio,                          name: "Sérum physiologique", dosage: "40 doses × 5 ml",        description: "Nettoyage nasal et oculaire du nourrisson.", category: "bebe",                    prescription: false, onOrder: false, stock: "high" },
  { id: "m32", emoji: "🍯", image: imgVitDBebe,                          name: "Vitamine D bébé",   dosage: "Flacon 10 ml",             description: "Prévention du rachitisme chez le nourrisson.", category: "bebe",                    prescription: false, onOrder: false, stock: "high" },

  // === Médicaments courants en Afrique ===
  { id: "m33", emoji: "🦟", image: imgCoartem, name: "Coartem (Artéméther + Luméfantrine)", dosage: "20/120 mg — 24 cp", description: "Antipaludéen de 1ère ligne (ACT). Paludisme non compliqué.", category: "fievre", prescription: true, onOrder: false, stock: "high" },
  { id: "m34", emoji: "🦟", image: imgCoartem, name: "Artefan", dosage: "80/480 mg — 6 cp", description: "Association artéméther/luméfantrine, cure de 3 jours.", category: "fievre", prescription: true, onOrder: false, stock: "high" },
  { id: "m35", emoji: "🦟", image: imgAsaq, name: "Artesunate + Amodiaquine (ASAQ)", dosage: "100/270 mg — 6 cp", description: "ACT recommandée par l'OMS pour le paludisme simple.", category: "fievre", prescription: true, onOrder: false, stock: "medium" },
  { id: "m36", emoji: "💊", image: imgQuinine, name: "Quinine", dosage: "500 mg — 20 cp", description: "Antipaludéen historique, formes graves ou de recours.", category: "fievre", prescription: true, onOrder: true, stock: "low" },
  { id: "m37", emoji: "🛡️", image: imgFansidar, name: "Fansidar (SP)", dosage: "3 cp", description: "Traitement préventif intermittent chez la femme enceinte.", category: "fievre", prescription: true, onOrder: false, stock: "medium" },
  { id: "m38", emoji: "🌿", image: imgCamoquin, name: "Camoquin (Amodiaquine)", dosage: "200 mg — 12 cp", description: "Antipaludéen, souvent associé à l'artésunate.", category: "fievre", prescription: true, onOrder: true, stock: "low" },
  { id: "m39", emoji: "💉", image: imgPaluject, name: "Paluject (Artéméther inj.)", dosage: "80 mg/ml — Ampoule", description: "Antipaludéen injectable, paludisme grave.", category: "fievre", prescription: true, onOrder: true, stock: "low" },
  { id: "m40", emoji: "🌡️", image: imgParacetamolDenk, name: "Paracétamol Denk", dosage: "500 mg — 1000 cp", description: "Paracétamol générique très répandu en Afrique de l'Ouest.", category: "fievre", prescription: false, onOrder: false, stock: "high" },
  { id: "m41", emoji: "💊", image: imgMetronidazole, name: "Métronidazole (Flagyl)", dosage: "250 mg — 20 cp", description: "Amibiase, giardiase, infections anaérobies.", category: "antibio", prescription: true, onOrder: false, stock: "high" },
  { id: "m42", emoji: "💊", image: imgCotrimoxazole, name: "Cotrimoxazole (Bactrim)", dosage: "480 mg — 20 cp", description: "Infections urinaires et respiratoires.", category: "antibio", prescription: true, onOrder: false, stock: "high" },
  { id: "m43", emoji: "💊", image: imgDoxycycline, name: "Doxycycline", dosage: "100 mg — 10 gél", description: "Cycline, aussi utilisée en prophylaxie du paludisme.", category: "antibio", prescription: true, onOrder: false, stock: "medium" },
  { id: "m44", emoji: "💊", image: imgErythromycine, name: "Érythromycine", dosage: "500 mg — 16 cp", description: "Macrolide, infections ORL et respiratoires.", category: "antibio", prescription: true, onOrder: false, stock: "medium" },
  { id: "m45", emoji: "💉", image: imgCeftriaxone, name: "Ceftriaxone (inj.)", dosage: "1 g — Flacon", description: "Céphalosporine 3e génération injectable, infections sévères.", category: "antibio", prescription: true, onOrder: true, stock: "low" },
  { id: "m46", emoji: "💊", image: imgAmpicilline, name: "Ampicilline", dosage: "500 mg — 16 gél", description: "Bêta-lactamine à large spectre.", category: "antibio", prescription: true, onOrder: false, stock: "medium" },
  { id: "m47", emoji: "🪱", image: imgAlbendazole, name: "Albendazole (Zentel)", dosage: "400 mg — 1 cp", description: "Vermifuge à large spectre, dose unique.", category: "soins", prescription: false, onOrder: false, stock: "high" },
  { id: "m48", emoji: "🪱", image: imgAlbendazole, name: "Mébendazole (Vermox)", dosage: "100 mg — 6 cp", description: "Traitement des vers intestinaux.", category: "soins", prescription: false, onOrder: false, stock: "high" },
  { id: "m49", emoji: "🐛", image: imgPraziquantel, name: "Praziquantel", dosage: "600 mg — 4 cp", description: "Antibilharzien, traitement de la schistosomiase.", category: "soins", prescription: true, onOrder: true, stock: "low" },
  { id: "m50", emoji: "🩹", image: imgIvermectine, name: "Ivermectine (Mectizan)", dosage: "3 mg — 4 cp", description: "Onchocercose, gale, filariose.", category: "soins", prescription: true, onOrder: false, stock: "medium" },
  { id: "m51", emoji: "💧", image: imgSro, name: "SRO (Sels de réhydratation)", dosage: "Sachet — Boîte de 10", description: "Réhydratation en cas de diarrhée aiguë. Indispensable enfant.", category: "soins", prescription: false, onOrder: false, stock: "high" },
  { id: "m52", emoji: "💊", image: imgZinc, name: "Zinc", dosage: "20 mg — 10 cp", description: "Complément au SRO chez l'enfant diarrhéique (OMS).", category: "bebe", prescription: false, onOrder: false, stock: "high" },
  { id: "m53", emoji: "🌿", image: imgCharbon, name: "Charbon activé", dosage: "20 gél", description: "Diarrhée, ballonnements, intoxications légères.", category: "soins", prescription: false, onOrder: false, stock: "medium" },
  { id: "m54", emoji: "🧴", image: imgKetoconazole, name: "Kétoconazole crème", dosage: "Tube 30 g", description: "Antifongique cutané, mycoses de la peau.", category: "soins", prescription: false, onOrder: false, stock: "high" },
  { id: "m55", emoji: "🧴", image: imgCanesten, name: "Clotrimazole (Canesten)", dosage: "Tube 20 g", description: "Antifongique local, mycoses cutanées et vaginales.", category: "soins", prescription: false, onOrder: false, stock: "high" },
  { id: "m56", emoji: "💊", image: imgGriseofulvine, name: "Griséofulvine", dosage: "500 mg — 20 cp", description: "Antifongique oral, teignes du cuir chevelu.", category: "soins", prescription: true, onOrder: true, stock: "low" },
  { id: "m57", emoji: "💊", image: imgCetirizine, name: "Cétirizine", dosage: "10 mg — 20 cp", description: "Antihistaminique, allergies et rhinites.", category: "soins", prescription: false, onOrder: false, stock: "high" },
  { id: "m58", emoji: "💊", image: imgLoratadine, name: "Loratadine", dosage: "10 mg — 10 cp", description: "Antihistaminique non sédatif.", category: "soins", prescription: false, onOrder: false, stock: "medium" },
  { id: "m59", emoji: "🩸", image: imgFerFolate, name: "Fer + Acide folique", dosage: "60/0.4 mg — 30 cp", description: "Supplémentation contre l'anémie, femme enceinte.", category: "vitamines", prescription: false, onOrder: false, stock: "high" },
  { id: "m60", emoji: "🩸", image: imgTotheme, name: "Tot'héma (fer buvable)", dosage: "20 ampoules", description: "Fer, cuivre, manganèse — anémie ferriprive.", category: "vitamines", prescription: false, onOrder: false, stock: "medium" },
  { id: "m61", emoji: "🤰", image: imgAcideFolique, name: "Acide folique", dosage: "5 mg — 30 cp", description: "Grossesse et prévention des malformations du tube neural.", category: "vitamines", prescription: false, onOrder: false, stock: "high" },
  { id: "m62", emoji: "🩺", image: imgMetformine, name: "Metformine (Glucophage)", dosage: "500 mg — 30 cp", description: "Antidiabétique oral de référence, diabète type 2.", category: "cardio", prescription: true, onOrder: false, stock: "high" },
  { id: "m63", emoji: "🩺", image: imgDaonil, name: "Glibenclamide (Daonil)", dosage: "5 mg — 30 cp", description: "Sulfamide hypoglycémiant.", category: "cardio", prescription: true, onOrder: false, stock: "medium" },
  { id: "m64", emoji: "❤️", image: imgCaptopril, name: "Captopril", dosage: "25 mg — 30 cp", description: "IEC, hypertension artérielle.", category: "cardio", prescription: true, onOrder: false, stock: "medium" },
  { id: "m65", emoji: "❤️", image: imgNifedipine, name: "Nifédipine", dosage: "20 mg LP — 30 cp", description: "Inhibiteur calcique, hypertension.", category: "cardio", prescription: true, onOrder: false, stock: "medium" },
  { id: "m66", emoji: "💧", image: imgLasix, name: "Furosémide (Lasix)", dosage: "40 mg — 30 cp", description: "Diurétique de l'anse, HTA et œdèmes.", category: "cardio", prescription: true, onOrder: false, stock: "medium" },
  { id: "m67", emoji: "🦟", image: imgRepulsif, name: "Répulsif anti-moustiques DEET", dosage: "Spray 100 ml", description: "Protection contre les moustiques vecteurs.", category: "soins", prescription: false, onOrder: false, stock: "high" },
  { id: "m68", emoji: "🛏️", image: imgMoustiquaire, name: "Moustiquaire imprégnée (MILDA)", dosage: "1 pièce", description: "Prévention du paludisme.", category: "soins", prescription: false, onOrder: false, stock: "medium" },
  { id: "m69", emoji: "🍼", image: imgCerelac, name: "Cerelac blé", dosage: "Boîte 400 g", description: "Céréales infantiles dès 6 mois.", category: "bebe", prescription: false, onOrder: false, stock: "high" },
  { id: "m70", emoji: "👶", image: imgEfferalganPed, name: "Efferalgan pédiatrique sirop", dosage: "Flacon 90 ml", description: "Paracétamol sirop pour enfant.", category: "bebe", prescription: false, onOrder: false, stock: "high" },
  { id: "m71", emoji: "🍯", image: imgVermifugeEnfant, name: "Sirop vermifuge enfant", dosage: "Flacon 30 ml", description: "Vermifuge en suspension buvable pour enfant.", category: "bebe", prescription: false, onOrder: false, stock: "medium" },

  // === Compléments médicaments les plus demandés en Guinée / Afrique de l'Ouest ===
  // Fièvre / douleur / anti-inflammatoires
  { id: "m72", emoji: "💊", image: imgDoliprane, name: "Paracétamol 500 mg", dosage: "500 mg — 1000 cp", description: "Antalgique/antipyrétique générique très demandé.", category: "fievre", prescription: false, onOrder: false, stock: "high" },
  { id: "m73", emoji: "💊", image: imgNurofen, name: "Ibuprofène 200 mg", dosage: "200 mg — 20 cp", description: "Anti-inflammatoire, douleurs et fièvre.", category: "fievre", prescription: false, onOrder: false, stock: "high" },
  { id: "m74", emoji: "💊", image: imgNurofen, name: "Ibuprofène 400 mg", dosage: "400 mg — 30 cp", description: "AINS, douleurs modérées à sévères.", category: "fievre", prescription: false, onOrder: false, stock: "medium" },
  { id: "m75", emoji: "💊", image: imgVoltarene, name: "Diclofénac 50 mg", dosage: "50 mg — 30 cp", description: "AINS puissant, douleurs articulaires.", category: "fievre", prescription: true, onOrder: false, stock: "medium" },
  { id: "m76", emoji: "💉", image: imgVoltarene, name: "Diclofénac injectable", dosage: "75 mg/3 ml — Ampoule", description: "Douleurs aiguës, coliques néphrétiques.", category: "fievre", prescription: true, onOrder: true, stock: "low" },
  { id: "m77", emoji: "💊", image: imgAspirine, name: "Aspirine 500 mg", dosage: "500 mg — 20 cp", description: "Antalgique, antipyrétique.", category: "fievre", prescription: false, onOrder: false, stock: "high" },
  { id: "m78", emoji: "💊", image: imgSpasfon, name: "Phloroglucinol (Spasfon-like)", dosage: "80 mg — 30 cp", description: "Antispasmodique digestif et gynéco.", category: "fievre", prescription: false, onOrder: false, stock: "high" },
  { id: "m79", emoji: "💊", image: imgSpasfon, name: "Buscopan", dosage: "10 mg — 20 cp", description: "Antispasmodique, coliques.", category: "soins", prescription: false, onOrder: false, stock: "medium" },
  { id: "m80", emoji: "💊", image: imgDoliprane, name: "Tramadol 50 mg", dosage: "50 mg — 20 gél", description: "Antalgique de palier 2, douleurs sévères.", category: "fievre", prescription: true, onOrder: true, stock: "low" },
  { id: "m81", emoji: "💊", image: imgDoliprane, name: "Codéine + Paracétamol", dosage: "500/30 mg — 20 cp", description: "Douleurs modérées à intenses.", category: "fievre", prescription: true, onOrder: true, stock: "low" },
  { id: "m82", emoji: "🧴", image: imgVoltarene, name: "Baume chinois", dosage: "Pot 20 g", description: "Baume chauffant, douleurs musculaires.", category: "soins", prescription: false, onOrder: false, stock: "high" },
  { id: "m83", emoji: "🧴", image: imgVoltarene, name: "Baume du tigre rouge", dosage: "Pot 30 g", description: "Douleurs musculaires et articulaires.", category: "soins", prescription: false, onOrder: false, stock: "high" },

  // Paludisme / antipaludéens supplémentaires
  { id: "m84", emoji: "🦟", image: imgCoartem, name: "Artéméther + Luméfantrine (enfant)", dosage: "20/120 mg — 6 cp", description: "ACT pédiatrique, paludisme simple.", category: "bebe", prescription: true, onOrder: false, stock: "high" },
  { id: "m85", emoji: "🦟", image: imgAsaq, name: "ASAQ pédiatrique", dosage: "25/67.5 mg — 3 cp", description: "Artésunate-amodiaquine nourrisson (5-8 kg).", category: "bebe", prescription: true, onOrder: false, stock: "medium" },
  { id: "m86", emoji: "💉", image: imgPaluject, name: "Artésunate injectable", dosage: "60 mg — Flacon", description: "Paludisme grave, traitement hospitalier.", category: "fievre", prescription: true, onOrder: true, stock: "low" },
  { id: "m87", emoji: "💊", image: imgQuinine, name: "Quinimax", dosage: "500 mg — 20 cp", description: "Quinine + quinidine + cinchonine.", category: "fievre", prescription: true, onOrder: true, stock: "low" },
  { id: "m88", emoji: "🦟", image: imgFansidar, name: "Sulfadoxine-Pyriméthamine", dosage: "500/25 mg — 3 cp", description: "TPI grossesse, prévention paludisme.", category: "fievre", prescription: true, onOrder: false, stock: "medium" },
  { id: "m89", emoji: "💊", image: imgDoxycycline, name: "Méfloquine (Lariam)", dosage: "250 mg — 8 cp", description: "Prophylaxie et traitement du paludisme.", category: "fievre", prescription: true, onOrder: true, stock: "low" },

  // Antibiotiques
  { id: "m90", emoji: "💊", image: imgAmoxicilline, name: "Amoxicilline sirop enfant", dosage: "250 mg/5 ml — 60 ml", description: "Antibiotique pédiatrique.", category: "bebe", prescription: true, onOrder: false, stock: "high" },
  { id: "m91", emoji: "💊", image: imgAugmentin, name: "Augmentin sirop enfant", dosage: "228 mg/5 ml — 60 ml", description: "Amoxicilline + clavulanate pédiatrique.", category: "bebe", prescription: true, onOrder: false, stock: "medium" },
  { id: "m92", emoji: "💊", image: imgAmoxicilline, name: "Ampicilline sirop", dosage: "125 mg/5 ml — 60 ml", description: "Antibiotique pédiatrique.", category: "bebe", prescription: true, onOrder: false, stock: "medium" },
  { id: "m93", emoji: "💊", image: imgErythromycine, name: "Clarithromycine", dosage: "500 mg — 14 cp", description: "Macrolide, infections respiratoires.", category: "antibio", prescription: true, onOrder: true, stock: "low" },
  { id: "m94", emoji: "💊", image: imgErythromycine, name: "Spiramycine (Rovamycine)", dosage: "1.5 MUI — 16 cp", description: "Macrolide, infections ORL et dentaires.", category: "antibio", prescription: true, onOrder: false, stock: "medium" },
  { id: "m95", emoji: "💊", image: imgMetronidazole, name: "Métronidazole sirop", dosage: "125 mg/5 ml — 60 ml", description: "Amibiase et giardiase enfant.", category: "bebe", prescription: true, onOrder: false, stock: "high" },
  { id: "m96", emoji: "💊", image: imgMetronidazole, name: "Tinidazole", dosage: "500 mg — 4 cp", description: "Antiparasitaire, amibiase et trichomonose.", category: "antibio", prescription: true, onOrder: false, stock: "medium" },
  { id: "m97", emoji: "💉", image: imgCeftriaxone, name: "Ceftriaxone 500 mg", dosage: "500 mg — Flacon", description: "C3G injectable pédiatrique.", category: "antibio", prescription: true, onOrder: true, stock: "low" },
  { id: "m98", emoji: "💊", image: imgAmoxicilline, name: "Céfixime", dosage: "200 mg — 8 cp", description: "C3G orale, infections urinaires et ORL.", category: "antibio", prescription: true, onOrder: false, stock: "medium" },
  { id: "m99", emoji: "💊", image: imgAmoxicilline, name: "Céfadroxil", dosage: "500 mg — 12 gél", description: "Céphalosporine 1G, infections cutanées.", category: "antibio", prescription: true, onOrder: false, stock: "medium" },
  { id: "m100", emoji: "💊", image: imgCotrimoxazole, name: "Sulfaméthoxazole-Triméthoprime sirop", dosage: "200/40 mg/5 ml — 100 ml", description: "Bactrim pédiatrique.", category: "bebe", prescription: true, onOrder: false, stock: "high" },
  { id: "m101", emoji: "💊", image: imgCiprofloxacine, name: "Norfloxacine", dosage: "400 mg — 10 cp", description: "Fluoroquinolone, infections urinaires.", category: "antibio", prescription: true, onOrder: true, stock: "low" },
  { id: "m102", emoji: "💊", image: imgCiprofloxacine, name: "Ofloxacine", dosage: "200 mg — 10 cp", description: "Fluoroquinolone à large spectre.", category: "antibio", prescription: true, onOrder: false, stock: "medium" },
  { id: "m103", emoji: "💊", image: imgDoxycycline, name: "Tétracycline", dosage: "500 mg — 16 gél", description: "Antibiotique, choléra et rickettsioses.", category: "antibio", prescription: true, onOrder: true, stock: "low" },
  { id: "m104", emoji: "💉", image: imgAmpicilline, name: "Gentamicine injectable", dosage: "80 mg — Ampoule", description: "Aminoside injectable, infections sévères.", category: "antibio", prescription: true, onOrder: true, stock: "low" },
  { id: "m105", emoji: "💊", image: imgAugmentin, name: "Clindamycine", dosage: "300 mg — 16 gél", description: "Infections cutanées et osseuses.", category: "antibio", prescription: true, onOrder: true, stock: "low" },

  // Antifongiques / dermato / soins
  { id: "m106", emoji: "🧴", image: imgKetoconazole, name: "Kétoconazole shampooing", dosage: "Flacon 100 ml", description: "Antifongique cuir chevelu, pellicules.", category: "soins", prescription: false, onOrder: false, stock: "high" },
  { id: "m107", emoji: "💊", image: imgGriseofulvine, name: "Fluconazole", dosage: "150 mg — 1 gél", description: "Antifongique oral, mycose vaginale.", category: "soins", prescription: true, onOrder: false, stock: "medium" },
  { id: "m108", emoji: "🧴", image: imgKetoconazole, name: "Miconazole gel buccal", dosage: "Tube 40 g", description: "Muguet buccal du nourrisson.", category: "bebe", prescription: false, onOrder: false, stock: "medium" },
  { id: "m109", emoji: "🧴", image: imgBetadine, name: "Bétadine gynécologique", dosage: "Flacon 125 ml", description: "Antiseptique gynécologique, mycoses.", category: "soins", prescription: false, onOrder: false, stock: "medium" },
  { id: "m110", emoji: "🧴", image: imgBetadine, name: "Chlorhexidine solution", dosage: "Flacon 500 ml", description: "Antiseptique aqueux, plaies et muqueuses.", category: "soins", prescription: false, onOrder: false, stock: "high" },
  { id: "m111", emoji: "🧴", image: imgBetadine, name: "Eau oxygénée 10 vol.", dosage: "Flacon 250 ml", description: "Nettoyage des plaies.", category: "soins", prescription: false, onOrder: false, stock: "high" },
  { id: "m112", emoji: "🧴", image: imgBetadine, name: "Mercurochrome", dosage: "Flacon 45 ml", description: "Antiseptique cutané tropical.", category: "soins", prescription: false, onOrder: false, stock: "high" },
  { id: "m113", emoji: "🧴", image: imgKetoconazole, name: "Bépanthen crème", dosage: "Tube 30 g", description: "Dexpanthénol, cicatrisation cutanée.", category: "soins", prescription: false, onOrder: false, stock: "high" },
  { id: "m114", emoji: "🧴", image: imgKetoconazole, name: "Pommade Cicaflora", dosage: "Tube 20 g", description: "Cicatrisation plaies et brûlures.", category: "soins", prescription: false, onOrder: false, stock: "medium" },
  { id: "m115", emoji: "🧴", image: imgKetoconazole, name: "Corticoïde crème (Bétaméthasone)", dosage: "Tube 15 g", description: "Dermatoses inflammatoires.", category: "soins", prescription: true, onOrder: false, stock: "medium" },
  { id: "m116", emoji: "🧴", image: imgKetoconazole, name: "Diprosone crème", dosage: "Tube 30 g", description: "Corticoïde local puissant.", category: "soins", prescription: true, onOrder: false, stock: "medium" },
  { id: "m117", emoji: "🧴", image: imgBetadine, name: "Vaseline officinale", dosage: "Pot 100 g", description: "Émollient, protection cutanée.", category: "soins", prescription: false, onOrder: false, stock: "high" },

  // Digestif / gastro
  { id: "m118", emoji: "💊", image: imgSmecta, name: "Diosmectite sachet", dosage: "3 g — 30 sachets", description: "Diarrhée aiguë adulte et enfant.", category: "soins", prescription: false, onOrder: false, stock: "high" },
  { id: "m119", emoji: "💊", image: imgImodium, name: "Racecadotril (Tiorfan)", dosage: "100 mg — 20 gél", description: "Antisécrétoire, diarrhée aiguë.", category: "soins", prescription: false, onOrder: false, stock: "medium" },
  { id: "m120", emoji: "💊", image: imgGaviscon, name: "Oméprazole 20 mg", dosage: "20 mg — 14 gél", description: "IPP, brûlures d'estomac et ulcère.", category: "soins", prescription: false, onOrder: false, stock: "high" },
  { id: "m121", emoji: "💊", image: imgGaviscon, name: "Ésoméprazole 40 mg", dosage: "40 mg — 14 cp", description: "IPP, RGO sévère et ulcère.", category: "soins", prescription: true, onOrder: false, stock: "medium" },
  { id: "m122", emoji: "💊", image: imgGaviscon, name: "Ranitidine 150 mg", dosage: "150 mg — 30 cp", description: "Anti-H2, brûlures gastriques.", category: "soins", prescription: false, onOrder: false, stock: "medium" },
  { id: "m123", emoji: "💊", image: imgGaviscon, name: "Maalox comprimés", dosage: "40 cp à croquer", description: "Anti-acide, brûlures d'estomac.", category: "soins", prescription: false, onOrder: false, stock: "high" },
  { id: "m124", emoji: "💊", image: imgSpasfon, name: "Métoclopramide (Primpéran)", dosage: "10 mg — 30 cp", description: "Antinauséeux, vomissements.", category: "soins", prescription: false, onOrder: false, stock: "medium" },
  { id: "m125", emoji: "💊", image: imgSpasfon, name: "Dompéridone (Motilium)", dosage: "10 mg — 30 cp", description: "Antinauséeux, troubles gastriques.", category: "soins", prescription: false, onOrder: false, stock: "medium" },
  { id: "m126", emoji: "💊", image: imgCharbon, name: "Ultralevure (Saccharomyces)", dosage: "50 mg — 20 gél", description: "Probiotique, diarrhées.", category: "soins", prescription: false, onOrder: false, stock: "medium" },
  { id: "m127", emoji: "💊", image: imgSmecta, name: "Lopéramide générique", dosage: "2 mg — 20 gél", description: "Anti-diarrhéique.", category: "soins", prescription: false, onOrder: false, stock: "high" },
  { id: "m128", emoji: "💧", image: imgSro, name: "SRO faible osmolarité (UNICEF)", dosage: "Sachet 20.5 g — 10", description: "Réhydratation OMS, enfant diarrhéique.", category: "bebe", prescription: false, onOrder: false, stock: "high" },

  // Respiratoire / ORL
  { id: "m129", emoji: "🌿", image: imgToplexil, name: "Sirop toux sèche enfant", dosage: "Flacon 125 ml", description: "Antitussif pédiatrique.", category: "bebe", prescription: false, onOrder: false, stock: "medium" },
  { id: "m130", emoji: "🌿", image: imgToplexil, name: "Sirop toux grasse (Fluimucil)", dosage: "200 mg — 30 sachets", description: "Fluidifiant bronchique.", category: "soins", prescription: false, onOrder: false, stock: "medium" },
  { id: "m131", emoji: "💨", image: imgVentoline, name: "Salbutamol sirop", dosage: "2 mg/5 ml — 150 ml", description: "Bronchodilatateur pédiatrique.", category: "bebe", prescription: true, onOrder: false, stock: "medium" },
  { id: "m132", emoji: "🧴", image: imgSerumPhysio, name: "Spray nasal eau de mer", dosage: "Flacon 100 ml", description: "Lavage nasal, rhume.", category: "soins", prescription: false, onOrder: false, stock: "high" },
  { id: "m133", emoji: "🧴", image: imgSerumPhysio, name: "Rhinocort spray", dosage: "Flacon 120 doses", description: "Corticoïde nasal, rhinite allergique.", category: "soins", prescription: true, onOrder: false, stock: "low" },
  { id: "m134", emoji: "💊", image: imgCetirizine, name: "Desloratadine", dosage: "5 mg — 10 cp", description: "Antihistaminique de 2e génération.", category: "soins", prescription: false, onOrder: false, stock: "medium" },
  { id: "m135", emoji: "💊", image: imgLoratadine, name: "Prednisolone 20 mg", dosage: "20 mg — 20 cp", description: "Corticoïde oral, allergies sévères et asthme.", category: "soins", prescription: true, onOrder: false, stock: "medium" },
  { id: "m136", emoji: "🌡️", image: imgEfferalganPed, name: "Sirop rhume enfant", dosage: "Flacon 125 ml", description: "Multi-symptômes rhume pédiatrique.", category: "bebe", prescription: false, onOrder: false, stock: "high" },

  // Cardiovasculaire / diabète / chronique
  { id: "m137", emoji: "❤️", image: imgAmlodipine, name: "Losartan", dosage: "50 mg — 30 cp", description: "ARA-II, hypertension artérielle.", category: "cardio", prescription: true, onOrder: false, stock: "medium" },
  { id: "m138", emoji: "❤️", image: imgAmlodipine, name: "Énalapril", dosage: "20 mg — 30 cp", description: "IEC, HTA et insuffisance cardiaque.", category: "cardio", prescription: true, onOrder: false, stock: "medium" },
  { id: "m139", emoji: "❤️", image: imgAmlodipine, name: "Hydrochlorothiazide", dosage: "25 mg — 30 cp", description: "Diurétique thiazidique, HTA.", category: "cardio", prescription: true, onOrder: false, stock: "medium" },
  { id: "m140", emoji: "❤️", image: imgBisoprolol, name: "Aténolol", dosage: "50 mg — 30 cp", description: "Bêta-bloquant, HTA.", category: "cardio", prescription: true, onOrder: false, stock: "medium" },
  { id: "m141", emoji: "🩺", image: imgMetformine, name: "Glimépiride", dosage: "2 mg — 30 cp", description: "Sulfamide hypoglycémiant.", category: "cardio", prescription: true, onOrder: false, stock: "medium" },
  { id: "m142", emoji: "💉", image: imgMetformine, name: "Insuline (Insulatard)", dosage: "100 UI/ml — Flacon 10 ml", description: "Insuline humaine, diabète.", category: "cardio", prescription: true, onOrder: true, stock: "low" },
  { id: "m143", emoji: "💊", image: imgAtorvastatine, name: "Simvastatine 20 mg", dosage: "20 mg — 30 cp", description: "Statine, hypercholestérolémie.", category: "cardio", prescription: true, onOrder: false, stock: "medium" },
  { id: "m144", emoji: "💊", image: imgAspirineCardio, name: "Clopidogrel (Plavix)", dosage: "75 mg — 30 cp", description: "Antiagrégant plaquettaire.", category: "cardio", prescription: true, onOrder: true, stock: "low" },

  // Vitamines / anémie / grossesse
  { id: "m145", emoji: "🩸", image: imgFerFolate, name: "Sulfate de fer 200 mg", dosage: "200 mg — 30 cp", description: "Anémie ferriprive.", category: "vitamines", prescription: false, onOrder: false, stock: "high" },
  { id: "m146", emoji: "🤰", image: imgAcideFolique, name: "Vitamines grossesse (Elevit)", dosage: "30 cp", description: "Multivitamines pour femme enceinte.", category: "vitamines", prescription: false, onOrder: false, stock: "medium" },
  { id: "m147", emoji: "🍊", image: imgVitamineC, name: "Vitamine B12 ampoules", dosage: "1000 µg — 6 amp buv.", description: "Anémie, fatigue, carence B12.", category: "vitamines", prescription: false, onOrder: false, stock: "medium" },
  { id: "m148", emoji: "🌿", image: imgMultivitamines, name: "Sargenor buvable", dosage: "20 ampoules", description: "Aspartate d'arginine, fatigue.", category: "vitamines", prescription: false, onOrder: false, stock: "medium" },
  { id: "m149", emoji: "🍯", image: imgMultivitamines, name: "Gelée royale ampoules", dosage: "20 ampoules 10 ml", description: "Tonique naturel, fatigue.", category: "vitamines", prescription: false, onOrder: false, stock: "high" },
  { id: "m150", emoji: "☀️", image: imgVitamineD3, name: "Calcium + Vitamine D", dosage: "500 mg/400 UI — 60 cp", description: "Prévention ostéoporose.", category: "vitamines", prescription: false, onOrder: false, stock: "medium" },

  // Bébé / hygiène / divers
  { id: "m151", emoji: "🍼", image: imgLaitBebe, name: "Guigoz 2 (6-12 mois)", dosage: "Boîte 800 g", description: "Lait de suite 2e âge.", category: "bebe", prescription: false, onOrder: false, stock: "medium" },
  { id: "m152", emoji: "🍼", image: imgLaitBebe, name: "Blédilait Croissance", dosage: "Boîte 900 g", description: "Lait de croissance 1-3 ans.", category: "bebe", prescription: false, onOrder: false, stock: "medium" },
  { id: "m153", emoji: "👶", image: imgSerumPhysio, name: "Couches Pampers taille 3", dosage: "Paquet 60", description: "Couches bébé 4-9 kg.", category: "bebe", prescription: false, onOrder: false, stock: "high" },
  { id: "m154", emoji: "🧴", image: imgSerumPhysio, name: "Talc bébé", dosage: "Flacon 200 g", description: "Absorbant, prévention érythème fessier.", category: "bebe", prescription: false, onOrder: false, stock: "high" },
  { id: "m155", emoji: "🧴", image: imgKetoconazole, name: "Mitosyl pommade", dosage: "Tube 65 g", description: "Prévention et soin de l'érythème fessier.", category: "bebe", prescription: false, onOrder: false, stock: "high" },
  { id: "m156", emoji: "🩹", image: imgPansements, name: "Compresses stériles", dosage: "Boîte 50 (7.5×7.5 cm)", description: "Soins des plaies.", category: "soins", prescription: false, onOrder: false, stock: "high" },

  // === Extension catalogue : contraception, ophtalmo, ORL, urinaire, thyroïde, psycho, hygiène ===
  { id: "m157", emoji: "💊", image: imgDoliprane, name: "Microgynon (contraceptif oral)", dosage: "21 cp", description: "Contraception hormonale combinée.", category: "soins", prescription: true, onOrder: false, stock: "medium" },
  { id: "m158", emoji: "💊", image: imgDoliprane, name: "Microlut (progestatif seul)", dosage: "35 cp", description: "Contraception, allaitement compatible.", category: "soins", prescription: true, onOrder: false, stock: "medium" },
  { id: "m159", emoji: "💊", image: imgDoliprane, name: "Norlevo (pilule du lendemain)", dosage: "1.5 mg — 1 cp", description: "Contraception d'urgence, dans les 72h.", category: "soins", prescription: false, onOrder: false, stock: "high" },
  { id: "m160", emoji: "💉", image: imgAmpicilline, name: "Depo-Provera injectable", dosage: "150 mg/ml — Ampoule", description: "Contraception injectable trimestrielle.", category: "soins", prescription: true, onOrder: true, stock: "low" },
  { id: "m161", emoji: "🛡️", image: imgMasques, name: "Préservatifs masculins", dosage: "Boîte de 12", description: "Protection MST et contraception.", category: "soins", prescription: false, onOrder: false, stock: "high" },

  // Ophtalmo / ORL
  { id: "m162", emoji: "👁️", image: imgSerumPhysio, name: "Collyre antibiotique (Rifamycine)", dosage: "Flacon 10 ml", description: "Conjonctivite bactérienne.", category: "soins", prescription: true, onOrder: false, stock: "medium" },
  { id: "m163", emoji: "👁️", image: imgSerumPhysio, name: "Collyre lubrifiant", dosage: "Flacon 10 ml", description: "Sécheresse oculaire.", category: "soins", prescription: false, onOrder: false, stock: "high" },
  { id: "m164", emoji: "👁️", image: imgSerumPhysio, name: "Tobramycine collyre", dosage: "Flacon 5 ml", description: "Infections oculaires bactériennes.", category: "soins", prescription: true, onOrder: false, stock: "medium" },
  { id: "m165", emoji: "👂", image: imgBetadine, name: "Gouttes auriculaires (Ciprofloxacine)", dosage: "Flacon 5 ml", description: "Otite externe bactérienne.", category: "soins", prescription: true, onOrder: false, stock: "medium" },
  { id: "m166", emoji: "👂", image: imgBetadine, name: "Cérulyse gouttes", dosage: "Flacon 10 ml", description: "Ramollissement des bouchons de cérumen.", category: "soins", prescription: false, onOrder: false, stock: "high" },

  // Urinaire / gynéco
  { id: "m167", emoji: "💊", image: imgCiprofloxacine, name: "Fosfomycine (Monuril)", dosage: "3 g — 1 sachet", description: "Cystite aiguë, dose unique.", category: "antibio", prescription: true, onOrder: false, stock: "medium" },
  { id: "m168", emoji: "🌿", image: imgMultivitamines, name: "Cranberry gélules", dosage: "60 gél", description: "Prévention des infections urinaires.", category: "vitamines", prescription: false, onOrder: false, stock: "medium" },
  { id: "m169", emoji: "💊", image: imgCanesten, name: "Ovules gynéco (Nystatine)", dosage: "6 ovules", description: "Mycose vaginale.", category: "soins", prescription: false, onOrder: false, stock: "medium" },
  { id: "m170", emoji: "💊", image: imgMetronidazole, name: "Métronidazole ovules", dosage: "500 mg — 10 ovules", description: "Vaginose bactérienne, trichomonose.", category: "soins", prescription: true, onOrder: false, stock: "medium" },

  // Thyroïde / hormones
  { id: "m171", emoji: "💊", image: imgAmlodipine, name: "Lévothyroxine (L-Thyroxine)", dosage: "100 µg — 30 cp", description: "Hypothyroïdie.", category: "cardio", prescription: true, onOrder: false, stock: "medium" },

  // Neuro / psy / sommeil
  { id: "m172", emoji: "💊", image: imgDoliprane, name: "Diazépam (Valium)", dosage: "5 mg — 30 cp", description: "Anxiolytique, spasmes.", category: "soins", prescription: true, onOrder: true, stock: "low" },
  { id: "m173", emoji: "💊", image: imgDoliprane, name: "Bromazépam (Lexomil)", dosage: "6 mg — 30 cp", description: "Anxiété.", category: "soins", prescription: true, onOrder: true, stock: "low" },
  { id: "m174", emoji: "💊", image: imgDoliprane, name: "Alprazolam (Xanax)", dosage: "0.25 mg — 30 cp", description: "Anxiété, attaques de panique.", category: "soins", prescription: true, onOrder: true, stock: "low" },
  { id: "m175", emoji: "💊", image: imgDoliprane, name: "Amitriptyline (Laroxyl)", dosage: "25 mg — 30 cp", description: "Antidépresseur tricyclique.", category: "soins", prescription: true, onOrder: true, stock: "low" },
  { id: "m176", emoji: "💊", image: imgDoliprane, name: "Carbamazépine (Tégrétol)", dosage: "200 mg — 50 cp", description: "Épilepsie et douleurs neuropathiques.", category: "soins", prescription: true, onOrder: true, stock: "low" },
  { id: "m177", emoji: "💊", image: imgDoliprane, name: "Phénobarbital (Gardénal)", dosage: "100 mg — 30 cp", description: "Épilepsie.", category: "soins", prescription: true, onOrder: false, stock: "medium" },
  { id: "m178", emoji: "🌙", image: imgMultivitamines, name: "Mélatonine 1 mg", dosage: "30 cp", description: "Aide à l'endormissement.", category: "vitamines", prescription: false, onOrder: false, stock: "medium" },

  // Anti-parasitaires / anti-poux
  { id: "m179", emoji: "🧴", image: imgBetadine, name: "Perméthrine lotion", dosage: "Flacon 60 ml", description: "Gale, poux.", category: "soins", prescription: false, onOrder: false, stock: "medium" },
  { id: "m180", emoji: "🧴", image: imgBetadine, name: "Shampooing anti-poux", dosage: "Flacon 100 ml", description: "Traitement pédiculose.", category: "soins", prescription: false, onOrder: false, stock: "high" },

  // Sexualité
  { id: "m181", emoji: "💊", image: imgDoliprane, name: "Sildénafil 50 mg", dosage: "50 mg — 4 cp", description: "Troubles de l'érection.", category: "soins", prescription: true, onOrder: true, stock: "low" },
  { id: "m182", emoji: "💊", image: imgDoliprane, name: "Tadalafil 20 mg", dosage: "20 mg — 4 cp", description: "Troubles de l'érection, longue durée.", category: "soins", prescription: true, onOrder: true, stock: "low" },

  // Hygiène / matériel
  { id: "m183", emoji: "🌡️", image: imgMasques, name: "Thermomètre digital", dosage: "1 pièce", description: "Mesure de la température corporelle.", category: "soins", prescription: false, onOrder: false, stock: "high" },
  { id: "m184", emoji: "🩺", image: imgMasques, name: "Tensiomètre bras électronique", dosage: "1 pièce", description: "Auto-mesure de la tension artérielle.", category: "cardio", prescription: false, onOrder: true, stock: "low" },
  { id: "m185", emoji: "🩸", image: imgMasques, name: "Lecteur glycémie + bandelettes", dosage: "Kit 25 bandelettes", description: "Auto-surveillance du diabète.", category: "cardio", prescription: false, onOrder: false, stock: "medium" },
  { id: "m186", emoji: "💉", image: imgMasques, name: "Seringues 5 ml stériles", dosage: "Boîte de 100", description: "Usage unique.", category: "soins", prescription: false, onOrder: false, stock: "high" },
  { id: "m187", emoji: "🧤", image: imgMasques, name: "Gants latex non stériles", dosage: "Boîte de 100", description: "Protection, taille M.", category: "soins", prescription: false, onOrder: false, stock: "high" },
  { id: "m188", emoji: "🧴", image: imgAlcool70, name: "Gel hydroalcoolique", dosage: "Flacon 500 ml", description: "Désinfection des mains.", category: "soins", prescription: false, onOrder: false, stock: "high" },
  { id: "m189", emoji: "🩹", image: imgPansements, name: "Bande crêpe élastique", dosage: "10 cm × 4 m", description: "Contention et maintien.", category: "soins", prescription: false, onOrder: false, stock: "high" },
  { id: "m190", emoji: "🩹", image: imgPansements, name: "Sparadrap tissé", dosage: "Rouleau 5 m", description: "Fixation pansements.", category: "soins", prescription: false, onOrder: false, stock: "high" },
  { id: "m191", emoji: "🩸", image: imgPansements, name: "Coton hydrophile", dosage: "Rouleau 500 g", description: "Soins et hygiène.", category: "soins", prescription: false, onOrder: false, stock: "high" },

  // Bébé / puériculture supplémentaires
  { id: "m192", emoji: "🍼", image: imgLaitBebe, name: "Lait anti-régurgitation (AR)", dosage: "Boîte 800 g", description: "Nourrisson avec reflux.", category: "bebe", prescription: false, onOrder: true, stock: "low" },
  { id: "m193", emoji: "🍼", image: imgLaitBebe, name: "Lait sans lactose", dosage: "Boîte 400 g", description: "Intolérance au lactose du nourrisson.", category: "bebe", prescription: false, onOrder: true, stock: "low" },
  { id: "m194", emoji: "👶", image: imgSerumPhysio, name: "Couches Pampers taille 4", dosage: "Paquet 54", description: "Couches bébé 9-14 kg.", category: "bebe", prescription: false, onOrder: false, stock: "high" },
  { id: "m195", emoji: "🧴", image: imgSerumPhysio, name: "Lingettes bébé", dosage: "Paquet 72", description: "Nettoyage doux du siège.", category: "bebe", prescription: false, onOrder: false, stock: "high" },
  { id: "m196", emoji: "🍯", image: imgVermifugeEnfant, name: "Gouttes coliques bébé", dosage: "Flacon 30 ml", description: "Soulagement des coliques du nourrisson.", category: "bebe", prescription: false, onOrder: false, stock: "medium" },

  // Vitamines / bien-être
  { id: "m197", emoji: "🌿", image: imgMultivitamines, name: "Zinc + Vitamine C", dosage: "30 cp eff.", description: "Défenses immunitaires.", category: "vitamines", prescription: false, onOrder: false, stock: "high" },
  { id: "m198", emoji: "🌿", image: imgMultivitamines, name: "Ginseng gélules", dosage: "60 gél", description: "Tonique, fatigue passagère.", category: "vitamines", prescription: false, onOrder: false, stock: "medium" },
  { id: "m199", emoji: "🌿", image: imgMultivitamines, name: "Spiruline comprimés", dosage: "500 mg — 200 cp", description: "Complément riche en protéines et fer.", category: "vitamines", prescription: false, onOrder: false, stock: "medium" },
  { id: "m200", emoji: "🍯", image: imgMultivitamines, name: "Propolis spray gorge", dosage: "Flacon 30 ml", description: "Maux de gorge, apaisant naturel.", category: "soins", prescription: false, onOrder: false, stock: "high" },

  // === Extension catalogue (m201 → m250) ===
  // Fièvre & douleur
  { id: "m201", emoji: "💊", image: imgParacetamolDenk, name: "Paracétamol Denk", dosage: "500 mg — 20 cp", description: "Antalgique et antipyrétique polyvalent.", category: "fievre", prescription: false, onOrder: false, stock: "high" },
  { id: "m202", emoji: "💊", image: imgNurofen, name: "Ibuprofène 200 mg", dosage: "20 cp", description: "Douleurs légères à modérées, fièvre.", category: "fievre", prescription: false, onOrder: false, stock: "high" },
  { id: "m203", emoji: "🧴", image: imgVoltarene, name: "Baume chauffant", dosage: "Tube 50 g", description: "Contractures et courbatures musculaires.", category: "fievre", prescription: false, onOrder: false, stock: "medium" },
  { id: "m204", emoji: "💊", image: imgNurofen, name: "Diclofénac 50 mg", dosage: "20 cp", description: "Anti-inflammatoire, douleurs articulaires.", category: "fievre", prescription: true, onOrder: false, stock: "medium" },
  { id: "m205", emoji: "💊", image: imgAspirine, name: "Tramadol 50 mg", dosage: "10 gél", description: "Douleurs modérées à sévères.", category: "fievre", prescription: true, onOrder: true, stock: "low" },

  // Antibiotiques & anti-infectieux
  { id: "m206", emoji: "💉", image: imgAmoxicilline, name: "Amoxicilline sirop", dosage: "250 mg/5 ml — 60 ml", description: "Antibiotique pédiatrique.", category: "antibio", prescription: true, onOrder: false, stock: "medium" },
  { id: "m207", emoji: "💉", image: imgCeftriaxone, name: "Ceftriaxone 500 mg", dosage: "Flacon injectable", description: "Antibiotique large spectre en injection.", category: "antibio", prescription: true, onOrder: true, stock: "low" },
  { id: "m208", emoji: "💊", image: imgMetronidazole, name: "Métronidazole ovules", dosage: "500 mg — 10 ov", description: "Infections vaginales, trichomonase.", category: "antibio", prescription: true, onOrder: false, stock: "medium" },
  { id: "m209", emoji: "💊", image: imgDoxycycline, name: "Doxycycline 100 mg", dosage: "10 gél", description: "Antibiotique, acné, MST, prophylaxie palu.", category: "antibio", prescription: true, onOrder: false, stock: "medium" },
  { id: "m210", emoji: "💊", image: imgErythromycine, name: "Clarithromycine 500 mg", dosage: "14 cp", description: "Macrolide, infections respiratoires.", category: "antibio", prescription: true, onOrder: true, stock: "low" },

  // Paludisme
  { id: "m211", emoji: "🦟", image: imgCoartem, name: "Artéméther-Luméfantrine", dosage: "24 cp — cure adulte", description: "Traitement de première ligne du paludisme.", category: "soins", prescription: true, onOrder: false, stock: "high" },
  { id: "m212", emoji: "🦟", image: imgAsaq, name: "Artésunate-Amodiaquine", dosage: "Cure 3 jours", description: "Alternative ACT au paludisme non compliqué.", category: "soins", prescription: true, onOrder: false, stock: "medium" },
  { id: "m213", emoji: "🛡️", image: imgMoustiquaire, name: "Moustiquaire imprégnée double", dosage: "180x200 cm", description: "Protection famille contre les moustiques.", category: "soins", prescription: false, onOrder: false, stock: "high" },
  { id: "m214", emoji: "🧴", image: imgRepulsif, name: "Répulsif enfants roll-on", dosage: "50 ml", description: "Anti-moustiques doux dès 2 ans.", category: "bebe", prescription: false, onOrder: false, stock: "medium" },

  // Digestif
  { id: "m215", emoji: "💊", image: imgSmecta, name: "Smecta orange", dosage: "12 sachets", description: "Diarrhée aiguë et chronique.", category: "soins", prescription: false, onOrder: false, stock: "high" },
  { id: "m216", emoji: "💊", image: imgImodium, name: "Lopéramide 2 mg", dosage: "20 gél", description: "Diarrhée aiguë de l'adulte.", category: "soins", prescription: false, onOrder: false, stock: "high" },
  { id: "m217", emoji: "💊", image: imgGaviscon, name: "Oméprazole 20 mg", dosage: "14 gél", description: "Reflux, brûlures d'estomac, ulcère.", category: "soins", prescription: false, onOrder: false, stock: "high" },
  { id: "m218", emoji: "💊", image: imgSpasfon, name: "Spasfon Lyoc", dosage: "80 mg — 10 lyoc", description: "Douleurs spasmodiques, coliques.", category: "soins", prescription: false, onOrder: false, stock: "high" },
  { id: "m219", emoji: "🌿", image: imgCharbon, name: "Charbon actif végétal", dosage: "60 gél", description: "Ballonnements, digestions difficiles.", category: "soins", prescription: false, onOrder: false, stock: "medium" },
  { id: "m220", emoji: "💊", image: imgGaviscon, name: "Lactulose sirop", dosage: "200 ml", description: "Constipation occasionnelle.", category: "soins", prescription: false, onOrder: false, stock: "medium" },

  // Respiratoire / ORL
  { id: "m221", emoji: "🫁", image: imgVentoline, name: "Chambre d'inhalation", dosage: "Adulte", description: "Améliore l'utilisation des aérosols.", category: "soins", prescription: false, onOrder: false, stock: "medium" },
  { id: "m222", emoji: "🍯", image: imgToplexil, name: "Sirop miel & propolis", dosage: "125 ml", description: "Toux sèche, irritation de la gorge.", category: "soins", prescription: false, onOrder: false, stock: "high" },
  { id: "m223", emoji: "🧴", image: imgSerumPhysio, name: "Spray nasal eau de mer", dosage: "100 ml", description: "Hygiène nasale quotidienne.", category: "soins", prescription: false, onOrder: false, stock: "high" },
  { id: "m224", emoji: "💊", image: imgCetirizine, name: "Cétirizine 10 mg", dosage: "15 cp", description: "Allergies, rhinite, urticaire.", category: "soins", prescription: false, onOrder: false, stock: "high" },
  { id: "m225", emoji: "💊", image: imgLoratadine, name: "Loratadine 10 mg", dosage: "10 cp", description: "Antihistaminique non sédatif.", category: "soins", prescription: false, onOrder: false, stock: "medium" },

  // Peau & antifongiques
  { id: "m226", emoji: "🧴", image: imgKetoconazole, name: "Kétoconazole shampoing", dosage: "Flacon 100 ml", description: "Pellicules, dermite séborrhéique.", category: "soins", prescription: false, onOrder: false, stock: "medium" },
  { id: "m227", emoji: "🧴", image: imgCanesten, name: "Clotrimazole crème", dosage: "Tube 20 g", description: "Mycoses cutanées et intimes.", category: "soins", prescription: false, onOrder: false, stock: "high" },
  { id: "m228", emoji: "🧴", image: imgBetadine, name: "Bétadine gargarisme", dosage: "125 ml", description: "Désinfection buccale, angine, aphtes.", category: "soins", prescription: false, onOrder: false, stock: "high" },
  { id: "m229", emoji: "🩹", image: imgPansements, name: "Compresses stériles", dosage: "Boîte 25 x 10 cm", description: "Soins de plaies, pansements.", category: "soins", prescription: false, onOrder: false, stock: "high" },
  { id: "m230", emoji: "🧴", image: imgAlcool70, name: "Éosine 2%", dosage: "Flacon 100 ml", description: "Asséchant sur plaies superficielles.", category: "soins", prescription: false, onOrder: false, stock: "medium" },

  // Cardio / chronique
  { id: "m231", emoji: "❤️", image: imgAmlodipine, name: "Amlodipine 10 mg", dosage: "30 cp", description: "Hypertension artérielle, angor.", category: "cardio", prescription: true, onOrder: false, stock: "medium" },
  { id: "m232", emoji: "❤️", image: imgBisoprolol, name: "Bisoprolol 5 mg", dosage: "30 cp", description: "HTA, insuffisance cardiaque.", category: "cardio", prescription: true, onOrder: false, stock: "medium" },
  { id: "m233", emoji: "❤️", image: imgCaptopril, name: "Enalapril 20 mg", dosage: "30 cp", description: "HTA, insuffisance cardiaque.", category: "cardio", prescription: true, onOrder: false, stock: "medium" },
  { id: "m234", emoji: "💊", image: imgAtorvastatine, name: "Simvastatine 20 mg", dosage: "30 cp", description: "Excès de cholestérol.", category: "cardio", prescription: true, onOrder: false, stock: "medium" },
  { id: "m235", emoji: "💊", image: imgMetformine, name: "Gliclazide 80 mg", dosage: "30 cp", description: "Diabète de type 2.", category: "cardio", prescription: true, onOrder: false, stock: "medium" },
  { id: "m236", emoji: "💧", image: imgLasix, name: "Hydrochlorothiazide 25 mg", dosage: "30 cp", description: "Diurétique, HTA.", category: "cardio", prescription: true, onOrder: false, stock: "medium" },

  // Vitamines & nutrition
  { id: "m237", emoji: "🌿", image: imgOmega3, name: "Oméga-3 1000 mg", dosage: "60 caps", description: "Santé cardiovasculaire, cerveau.", category: "vitamines", prescription: false, onOrder: false, stock: "medium" },
  { id: "m238", emoji: "🌿", image: imgMultivitamines, name: "Complexe B", dosage: "60 cp", description: "Fatigue, système nerveux.", category: "vitamines", prescription: false, onOrder: false, stock: "medium" },
  { id: "m239", emoji: "🍊", image: imgVitamineC, name: "Vitamine C 500 mg", dosage: "30 cp à croquer", description: "Défenses immunitaires, tonus.", category: "vitamines", prescription: false, onOrder: false, stock: "high" },
  { id: "m240", emoji: "🌿", image: imgFerFolate, name: "Fer + acide folique", dosage: "60 cp", description: "Anémie, grossesse.", category: "vitamines", prescription: false, onOrder: false, stock: "high" },
  { id: "m241", emoji: "🍯", image: imgMultivitamines, name: "Gelée royale ampoules", dosage: "20 amp", description: "Fatigue, convalescence.", category: "vitamines", prescription: false, onOrder: false, stock: "medium" },

  // Bébé & maman
  { id: "m242", emoji: "👶", image: imgDolipraneBebe, name: "Paracétamol nourrisson", dosage: "Suppo 100 mg — 10", description: "Fièvre du nourrisson < 12 kg.", category: "bebe", prescription: false, onOrder: false, stock: "high" },
  { id: "m243", emoji: "🍼", image: imgLaitBebe, name: "Lait 1er âge", dosage: "Boîte 900 g", description: "Nourrisson de 0 à 6 mois.", category: "bebe", prescription: false, onOrder: false, stock: "high" },
  { id: "m244", emoji: "🧴", image: imgSerumPhysio, name: "Liniment oléo-calcaire", dosage: "500 ml", description: "Nettoyage doux du siège bébé.", category: "bebe", prescription: false, onOrder: false, stock: "medium" },
  { id: "m245", emoji: "🌡️", image: imgEfferalganPed, name: "Thermomètre digital bébé", dosage: "1 unité", description: "Prise de température rapide.", category: "bebe", prescription: false, onOrder: false, stock: "medium" },
  { id: "m246", emoji: "🍯", image: imgVermifugeEnfant, name: "Vermifuge sirop enfant", dosage: "Flacon 20 ml", description: "Traitement des vers intestinaux.", category: "bebe", prescription: false, onOrder: false, stock: "medium" },

  // Hygiène & matériel
  { id: "m247", emoji: "😷", image: imgMasques, name: "Masques chirurgicaux", dosage: "Boîte 50", description: "Protection respiratoire quotidienne.", category: "soins", prescription: false, onOrder: false, stock: "high" },
  { id: "m248", emoji: "🧤", image: imgMasques, name: "Gants latex M", dosage: "Boîte 100", description: "Protection hygiénique, soins.", category: "soins", prescription: false, onOrder: false, stock: "high" },
  { id: "m249", emoji: "🧴", image: imgAlcool70, name: "Gel hydroalcoolique", dosage: "500 ml", description: "Désinfection rapide des mains.", category: "soins", prescription: false, onOrder: false, stock: "high" },
  { id: "m250", emoji: "🩹", image: imgPansements, name: "Bande crêpe élastique", dosage: "10 cm x 4 m", description: "Contention, entorses légères.", category: "soins", prescription: false, onOrder: false, stock: "high" },

  // === Extension catalogue (m251 → m300) ===
  // Antipaludiques & prophylaxie
  { id: "m251", emoji: "🦟", image: imgCoartem, name: "Coartem dispersible enfant", dosage: "20/120 mg — 12 cp", description: "ACT dispersible pour enfant, paludisme simple.", category: "bebe", prescription: true, onOrder: false, stock: "high" },
  { id: "m252", emoji: "🦟", image: imgFansidar, name: "Fansidar 3 cp", dosage: "Sulfadoxine 500 mg / Pyriméthamine 25 mg", description: "Traitement préventif intermittent du paludisme en grossesse.", category: "fievre", prescription: true, onOrder: false, stock: "medium" },
  { id: "m253", emoji: "🛡️", image: imgMoustiquaire, name: "Moustiquaire imprégnée bébé", dosage: "100 × 180 cm", description: "Protection longue durée contre les moustiques pour berceau.", category: "bebe", prescription: false, onOrder: false, stock: "medium" },
  { id: "m254", emoji: "🧴", image: imgRepulsif, name: "Répulsif citronnelle", dosage: "Spray 120 ml", description: "Anti-moustiques naturel pour toute la famille.", category: "soins", prescription: false, onOrder: false, stock: "high" },

  // Antibiotiques supplémentaires
  { id: "m255", emoji: "💊", image: imgAmoxicilline, name: "Amoxicilline 1 g", dosage: "14 cp", description: "Antibiotique à large spectre, infections respiratoires.", category: "antibio", prescription: true, onOrder: false, stock: "high" },
  { id: "m256", emoji: "💊", image: imgAugmentin, name: "Augmentin 625 mg", dosage: "14 cp", description: "Amoxicilline + acide clavulanique, infections ORL.", category: "antibio", prescription: true, onOrder: false, stock: "medium" },
  { id: "m257", emoji: "💊", image: imgAzithromycine, name: "Azithromycine 250 mg", dosage: "6 cp", description: "Macrolide, angine, sinusite, bronchite.", category: "antibio", prescription: true, onOrder: false, stock: "high" },
  { id: "m258", emoji: "💊", image: imgCiprofloxacine, name: "Ciprofloxacine 500 mg", dosage: "10 cp", description: "Fluoroquinolone, infections urinaires et digestives.", category: "antibio", prescription: true, onOrder: false, stock: "medium" },
  { id: "m259", emoji: "💉", image: imgCeftriaxone, name: "Ceftriaxone 1 g injectable", dosage: "Flacon + solvant", description: "Céphalosporine 3G, infections sévères.", category: "antibio", prescription: true, onOrder: true, stock: "low" },
  { id: "m260", emoji: "💊", image: imgErythromycine, name: "Érythromycine 500 mg", dosage: "16 cp", description: "Macrolide, alternative pénicilline.", category: "antibio", prescription: true, onOrder: false, stock: "medium" },

  // Antiparasitaires
  { id: "m261", emoji: "🪱", image: imgAlbendazole, name: "Albendazole 400 mg", dosage: "1 cp", description: "Vermifuge large spectre, dose unique.", category: "soins", prescription: false, onOrder: false, stock: "high" },
  { id: "m262", emoji: "🐛", image: imgPraziquantel, name: "Praziquantel 600 mg", dosage: "4 cp", description: "Schistosomiase et distomatose.", category: "soins", prescription: true, onOrder: true, stock: "low" },
  { id: "m263", emoji: "🩹", image: imgIvermectine, name: "Ivermectine 6 mg", dosage: "4 cp", description: "Onchocercose, gale, strongyloidose.", category: "soins", prescription: true, onOrder: false, stock: "medium" },
  { id: "m264", emoji: "💊", image: imgMetronidazole, name: "Secnidazole 2 g", dosage: "4 cp", description: "Amibiase, giardiase, trichomonose.", category: "antibio", prescription: true, onOrder: false, stock: "medium" },

  // Réhydratation & diarrhée
  { id: "m265", emoji: "💧", image: imgSro, name: "SRO goût orange", dosage: "Sachet — Boîte 10", description: "Réhydratation orale, diarrhée aiguë.", category: "soins", prescription: false, onOrder: false, stock: "high" },
  { id: "m266", emoji: "💧", image: imgSro, name: "SRO zinc enrichi", dosage: "Sachet — Boîte 10", description: "Réhydratation + zinc pour enfant.", category: "bebe", prescription: false, onOrder: false, stock: "high" },
  { id: "m267", emoji: "🍌", image: imgZinc, name: "Zinc 10 mg dispersible", dosage: "10 cp", description: "Complément zinc, diarrhée enfant.", category: "bebe", prescription: false, onOrder: false, stock: "high" },

  // Digestif
  { id: "m268", emoji: "💊", image: imgSmecta, name: "Smecta goût vanille", dosage: "30 sachets", description: "Diarrhée aiguë, douleurs abdominales.", category: "soins", prescription: false, onOrder: false, stock: "high" },
  { id: "m269", emoji: "💊", image: imgImodium, name: "Loperamide 2 mg", dosage: "20 gél", description: "Anti-diarrhéique rapide adulte.", category: "soins", prescription: false, onOrder: false, stock: "medium" },
  { id: "m270", emoji: "💊", image: imgGaviscon, name: "Omeprazole 40 mg", dosage: "14 gél", description: "Reflux gastro-œsophagien, ulcère.", category: "soins", prescription: false, onOrder: false, stock: "high" },
  { id: "m271", emoji: "💊", image: imgSpasfon, name: "Phloroglucinol 80 mg", dosage: "30 cp", description: "Coliques, douleurs spasmodiques.", category: "soins", prescription: false, onOrder: false, stock: "high" },
  { id: "m272", emoji: "🌿", image: imgCharbon, name: "Charbon végétal activé", dosage: "60 gél", description: "Ballonnements, gaz, intoxications légères.", category: "soins", prescription: false, onOrder: false, stock: "medium" },

  // Respiratoire / ORL
  { id: "m273", emoji: "🍯", image: imgToplexil, name: "Sirop toux sèche", dosage: "150 ml", description: "Antitussif, toux irritative.", category: "soins", prescription: false, onOrder: false, stock: "medium" },
  { id: "m274", emoji: "🍯", image: imgToplexil, name: "Ambroxol sirop", dosage: "100 ml", description: "Fluidifiant bronchique, toux grasse.", category: "soins", prescription: false, onOrder: false, stock: "high" },
  { id: "m275", emoji: "💨", image: imgVentoline, name: "Salbutamol aérosol", dosage: "200 doses", description: "Bronchodilatateur, crise d'asthme.", category: "soins", prescription: true, onOrder: false, stock: "medium" },
  { id: "m276", emoji: "🧴", image: imgSerumPhysio, name: "Sérum physiologique 40 unidoses", dosage: "5 ml × 40", description: "Nettoyage nasal et oculaire.", category: "bebe", prescription: false, onOrder: false, stock: "high" },
  { id: "m277", emoji: "💊", image: imgCetirizine, name: "Cétirizine 10 mg", dosage: "20 cp", description: "Antihistaminique, allergies, rhinite.", category: "soins", prescription: false, onOrder: false, stock: "high" },
  { id: "m278", emoji: "💊", image: imgLoratadine, name: "Loratadine 10 mg", dosage: "15 cp", description: "Allergies saisonnières, urticaire.", category: "soins", prescription: false, onOrder: false, stock: "medium" },

  // Cardio / diabète / chronique
  { id: "m279", emoji: "❤️", image: imgAmlodipine, name: "Amlodipine 5 mg", dosage: "30 cp", description: "Hypertension artérielle.", category: "cardio", prescription: true, onOrder: false, stock: "high" },
  { id: "m280", emoji: "❤️", image: imgBisoprolol, name: "Bisoprolol 2.5 mg", dosage: "30 cp", description: "Hypertension, insuffisance cardiaque.", category: "cardio", prescription: true, onOrder: false, stock: "medium" },
  { id: "m281", emoji: "💊", image: imgMetformine, name: "Metformine 850 mg", dosage: "30 cp", description: "Diabète type 2, insulinorésistance.", category: "cardio", prescription: true, onOrder: false, stock: "high" },
  { id: "m282", emoji: "💊", image: imgDaonil, name: "Glibenclamide 5 mg", dosage: "30 cp", description: "Sulfamide hypoglycémiant.", category: "cardio", prescription: true, onOrder: false, stock: "medium" },
  { id: "m283", emoji: "💉", image: imgMetformine, name: "Insuline rapide Actrapid", dosage: "100 UI/ml — 10 ml", description: "Insuline humaine rapide.", category: "cardio", prescription: true, onOrder: true, stock: "low" },
  { id: "m284", emoji: "💊", image: imgAtorvastatine, name: "Atorvastatine 20 mg", dosage: "30 cp", description: "Hypercholestérolémie, prévention cardiaque.", category: "cardio", prescription: true, onOrder: false, stock: "medium" },
  { id: "m285", emoji: "🩺", image: imgAspirineCardio, name: "Aspirine 75 mg", dosage: "30 cp", description: "Antiagrégant plaquettaire, prévention.", category: "cardio", prescription: true, onOrder: false, stock: "high" },

  // Vitamines / grossesse / anémie
  { id: "m286", emoji: "🩸", image: imgFerFolate, name: "Fer + Acide folique", dosage: "30 cp", description: "Anémie, supplémentation grossesse.", category: "vitamines", prescription: false, onOrder: false, stock: "high" },
  { id: "m287", emoji: "🤰", image: imgAcideFolique, name: "Acide folique 5 mg", dosage: "30 cp", description: "Prévention malformations nerveuses, grossesse.", category: "vitamines", prescription: false, onOrder: false, stock: "high" },
  { id: "m288", emoji: "🍊", image: imgVitamineC, name: "Vitamine C 1000 mg", dosage: "20 cp effervescents", description: "Défenses immunitaires, fatigue.", category: "vitamines", prescription: false, onOrder: false, stock: "high" },
  { id: "m289", emoji: "☀️", image: imgVitamineD3, name: "Vitamine D3 100 000 UI", dosage: "Ampoule buvable", description: "Carence en vitamine D, ostéoporose.", category: "vitamines", prescription: false, onOrder: false, stock: "medium" },
  { id: "m290", emoji: "🌿", image: imgMultivitamines, name: "Multivitamines enfants", dosage: "30 cp à croquer", description: "Croissance et défenses immunitaires.", category: "vitamines", prescription: false, onOrder: false, stock: "high" },

  // Bébé / puériculture
  { id: "m291", emoji: "🍼", image: imgLaitBebe, name: "Lait 2ème âge", dosage: "Boîte 900 g", description: "Nourrisson 6-12 mois.", category: "bebe", prescription: false, onOrder: false, stock: "high" },
  { id: "m292", emoji: "🍼", image: imgLaitBebe, name: "Lait de croissance 1-3 ans", dosage: "Boîte 900 g", description: "Croissance enfant 1-3 ans.", category: "bebe", prescription: false, onOrder: false, stock: "medium" },
  { id: "m293", emoji: "👶", image: imgDolipraneBebe, name: "Doliprane sirop bébé", dosage: "120 ml", description: "Paracétamol pédiatrique, fièvre et douleur.", category: "bebe", prescription: false, onOrder: false, stock: "high" },
  { id: "m294", emoji: "🧴", image: imgSerumPhysio, name: "Liniment oléo-calcaire", dosage: "Flacon 500 ml", description: "Nettoyage doux du siège bébé.", category: "bebe", prescription: false, onOrder: false, stock: "medium" },
  { id: "m295", emoji: "🍯", image: imgVermifugeEnfant, name: "Vermifuge sirop enfant", dosage: "Flacon 30 ml", description: "Traitement des vers intestinaux.", category: "bebe", prescription: false, onOrder: false, stock: "medium" },

  // Dermatologie / soins cutanés
  { id: "m296", emoji: "🧴", image: imgKetoconazole, name: "Kétoconazole crème 2%", dosage: "Tube 30 g", description: "Mycoses cutanées, pellicules.", category: "soins", prescription: false, onOrder: false, stock: "high" },
  { id: "m297", emoji: "🧴", image: imgCanesten, name: "Clotrimazole crème 1%", dosage: "Tube 20 g", description: "Mycoses cutanées et vaginales.", category: "soins", prescription: false, onOrder: false, stock: "high" },
  { id: "m298", emoji: "🧴", image: imgBetadine, name: "Bétadine dermique", dosage: "Flacon 125 ml", description: "Antiseptique cutané, plaies.", category: "soins", prescription: false, onOrder: false, stock: "high" },
  { id: "m299", emoji: "🩹", image: imgPansements, name: "Pansements assortis", dosage: "Boîte 40", description: "Pansements adhésifs multiples formats.", category: "soins", prescription: false, onOrder: false, stock: "high" },
  { id: "m300", emoji: "🧴", image: imgAlcool70, name: "Alcool 70°", dosage: "Flacon 250 ml", description: "Désinfection cutanée.", category: "soins", prescription: false, onOrder: false, stock: "high" },

  // === Extension catalogue (m301 → m350) ===
  // Neurologie / psychiatrie / sommeil
  { id: "m301", emoji: "😴", image: imgMagnesium, name: "Mélatonine 3 mg", dosage: "30 cp", description: "Régulateur du sommeil, décalage horaire.", category: "soins", prescription: false, onOrder: false, stock: "medium" },
  { id: "m302", emoji: "🧠", image: imgMagnesium, name: "Valériane forte", dosage: "60 gél", description: "Anxiété légère et troubles du sommeil.", category: "soins", prescription: false, onOrder: false, stock: "medium" },
  { id: "m303", emoji: "💊", image: imgMagnesium, name: "Amitriptyline 25 mg", dosage: "30 cp", description: "Antidépresseur tricyclique, névralgies chroniques.", category: "soins", prescription: true, onOrder: true, stock: "low" },
  { id: "m304", emoji: "💊", image: imgMagnesium, name: "Diazépam 5 mg", dosage: "30 cp", description: "Anxiolytique, crises d'angoisse.", category: "soins", prescription: true, onOrder: true, stock: "low" },
  { id: "m305", emoji: "🧠", image: imgMagnesium, name: "Magnésium + Vitamine B6", dosage: "60 cp", description: "Fatigue nerveuse, crampes, stress.", category: "vitamines", prescription: false, onOrder: false, stock: "high" },

  // Gynécologie / contraception / grossesse
  { id: "m306", emoji: "🩸", image: imgFerFolate, name: "Fer 80 mg", dosage: "30 cp", description: "Anémie ferriprive, grossesse.", category: "vitamines", prescription: false, onOrder: false, stock: "high" },
  { id: "m307", emoji: "🤰", image: imgAcideFolique, name: "Acide folique 0,4 mg", dosage: "30 cp", description: "Préconception et début de grossesse.", category: "vitamines", prescription: false, onOrder: false, stock: "high" },
  { id: "m308", emoji: "💊", image: imgAcideFolique, name: "Microgynon 30", dosage: "21 cp", description: "Pilule contraceptive combinée.", category: "soins", prescription: true, onOrder: false, stock: "medium" },
  { id: "m309", emoji: "💊", image: imgAcideFolique, name: "Diane 35", dosage: "21 cp", description: "Contraception et acné hormonale.", category: "soins", prescription: true, onOrder: true, stock: "low" },
  { id: "m310", emoji: "🧴", image: imgCanesten, name: "Canestène ovule", dosage: "Boîte 3 ovules", description: "Mycose vaginale.", category: "soins", prescription: false, onOrder: false, stock: "high" },
  { id: "m311", emoji: "🧴", image: imgCanesten, name: "Clotrimazole ovule 200 mg", dosage: "Boîte 3", description: "Traitement local mycoses vaginales.", category: "soins", prescription: false, onOrder: false, stock: "medium" },
  { id: "m312", emoji: "🩹", image: imgPansements, name: "Serviettes hygiéniques stériles", dosage: "Paquet 10", description: "Protection hygiénique post-partum.", category: "soins", prescription: false, onOrder: false, stock: "high" },

  // Ophtalmologie / ORL
  { id: "m313", emoji: "👁️", image: imgSerumPhysio, name: "Collyre antibiotique", dosage: "Flacon 5 ml", description: "Conjonctivite bactérienne.", category: "soins", prescription: true, onOrder: false, stock: "medium" },
  { id: "m314", emoji: "👁️", image: imgSerumPhysio, name: "Larmes artificielles", dosage: "Flacon 10 ml", description: "Sécheresse oculaire, irritation.", category: "soins", prescription: false, onOrder: false, stock: "high" },
  { id: "m315", emoji: "👁️", image: imgSerumPhysio, name: "Gentamicine collyre", dosage: "Flacon 5 ml", description: "Infection oculaire bactérienne.", category: "soins", prescription: true, onOrder: false, stock: "medium" },
  { id: "m316", emoji: "👂", image: imgSerumPhysio, name: "Bétadine orale", dosage: "Flacon 125 ml", description: "Antiseptique buccal, gargarisme.", category: "soins", prescription: false, onOrder: false, stock: "medium" },
  { id: "m317", emoji: "👃", image: imgSerumPhysio, name: "Sprout nasal isotonique", dosage: "Spray 100 ml", description: "Irrigation nasale quotidienne.", category: "soins", prescription: false, onOrder: false, stock: "high" },
  { id: "m318", emoji: "👂", image: imgSerumPhysio, name: "Bicarbonate de soude", dosage: "Boîte 20 sachets", description: "Gargarisme, hygiène buccale.", category: "soins", prescription: false, onOrder: false, stock: "high" },

  // Antipaludiques supplémentaires
  { id: "m319", emoji: "🦟", image: imgCoartem, name: "Artésunate 50 mg", dosage: "12 cp", description: "Paludisme simple et sévère.", category: "fievre", prescription: true, onOrder: true, stock: "low" },
  { id: "m320", emoji: "🦟", image: imgAsaq, name: "ASAQ Winthrop adulte", dosage: "3 cp", description: "Artésunate + amodiaquine, paludisme simple.", category: "fievre", prescription: true, onOrder: false, stock: "high" },
  { id: "m321", emoji: "🦟", image: imgCamoquin, name: "Camoquin enfant", dosage: "Syrup 60 ml", description: "Amodiaquine sirop, prophylaxie et traitement.", category: "bebe", prescription: true, onOrder: false, stock: "medium" },
  { id: "m322", emoji: "🦟", image: imgQuinine, name: "Quinine injectable", dosage: "Ampoule 300 mg", description: "Paludisme sévère en milieu hospitalier.", category: "fievre", prescription: true, onOrder: true, stock: "low" },

  // Antiparasitaires & NTD
  { id: "m323", emoji: "🪱", image: imgAlbendazole, name: "Albendazole sirop", dosage: "Flacon 20 ml", description: "Vermifuge pédiatrique.", category: "bebe", prescription: false, onOrder: false, stock: "high" },
  { id: "m324", emoji: "🪱", image: imgAlbendazole, name: "Mébendazole 100 mg", dosage: "6 cp", description: "Vermifuge, oxyurose et ascaridiose.", category: "soins", prescription: false, onOrder: false, stock: "high" },
  { id: "m325", emoji: "🐛", image: imgPraziquantel, name: "Praziquantel 600 mg", dosage: "6 cp", description: "Schistosomiase, distomatose.", category: "soins", prescription: true, onOrder: true, stock: "low" },
  { id: "m326", emoji: "🩹", image: imgIvermectine, name: "Ivermectine 12 mg", dosage: "4 cp", description: "Onchocercose, lymphangite filarienne.", category: "soins", prescription: true, onOrder: false, stock: "medium" },
  { id: "m327", emoji: "🧴", image: imgGriseofulvine, name: "Perméthrine 5%", dosage: "Lotion 60 ml", description: "Gale, poux résistants.", category: "soins", prescription: true, onOrder: false, stock: "medium" },
  { id: "m328", emoji: "🧴", image: imgKetoconazole, name: "Kétoconazole shampoing", dosage: "Flacon 100 ml", description: "Pellicules, dermatite séborrhéique.", category: "soins", prescription: false, onOrder: false, stock: "high" },

  // Phytothérapie / homéopathie
  { id: "m329", emoji: "🌿", image: imgMultivitamines, name: "Moringa bio poudre", dosage: "Boîte 100 g", description: "Nutrition, défenses immunitaires.", category: "vitamines", prescription: false, onOrder: false, stock: "medium" },
  { id: "m330", emoji: "🍯", image: imgToplexil, name: "Sirop au miel et propolis", dosage: "150 ml", description: "Toux et irritation de gorge.", category: "soins", prescription: false, onOrder: false, stock: "medium" },
  { id: "m331", emoji: "🌿", image: imgCharbon, name: "Charbon végétal", dosage: "60 gél", description: "Ballonnements, gaz, troubles digestifs.", category: "soins", prescription: false, onOrder: false, stock: "high" },
  { id: "m332", emoji: "🌿", image: imgMultivitamines, name: "Ginseng rouge", dosage: "30 gél", description: "Tonus physique et intellectuel.", category: "vitamines", prescription: false, onOrder: false, stock: "medium" },
  { id: "m333", emoji: "🌿", image: imgMultivitamines, name: "Spiruline bio", dosage: "120 cp", description: "Protéines, fer, détox.", category: "vitamines", prescription: false, onOrder: false, stock: "medium" },

  // Matériel médical
  { id: "m334", emoji: "🩺", image: imgMasques, name: "Tensiomètre brassard", dosage: "1 unité", description: "Surveillance tension artérielle à domicile.", category: "soins", prescription: false, onOrder: true, stock: "low" },
  { id: "m335", emoji: "🩸", image: imgMasques, name: "Glucomètre + bandelettes", dosage: "Kit", description: "Surveillance glycémie diabétique.", category: "soins", prescription: false, onOrder: true, stock: "low" },
  { id: "m336", emoji: "🌡️", image: imgEfferalganPed, name: "Thermomètre frontal", dosage: "1 unité", description: "Prise de température sans contact.", category: "soins", prescription: false, onOrder: false, stock: "medium" },
  { id: "m337", emoji: "🧤", image: imgMasques, name: "Gants chirurgicaux stériles", dosage: "Boîte 50", description: "Protection médicale.", category: "soins", prescription: false, onOrder: false, stock: "high" },
  { id: "m338", emoji: "🩹", image: imgPansements, name: "Compresses stériles", dosage: "Boîte 100", description: "Nettoyage et protection des plaies.", category: "soins", prescription: false, onOrder: false, stock: "high" },
  { id: "m339", emoji: "💉", image: imgMasques, name: "Seringues 5 ml", dosage: "Boîte 100", description: "Matériel injection stérile.", category: "soins", prescription: false, onOrder: false, stock: "high" },

  // Soins bucco-dentaires
  { id: "m340", emoji: "🦷", image: imgAlcool70, name: "Brosse à dents souple", dosage: "Lot 3", description: "Hygiène bucco-dentaire quotidienne.", category: "soins", prescription: false, onOrder: false, stock: "high" },
  { id: "m341", emoji: "🦷", image: imgAlcool70, name: "Dentifrice fluoré", dosage: "Tube 75 ml", description: "Protection caries, renforcement émail.", category: "soins", prescription: false, onOrder: false, stock: "high" },
  { id: "m342", emoji: "🦷", image: imgAlcool70, name: "Fil dentaire", dosage: "Bobine 50 m", description: "Nettoyage interdentaire.", category: "soins", prescription: false, onOrder: false, stock: "medium" },
  { id: "m343", emoji: "🦷", image: imgAlcool70, name: "Bain de bouche antiseptique", dosage: "Flacon 250 ml", description: "Hygiène buccale, gencives sensibles.", category: "soins", prescription: false, onOrder: false, stock: "high" },

  // Nutrition / réhydratation
  { id: "m344", emoji: "🥤", image: imgSro, name: "SRO citron", dosage: "Sachet — Boîte 10", description: "Réhydratation orale, goût citron.", category: "soins", prescription: false, onOrder: false, stock: "high" },
  { id: "m345", emoji: "🍌", image: imgZinc, name: "Zinc 20 mg", dosage: "30 cp", description: "Immunité, cicatrisation, diarrhée.", category: "vitamines", prescription: false, onOrder: false, stock: "high" },
  { id: "m346", emoji: "🍼", image: imgLaitBebe, name: "Lait maternel en poudre", dosage: "Boîte 400 g", description: "Substitut du lait maternel.", category: "bebe", prescription: false, onOrder: false, stock: "medium" },
  { id: "m347", emoji: "🍯", image: imgVermifugeEnfant, name: "Vitamine A 200 000 UI", dosage: "Capsule", description: "Carence en vitamine A, xérophtalmie.", category: "vitamines", prescription: false, onOrder: false, stock: "medium" },

  // Antiseptiques & désinfection
  { id: "m348", emoji: "🧴", image: imgBetadine, name: "Bétadine scrub", dosage: "Flacon 125 ml", description: "Antiseptique moussant pour lavage chirurgical.", category: "soins", prescription: false, onOrder: false, stock: "medium" },
  { id: "m349", emoji: "🧴", image: imgAlcool70, name: "Eau oxygénée 10 volumes", dosage: "Flacon 250 ml", description: "Désinfection légère des plaies.", category: "soins", prescription: false, onOrder: false, stock: "high" },
  { id: "m350", emoji: "🧴", image: imgAlcool70, name: "Hexamidine solution", dosage: "Flacon 250 ml", description: "Antiseptique cutané, peau sensible.", category: "soins", prescription: false, onOrder: false, stock: "high" },
];

const CATEGORIES: { id: Category; label: string; emoji: string }[] = [
  { id: "all", label: "Tous", emoji: "💊" },
  { id: "fievre", label: "Fièvre", emoji: "🌡️" },
  { id: "antibio", label: "Antibiotiques", emoji: "💉" },
  { id: "vitamines", label: "Vitamines", emoji: "🍊" },
  { id: "cardio", label: "Cardio", emoji: "❤️" },
  { id: "soins", label: "Soins", emoji: "🧴" },
  { id: "bebe", label: "Bébé", emoji: "🍼" },
];

const PHARMACY = {
  name: "Pharmacie Lambangni",
  city: "Conakry, Lambangni",
  isOpen: true,
  hours: "8h - 22h",
  // Villes où cette pharmacie accepte de livrer
  deliveryCities: ["Conakry"] as string[],
};

const STOCK_COLORS: Record<StockLevel, string> = {
  high: "bg-emerald-500",
  medium: "bg-amber-500",
  low: "bg-orange-500",
  out: "bg-red-500",
};

// A seeded demo order so pharmacist side has something to work on
const seedOrder = (): Order => ({
  id: "seed-1",
  ref: "GAL-4821",
  createdAt: Date.now() - 5 * 60_000,
  expiresAt: Date.now() + 25 * 60_000,
  deliveryMode: "livraison",
  deliveryFee: null,
  items: [
    { medicineId: "m1", quantity: 2, isAvailable: null, confirmedPrice: null },
    { medicineId: "m5", quantity: 1, isAvailable: null, confirmedPrice: null },
    { medicineId: "m10", quantity: 1, isAvailable: null, confirmedPrice: null },
  ],
  status: "pending_pharmacist",
  clientName: "Aïssatou Diallo",
  clientPhone: "+224 622 45 67 89",
  city: "Conakry",
  deliveryAddress: "Quartier Almamya, immeuble Bleu, 3e étage",
});

// Principales villes de Guinée (préfectures + Conakry)
export const GUINEA_CITIES = [
  "Conakry", "Boké", "Boffa", "Fria", "Gaoual", "Koundara",
  "Kindia", "Coyah", "Dubréka", "Forécariah", "Télimélé",
  "Mamou", "Dalaba", "Pita",
  "Labé", "Koubia", "Lélouma", "Mali", "Tougué",
  "Faranah", "Dabola", "Dinguiraye", "Kissidougou",
  "Kankan", "Kérouané", "Kouroussa", "Mandiana", "Siguiri",
  "Nzérékoré", "Beyla", "Guéckédou", "Lola", "Macenta", "Yomou",
].sort((a, b) => a.localeCompare(b, "fr"));

// ============================================================
// PAGE
// ============================================================

type ClientView = "home" | "detail" | "cart" | "sent" | "response" | "history";
type PharmView = "dashboard" | "order" | "catalogue" | "stats" | "hours";
type Mode = "client" | "pharmacien";

export default function Pharmacy() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [mode, setMode] = useState<Mode>(
    searchParams.get("view") === "pharmacien" ? "pharmacien" : "client"
  );
  const [clientView, setClientView] = useState<ClientView>("home");
  const [pharmView, setPharmView] = useState<PharmView>("dashboard");

  const [pharmacyId, setPharmacyId] = useState<string | null>(null);
  const [medicines, setMedicines] = useState<Medicine[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const mine = getToken() ? await api<{ id: string }[]>("/pharmacies/mine").catch(() => []) : [];
        if (mine[0]) {
          setPharmacyId(mine[0].id);
          return;
        }
        const all = await api<{ id: string }[]>("/pharmacies");
        if (all[0]) setPharmacyId(all[0].id);
      } catch {}
    })();
  }, []);

  const refreshMedicines = async () => {
    if (!pharmacyId) return;
    try {
      const data = await api<any[]>(`/medicines?pharmacyId=${pharmacyId}`);
      setMedicines(data.map(apiMedicineToDemo));
    } catch {}
  };

  useEffect(() => {
    refreshMedicines();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pharmacyId]);

  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);
  const [cart, setCart] = useState<CartLine[]>(() => {
    try {
      const raw = localStorage.getItem("galimo.pharmacy.cart");
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  });
  const [orders, setOrders] = useState<Order[]>(() => {
    try {
      const raw = localStorage.getItem("galimo.pharmacy.orders");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [seedOrder()];
  });
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [activePharmOrderId, setActivePharmOrderId] = useState<string | null>(null);

  useEffect(() => {
    try { localStorage.setItem("galimo.pharmacy.orders", JSON.stringify(orders)); } catch {}
  }, [orders]);
  useEffect(() => {
    try { localStorage.setItem("galimo.pharmacy.cart", JSON.stringify(cart)); } catch {}
  }, [cart]);

  const activeOrder = orders.find((o) => o.id === activeOrderId) || null;
  const activePharmOrder = orders.find((o) => o.id === activePharmOrderId) || null;

  const getMed = (id: string) => medicines.find((m) => m.id === id)!;

  const addToCart = (id: string, qty = 1) => {
    setCart((prev) => {
      const line = prev.find((l) => l.medicineId === id);
      if (line) return prev.map((l) => (l.medicineId === id ? { ...l, quantity: l.quantity + qty } : l));
      return [...prev, { medicineId: id, quantity: qty }];
    });
    sonner.success("Ajouté au panier", { description: getMed(id).name, duration: 1500 });
  };

  const submitOrder = (payload: {
    deliveryMode: "retrait" | "livraison";
    city?: string;
    deliveryAddress?: string;
  }) => {
    const newOrder: Order = {
      id: crypto.randomUUID(),
      ref: generateOrderRef(),
      createdAt: Date.now(),
      expiresAt: Date.now() + 30 * 60_000,
      deliveryMode: payload.deliveryMode,
      city: payload.city,
      deliveryAddress: payload.deliveryAddress,
      deliveryFee: null,
      items: cart.map((c) => ({
        medicineId: c.medicineId,
        quantity: c.quantity,
        isAvailable: null,
        confirmedPrice: null,
      })),
      status: "pending_pharmacist",
      clientName: "Vous",
      clientPhone: "+224 620 00 00 00",
    };
    setOrders((p) => [newOrder, ...p]);
    setActiveOrderId(newOrder.id);
    setCart([]);
    setClientView("sent");
    sonner.success(`Commande envoyée #${newOrder.ref}`, {
      description: "La pharmacienne va confirmer les prix sous 30 min.",
      duration: 3500,
    });
  };

  return (
    <div className="pharmacy-scope min-h-screen pb-24">
      {/* Demo mode toggle */}
      <div className="ph-gradient sticky top-0 z-40 text-white">
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="h-9 w-9 rounded-full bg-white/15 backdrop-blur flex items-center justify-center active:scale-95"
            aria-label="Retour"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-1.5">
            <div className="h-8 w-8 rounded-full bg-white/15 flex items-center justify-center">
              <Pill className="h-4 w-4" />
            </div>
            <span className="ph-display font-bold text-sm">Galimo Pharmacie</span>
          </div>
          <div className="w-9" />
        </div>
      </div>

      {mode === "client" ? (
        <ClientArea
          view={clientView}
          setView={setClientView}
          medicines={medicines}
          getMed={getMed}
          cart={cart}
          setCart={setCart}
          addToCart={addToCart}
          selectedMedicine={selectedMedicine}
          setSelectedMedicine={setSelectedMedicine}
          submitOrder={submitOrder}
          orders={orders}
          activeOrder={activeOrder}
          setActiveOrderId={setActiveOrderId}
          uploadPrescription={(id, url) => {
            setOrders((p) => p.map((o) => (o.id === id ? { ...o, prescriptionUrl: url } : o)));
            sonner.success("Ordonnance envoyée ✓", {
              description: "La pharmacienne va la vérifier.",
              duration: 3000,
            });
          }}
          acceptOrder={(id) => {
            const o = orders.find((x) => x.id === id);
            const isDelivery = o?.deliveryMode === "livraison";
            setOrders((p) => p.map((o) => (o.id === id ? { ...o, status: isDelivery ? "ready" : "accepted" } : o)));
            sonner.success("Paiement effectué ✓", {
              description: isDelivery
                ? `La pharmacienne va vous appeler pour vous mettre en relation avec le livreur et convenir du prix du transport.`
                : o ? `Commande #${o.ref} payée via votre wallet.` : "Paiement réussi via votre wallet.",
              duration: 5000,
            });
            setClientView("history");
          }}
          cancelOrder={(id) => {
            const o = orders.find((x) => x.id === id);
            setOrders((p) => p.map((o) => (o.id === id ? { ...o, status: "cancelled" } : o)));
            sonner.error("Commande annulée", {
              description: o ? `#${o.ref}` : undefined,
              duration: 2500,
            });
            setClientView("history");
          }}
        />
      ) : (
        <PharmacistArea
          view={pharmView}
          setView={setPharmView}
          orders={orders}
          setOrders={setOrders}
          medicines={medicines}
          setMedicines={setMedicines}
          pharmacyId={pharmacyId}
          refreshMedicines={refreshMedicines}
          activeOrder={activePharmOrder}
          setActiveOrderId={setActivePharmOrderId}
          getMed={getMed}
          requestPrescription={(id) => {
            const o = orders.find((x) => x.id === id);
            setOrders((p) => p.map((x) => (x.id === id ? { ...x, prescriptionRequested: true } : x)));
            sonner.success("Ordonnance demandée au client", {
              description: o ? `#${o.ref}` : undefined,
              duration: 2500,
            });
          }}
        />
      )}
    </div>
  );
}

// ============================================================
// CLIENT AREA
// ============================================================

function ClientArea(props: {
  view: ClientView;
  setView: (v: ClientView) => void;
  medicines: Medicine[];
  getMed: (id: string) => Medicine;
  cart: CartLine[];
  setCart: React.Dispatch<React.SetStateAction<CartLine[]>>;
  addToCart: (id: string, qty?: number) => void;
  selectedMedicine: Medicine | null;
  setSelectedMedicine: (m: Medicine | null) => void;
  submitOrder: (payload: {
    deliveryMode: "retrait" | "livraison";
    city?: string;
    deliveryAddress?: string;
  }) => void;
  orders: Order[];
  activeOrder: Order | null;
  setActiveOrderId: (id: string | null) => void;
  uploadPrescription: (id: string, url: string) => void;
  acceptOrder: (id: string) => void;
  cancelOrder: (id: string) => void;
}) {
  const {
    view, setView, medicines, getMed, cart, setCart, addToCart,
    selectedMedicine, setSelectedMedicine, submitOrder,
    orders, activeOrder, setActiveOrderId, uploadPrescription, acceptOrder, cancelOrder,
  } = props;

  const cartCount = cart.reduce((s, l) => s + l.quantity, 0);

  return (
    <>
      {view === "home" && (
        <PharmacyHome
          medicines={medicines}
          onOpenDetail={(m) => { setSelectedMedicine(m); setView("detail"); }}
          onAdd={(m) => addToCart(m.id)}
          onOpenCart={() => setView("cart")}
          cartCount={cartCount}
        />
      )}
      {view === "detail" && selectedMedicine && (
        <MedicineDetail
          medicine={selectedMedicine}
          onBack={() => setView("home")}
          onAdd={(qty) => { addToCart(selectedMedicine.id, qty); setView("home"); }}
        />
      )}
      {view === "cart" && (
        <CartScreen
          cart={cart}
          getMed={getMed}
          onBack={() => setView("home")}
          onUpdate={(id, qty) =>
            setCart((p) => qty <= 0 ? p.filter((l) => l.medicineId !== id) : p.map((l) => l.medicineId === id ? { ...l, quantity: qty } : l))
          }
          onRemove={(id) => setCart((p) => p.filter((l) => l.medicineId !== id))}
          onConfirm={submitOrder}
        />
      )}
      {view === "sent" && activeOrder && (
        <OrderSent
          order={activeOrder}
          onSeeResponse={() => setView("response")}
          onGoHome={() => setView("home")}
          onUploadPrescription={(url) => uploadPrescription(activeOrder.id, url)}
        />
      )}
      {view === "response" && activeOrder && (
        <PharmacistResponse
          order={activeOrder}
          getMed={getMed}
          onAccept={() => acceptOrder(activeOrder.id)}
          onCancel={() => cancelOrder(activeOrder.id)}
          onBack={() => setView("history")}
        />
      )}
      {view === "history" && (
        <OrderHistory
          orders={orders}
          getMed={getMed}
          onOpen={(o) => {
            setActiveOrderId(o.id);
            if (o.status === "awaiting_client") setView("response");
            else setView("sent");
          }}
          onReorder={(o) => {
            setCart((prev) => {
              const next = [...prev];
              for (const it of o.items) {
                const idx = next.findIndex((l) => l.medicineId === it.medicineId);
                if (idx >= 0) next[idx] = { ...next[idx], quantity: next[idx].quantity + it.quantity };
                else next.push({ medicineId: it.medicineId, quantity: it.quantity });
              }
              return next;
            });
            const totalQty = o.items.reduce((s, i) => s + i.quantity, 0);
            sonner.success("Articles ajoutés au panier", {
              description: `${totalQty} article${totalQty > 1 ? "s" : ""} depuis #${o.ref}`,
              duration: 2000,
            });
            setView("cart");
          }}
          onBack={() => setView("home")}
        />
      )}

      {/* Bottom nav */}
      <ClientTabBar
        view={view}
        setView={setView}
        cartCount={cartCount}
        ordersDot={orders.some((o) => o.status === "awaiting_client" || (o.prescriptionRequested && !o.prescriptionUrl))}
      />
    </>
  );
}

function ClientTabBar({ view, setView, cartCount, ordersDot }: { view: ClientView; setView: (v: ClientView) => void; cartCount: number; ordersDot?: boolean }) {
  const tabs = [
    { key: "home" as ClientView, icon: Store, label: "Boutique" },
    { key: "cart" as ClientView, icon: ShoppingCart, label: "Panier", badge: cartCount },
    { key: "history" as ClientView, icon: ClipboardList, label: "Commandes", dot: ordersDot },
  ];
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[hsl(var(--ph-border))] safe-area-bottom">
      <div className="grid grid-cols-3">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = view === t.key || (t.key === "history" && (view === "sent" || view === "response"));
          return (
            <button
              key={t.key}
              onClick={() => setView(t.key)}
              className="relative flex flex-col items-center gap-1 py-2.5 active:scale-95 transition"
            >
              <div className="relative">
                <Icon className={`h-5 w-5 ${active ? "text-[hsl(var(--ph-purple))]" : "text-[hsl(var(--ph-ink-soft))]"}`} />
                {t.badge && t.badge > 0 ? (
                  <span key={t.badge} className="ph-bump absolute -top-1.5 -right-2 h-4 min-w-[16px] px-1 rounded-full bg-[hsl(var(--ph-purple))] text-white text-[9px] font-bold flex items-center justify-center">
                    {t.badge}
                  </span>
                ) : null}
                {(t as any).dot && !active ? (
                  <span className="ph-bump absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
                ) : null}
              </div>
              <span className={`text-[10px] font-semibold ${active ? "text-[hsl(var(--ph-purple))]" : "text-[hsl(var(--ph-ink-soft))]"}`}>{t.label}</span>
              {active && <span className="absolute top-0 h-0.5 w-8 bg-[hsl(var(--ph-purple))] rounded-full" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// ---------- Screen 1: Home ----------
function PharmacyHome({ medicines, onOpenDetail, onAdd, onOpenCart, cartCount }: {
  medicines: Medicine[];
  onOpenDetail: (m: Medicine) => void;
  onAdd: (m: Medicine) => void;
  onOpenCart: () => void;
  cartCount: number;
}) {
  const [cat, setCat] = useState<Category>("all");
  const [search, setSearch] = useState("");
  const [justAdded, setJustAdded] = useState<Record<string, number>>({});
  const handleAdd = (m: Medicine) => {
    onAdd(m);
    setJustAdded((p) => ({ ...p, [m.id]: (p[m.id] || 0) + 1 }));
    setTimeout(() => {
      setJustAdded((p) => {
        const n = { ...p };
        const v = (n[m.id] || 1) - 1;
        if (v <= 0) delete n[m.id]; else n[m.id] = v;
        return n;
      });
    }, 1100);
  };
  const list = useMemo(() => {
    let l = medicines;
    if (cat !== "all") l = l.filter((m) => m.category === cat);
    if (search) {
      const s = search.toLowerCase();
      const terms = SYMPTOM_ALIASES[s] ?? [s];
      l = l.filter((m) => {
        const text = `${m.name} ${m.dosage} ${m.description} ${m.indications?.join(" ") ?? ""}`.toLowerCase();
        return terms.some((t) => text.includes(t));
      });
    }
    return l;
  }, [medicines, cat, search]);

  return (
    <div>
      <div className="ph-gradient text-white px-4 pb-6 pt-2 relative">
        <div className="ph-card p-4 mb-4 !shadow-xl" style={{ background: "rgba(255,255,255,0.98)" }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[hsl(var(--ph-ink-soft))] text-[11px] uppercase tracking-wider font-semibold">Pharmacie partenaire</p>
              <h2 className="ph-display font-bold text-lg mt-0.5" style={{ color: "hsl(var(--ph-deep))" }}>{PHARMACY.name}</h2>
              <div className="flex items-center gap-1 text-[hsl(var(--ph-ink-soft))] text-xs mt-1">
                <MapPin className="h-3 w-3" /> {PHARMACY.city}
              </div>
            </div>
            <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 ${PHARMACY.isOpen ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${PHARMACY.isOpen ? "bg-emerald-500" : "bg-red-500"}`} />
              {PHARMACY.isOpen ? "Ouvert" : "Fermé"}
            </div>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-[hsl(var(--ph-ink-soft))] mt-2">
            <Clock className="h-3 w-3" /> {PHARMACY.hours}
          </div>
        </div>

      </div>

      <div className="ph-gradient text-white sticky top-[92px] z-30 px-4 pt-3 pb-3 shadow-md">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--ph-ink-soft))]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un médicament, un symptôme ou une maladie…"
            className="w-full h-11 pl-10 pr-4 rounded-full bg-white text-[hsl(var(--ph-ink))] placeholder:text-[hsl(var(--ph-ink-soft))] text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--ph-purple-2))]"
          />
        </div>
        {search === "" && (
          <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-4 px-4 mt-2.5 pb-0.5">
            {QUICK_SYMPTOMS.map((sym) => (
              <button
                key={sym}
                onClick={() => setSearch(sym)}
                className="flex-shrink-0 px-3 py-1.5 rounded-full bg-white/20 text-white text-[11px] font-semibold active:scale-95 transition"
              >
                {sym}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 pt-4">
        <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-4 px-4 pb-1">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setCat(c.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 h-9 rounded-full text-xs font-semibold transition ${
                cat === c.id ? "ph-chip-active" : "ph-chip"
              }`}
            >
              <span>{c.emoji}</span>{c.label}
            </button>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {list.map((m) => (
            <div key={m.id} className="ph-card p-3 flex flex-col">
              <button onClick={() => onOpenDetail(m)} className="text-left flex-1">
                <div className="h-24 w-full rounded-2xl bg-gradient-to-br from-[hsl(var(--ph-purple)/0.08)] to-[hsl(var(--ph-purple)/0.03)] flex items-center justify-center overflow-hidden mb-2">
                  {m.image ? (
                    <img src={m.image} alt={m.name} loading="lazy" width={512} height={512} className="h-full w-full object-contain p-1.5" />
                  ) : (
                    <span className="text-4xl">{m.emoji}</span>
                  )}
                </div>
                <h3 className="ph-display font-semibold text-sm text-[hsl(var(--ph-ink))] leading-tight line-clamp-1">{m.name}</h3>
                <p className="text-[11px] text-[hsl(var(--ph-ink-soft))] mt-0.5 line-clamp-1">{m.dosage}</p>
                <div className="flex gap-1 mt-1.5 flex-wrap">
                  {m.prescription && <PrescriptionBadge small />}
                  {m.onOrder && (
                    <span className="text-[9px] font-bold text-[hsl(var(--ph-purple))] bg-[hsl(var(--ph-purple)/0.1)] px-1.5 py-0.5 rounded-full">Sur commande</span>
                  )}
                </div>
              </button>
              <button
                onClick={() => handleAdd(m)}
                className={`ph-btn-primary mt-2.5 h-9 flex items-center justify-center gap-1 text-xs w-full ${justAdded[m.id] ? "ph-btn-added" : ""}`}
              >
                {justAdded[m.id] ? (
                  <><Check className="h-3.5 w-3.5" /> Ajouté</>
                ) : (
                  <><Plus className="h-3.5 w-3.5" /> Ajouter</>
                )}
              </button>
            </div>
          ))}
        </div>

        {list.length === 0 && (
          <div className="text-center py-14 text-[hsl(var(--ph-ink-soft))] text-sm">Aucun médicament trouvé</div>
        )}
      </div>

    </div>
  );
}

// ---------- Screen 2: Detail ----------
function MedicineDetail({ medicine, onBack, onAdd }: { medicine: Medicine; onBack: () => void; onAdd: (qty: number) => void; }) {
  const [qty, setQty] = useState(1);
  return (
    <div>
      <div className="ph-gradient text-white px-4 pt-2 pb-8">
        <button onClick={onBack} className="h-9 w-9 rounded-full bg-white/15 flex items-center justify-center mb-3">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="h-36 w-36 mx-auto rounded-3xl bg-white flex items-center justify-center shadow-2xl overflow-hidden">
          {medicine.image ? (
            <img src={medicine.image} alt={medicine.name} width={512} height={512} className="h-full w-full object-contain p-2" />
          ) : (
            <span className="text-6xl">{medicine.emoji}</span>
          )}
        </div>
      </div>
      <div className="px-4 -mt-4">
        <div className="ph-card p-5">
          <div className="flex gap-2 mb-2 flex-wrap">
            {medicine.prescription && <PrescriptionBadge />}
            {medicine.onOrder && (
              <span className="text-[10px] font-bold text-[hsl(var(--ph-purple))] bg-[hsl(var(--ph-purple)/0.1)] px-2 py-1 rounded-full">Sur commande</span>
            )}
          </div>
          <h1 className="ph-display font-bold text-2xl text-[hsl(var(--ph-deep))]">{medicine.name}</h1>
          <p className="text-sm text-[hsl(var(--ph-ink-soft))] font-medium mt-0.5">{medicine.dosage}</p>
          <p className="text-sm text-[hsl(var(--ph-ink))] leading-relaxed mt-4">{medicine.description}</p>

          <div className="mt-5 flex items-center justify-between">
            <span className="text-sm font-semibold">Quantité</span>
            <div className="flex items-center gap-3">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="h-9 w-9 rounded-full bg-[hsl(var(--ph-muted))] flex items-center justify-center active:scale-95">
                <Minus className="h-4 w-4" />
              </button>
              <span className="ph-display font-bold text-lg w-6 text-center">{qty}</span>
              <button onClick={() => setQty(qty + 1)} className="h-9 w-9 rounded-full bg-[hsl(var(--ph-muted))] flex items-center justify-center active:scale-95">
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-4 bg-[hsl(var(--ph-purple)/0.08)] rounded-xl p-3 text-xs text-[hsl(var(--ph-deep))] leading-relaxed">
            💡 Les prix sont confirmés par la pharmacienne après réception de votre commande.
          </div>
        </div>

        <button onClick={() => onAdd(qty)} className="ph-btn-primary w-full h-12 mt-4 flex items-center justify-center gap-2">
          <Plus className="h-4 w-4" /> Ajouter au panier
        </button>
      </div>
    </div>
  );
}

// ---------- Screen 3: Cart ----------
function CartScreen({ cart, getMed, onBack, onUpdate, onRemove, onConfirm }: {
  cart: CartLine[];
  getMed: (id: string) => Medicine;
  onBack: () => void;
  onUpdate: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
  onConfirm: (payload: {
    deliveryMode: "retrait" | "livraison";
    city?: string;
    deliveryAddress?: string;
  }) => void;
}) {
  const [mode, setMode] = useState<"retrait" | "livraison">("retrait");
  const availableCities = PHARMACY.deliveryCities;
  const [city, setCity] = useState<string>(availableCities[0] ?? "Conakry");
  const [address, setAddress] = useState<string>("");

  const needsPrescription = cart.some((l) => getMed(l.medicineId).prescription);

  const handleConfirm = () => {
    if (mode === "livraison") {
      if (!city) return sonner.error("Choisis ta ville");
      if (!address.trim() || address.trim().length < 5) {
        return sonner.error("Précise ton adresse", { description: "Quartier, rue, point de repère…" });
      }
    }
    onConfirm({
      deliveryMode: mode,
      city: mode === "livraison" ? city : undefined,
      deliveryAddress: mode === "livraison" ? address.trim() : undefined,
    });
  };

  if (cart.length === 0) {
    return (
      <div className="px-4 py-16 text-center">
        <ShoppingCart className="h-14 w-14 mx-auto text-[hsl(var(--ph-ink-soft))] mb-3" />
        <h2 className="ph-display font-bold text-lg">Panier vide</h2>
        <p className="text-sm text-[hsl(var(--ph-ink-soft))] mt-1">Ajoutez des médicaments depuis la boutique.</p>
        <button onClick={onBack} className="ph-btn-primary px-6 h-11 mt-4 inline-flex items-center">Découvrir</button>
      </div>
    );
  }

  return (
    <div className="px-4 pt-4 pb-32">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="h-9 w-9 rounded-full bg-white border border-[hsl(var(--ph-border))] flex items-center justify-center">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="ph-display font-bold text-xl">Mon panier</h1>
      </div>

      <div className="space-y-2.5">
        {cart.map((line) => {
          const m = getMed(line.medicineId);
          return (
            <div key={line.medicineId} className="ph-card p-3 flex items-center gap-3">
              <div className="h-14 w-14 rounded-xl bg-[hsl(var(--ph-purple)/0.08)] flex items-center justify-center flex-shrink-0 overflow-hidden">
                {m.image ? (
                  <img src={m.image} alt={m.name} loading="lazy" width={512} height={512} className="h-full w-full object-contain p-1" />
                ) : (
                  <span className="text-2xl">{m.emoji}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="ph-display font-semibold text-sm line-clamp-1">{m.name}</h3>
                <p className="text-[11px] text-[hsl(var(--ph-ink-soft))]">{m.dosage}</p>
                {m.prescription && <div className="mt-1"><PrescriptionBadge small /></div>}
                <div className="flex items-center gap-2 mt-1.5">
                  <button onClick={() => onUpdate(line.medicineId, line.quantity - 1)} className="h-7 w-7 rounded-full bg-[hsl(var(--ph-muted))] flex items-center justify-center">
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="font-bold text-sm w-4 text-center">{line.quantity}</span>
                  <button onClick={() => onUpdate(line.medicineId, line.quantity + 1)} className="h-7 w-7 rounded-full bg-[hsl(var(--ph-muted))] flex items-center justify-center">
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>
              <button onClick={() => onRemove(line.medicineId)} className="h-8 w-8 rounded-full text-red-500 flex items-center justify-center">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-5">
        <h3 className="ph-display font-semibold text-sm mb-2">Mode de récupération</h3>
        <div className="grid grid-cols-2 gap-2.5">
          {(["retrait", "livraison"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setMode(k)}
              className={`ph-card p-3 text-left border-2 transition ${
                mode === k ? "border-[hsl(var(--ph-purple))]" : "border-transparent"
              }`}
            >
              <div className="text-2xl mb-1">{k === "retrait" ? "🏪" : "🛵"}</div>
              <div className="font-semibold text-sm text-[hsl(var(--ph-ink))]">{k === "retrait" ? "Retrait" : "Livraison"}</div>
              <div className="text-[11px] text-[hsl(var(--ph-ink-soft))] mt-0.5">
                {k === "retrait" ? "Gratuit" : "Prix fixé par la pharmacienne"}
              </div>
            </button>
          ))}
        </div>
      </div>

      {mode === "livraison" && (
        <div className="mt-4 ph-card p-4 space-y-3">
          <h3 className="ph-display font-semibold text-sm flex items-center gap-2">
            <MapPin className="h-4 w-4 text-[hsl(var(--ph-purple))]" /> Adresse de livraison
          </h3>
          <div>
            <label className="text-[11px] font-semibold text-[hsl(var(--ph-ink-soft))] uppercase tracking-wider">Ville</label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="mt-1 w-full h-11 px-3 rounded-xl bg-[hsl(var(--ph-muted))] text-sm font-semibold outline-none focus:ring-2 focus:ring-[hsl(var(--ph-purple))]"
            >
              {availableCities.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <p className="mt-1.5 text-[11px] text-[hsl(var(--ph-ink-soft))]">
              🛵 {PHARMACY.name} livre uniquement {availableCities.length === 1 ? `à ${availableCities[0]}` : `dans ${availableCities.length} villes`}.
            </p>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-[hsl(var(--ph-ink-soft))] uppercase tracking-wider">Quartier & repères</label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Ex: Almamya, immeuble bleu en face de la station, 3e étage…"
              rows={3}
              className="mt-1 w-full px-3 py-2.5 rounded-xl bg-[hsl(var(--ph-muted))] text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--ph-purple))] resize-none"
            />
          </div>
        </div>
      )}

      {needsPrescription && (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 flex gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="ph-display font-semibold text-sm text-amber-900">Ordonnance nécessaire</p>
            <p className="text-[12px] text-amber-800 mt-1 leading-relaxed">
              Certains médicaments nécessitent une ordonnance. La <strong>pharmacienne</strong> te la demandera après réception de la commande — tu pourras l'envoyer depuis le suivi.
            </p>
          </div>
        </div>
      )}

      <div className="mt-5 bg-[hsl(var(--ph-purple)/0.08)] rounded-2xl p-4 flex gap-3">
        <div className="text-2xl">ℹ️</div>
        <div>
          <p className="ph-display font-semibold text-sm text-[hsl(var(--ph-deep))]">Prix confirmés après commande</p>
          <p className="text-xs text-[hsl(var(--ph-ink))] leading-relaxed mt-1">La pharmacienne confirme les prix avant tout paiement. Aucun montant n'est débité maintenant.</p>
        </div>
      </div>

      <div className="fixed bottom-20 left-4 right-4 z-30">
        <button onClick={handleConfirm} className="ph-btn-primary w-full h-13 py-3.5 flex items-center justify-center gap-2">
          <Check className="h-4 w-4" /> Confirmer la commande
        </button>
      </div>
    </div>
  );
}

// ---------- Screen 4: Order Sent ----------
function OrderSent({ order, onSeeResponse, onGoHome, onUploadPrescription }: {
  order: Order;
  onSeeResponse: () => void;
  onGoHome: () => void;
  onUploadPrescription: (url: string) => void;
}) {
  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      sonner.error("Fichier trop volumineux (max 5 Mo)");
      return;
    }
    const url = URL.createObjectURL(f);
    onUploadPrescription(url);
  };
  const steps = [
    { key: "sent", label: "Envoyée", icon: "📤" },
    { key: "pending", label: "En attente pharmacienne", icon: "⏳" },
    { key: "confirmed", label: "Prix confirmés", icon: "💰" },
    { key: "paid", label: "Paiement", icon: "💳" },
    { key: "delivery", label: "Livraison", icon: "🛵" },
  ];
  const currentIdx =
    order.status === "pending_pharmacist" ? 1 :
    order.status === "awaiting_client" ? 2 :
    order.status === "accepted" ? 3 :
    order.status === "ready" || order.status === "delivered" ? 4 : 0;

  return (
    <div className="px-4 pt-6 pb-24">
      <div className="text-center mb-6">
        <div className="h-20 w-20 mx-auto rounded-full bg-emerald-100 flex items-center justify-center mb-3">
          <CheckCircle2 className="h-10 w-10 text-emerald-600" />
        </div>
        <h1 className="ph-display font-bold text-2xl">Commande envoyée !</h1>
        <p className="text-sm text-[hsl(var(--ph-ink-soft))] mt-1">Référence</p>
        <p className="ph-display font-bold text-xl text-[hsl(var(--ph-purple))] mt-1">#{order.ref}</p>
      </div>

      <div className="ph-card p-5">
        <h3 className="ph-display font-semibold text-sm mb-4">Suivi</h3>
        <div className="space-y-4">
          {steps.map((s, i) => {
            const done = i <= currentIdx;
            const active = i === currentIdx;
            return (
              <div key={s.key} className="flex items-start gap-3">
                <div className={`h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0 ${done ? "bg-[hsl(var(--ph-purple))] text-white" : "bg-[hsl(var(--ph-muted))] text-[hsl(var(--ph-ink-soft))]"}`}>
                  {done ? <Check className="h-4 w-4" /> : <span className="text-sm">{s.icon}</span>}
                </div>
                <div className="flex-1 pt-1.5">
                  <p className={`text-sm font-semibold ${active ? "text-[hsl(var(--ph-purple))]" : done ? "text-[hsl(var(--ph-ink))]" : "text-[hsl(var(--ph-ink-soft))]"}`}>{s.label}</p>
                  {active && <p className="text-[11px] text-[hsl(var(--ph-ink-soft))] mt-0.5">En cours…</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {order.status === "awaiting_client" && (
        <button onClick={onSeeResponse} className="ph-btn-primary w-full h-12 mt-5 flex items-center justify-center gap-2">
          <Bell className="h-4 w-4" /> Voir la réponse
        </button>
      )}
      {(order.status === "accepted" || order.status === "ready") && order.deliveryMode === "livraison" && (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
              <span className="text-lg">📞</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-900">Livraison à organiser</p>
              <p className="text-[12px] text-amber-800 mt-1 leading-relaxed">
                La pharmacienne va vous <strong>appeler</strong> pour vous mettre en relation avec un livreur. Vous conviendrez ensemble du <strong>prix du transport</strong> directement avec lui.
              </p>
            </div>
          </div>
        </div>
      )}
      {order.prescriptionRequested && !order.prescriptionUrl && (
        <div className="mt-5 rounded-2xl border border-amber-300 bg-amber-50 p-4">
          <div className="flex items-start gap-3 mb-3">
            <div className="h-9 w-9 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-amber-700" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-amber-900">Ordonnance demandée</p>
              <p className="text-[12px] text-amber-800 mt-1 leading-relaxed">
                La pharmacienne a besoin de ton ordonnance pour valider la commande. Prends-la en photo bien lisible.
              </p>
            </div>
          </div>
          <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-amber-300 rounded-xl py-6 cursor-pointer bg-white active:scale-[0.99] transition">
            <Upload className="h-6 w-6 text-amber-600" />
            <span className="text-sm font-semibold text-amber-900">Envoyer la photo</span>
            <span className="text-[11px] text-amber-700">JPG, PNG ou PDF · max 5 Mo</span>
            <input
              type="file"
              accept="image/*,application/pdf"
              capture="environment"
              onChange={handleUpload}
              className="hidden"
            />
          </label>
        </div>
      )}
      {order.prescriptionUrl && (
        <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-emerald-900">Ordonnance envoyée</p>
            <p className="text-[11px] text-emerald-700">La pharmacienne va la vérifier.</p>
          </div>
          <a href={order.prescriptionUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-emerald-700 underline">
            Voir
          </a>
        </div>
      )}
      <button onClick={onGoHome} className="w-full h-12 mt-3 rounded-full border border-[hsl(var(--ph-border))] font-semibold text-sm active:scale-95 transition">
        Retour boutique
      </button>
    </div>
  );
}

// ---------- Screen 5: Pharmacist Response ----------
function PharmacistResponse({ order, getMed, onAccept, onCancel, onBack }: {
  order: Order;
  getMed: (id: string) => Medicine;
  onAccept: () => void;
  onCancel: () => void;
  onBack: () => void;
}) {
  const available = order.items.filter((i) => i.isAvailable);
  const unavailable = order.items.filter((i) => i.isAvailable === false);
  const allUnavailable = available.length === 0;
  const subtotal = available.reduce((s, i) => s + (i.confirmedPrice || 0) * i.quantity, 0);
  const total = subtotal + (order.deliveryFee || 0);

  return (
    <div className="px-4 pt-4 pb-32">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="h-9 w-9 rounded-full bg-white border border-[hsl(var(--ph-border))] flex items-center justify-center">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="ph-display font-bold text-xl">Réponse pharmacienne</h1>
          <p className="text-xs text-[hsl(var(--ph-ink-soft))]">#{order.ref}</p>
        </div>
      </div>

      {allUnavailable ? (
        <div className="ph-card p-6 text-center">
          <div className="text-5xl mb-3">😔</div>
          <h2 className="ph-display font-bold text-lg">Aucun médicament disponible</h2>
          <p className="text-sm text-[hsl(var(--ph-ink-soft))] mt-2">La pharmacienne ne peut satisfaire aucune ligne de votre commande. Elle a été automatiquement annulée.</p>
          <button onClick={onCancel} className="ph-btn-primary w-full h-12 mt-5">OK, retour</button>
        </div>
      ) : (
        <>
          <div className="space-y-2.5">
            {available.map((item) => {
              const m = getMed(item.medicineId);
              return (
                <div key={item.medicineId} className="ph-card p-3 flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center overflow-hidden">
                    {m.image ? <img src={m.image} alt={m.name} loading="lazy" width={512} height={512} className="h-full w-full object-contain p-0.5" /> : <span className="text-2xl">{m.emoji}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      <h3 className="ph-display font-semibold text-sm">{m.name}</h3>
                    </div>
                    <p className="text-[11px] text-[hsl(var(--ph-ink-soft))]">{m.dosage} × {item.quantity}</p>
                    {m.prescription && <div className="mt-1"><PrescriptionBadge small /></div>}
                  </div>
                  <div className="text-right">
                    <p className="ph-display font-bold text-sm text-[hsl(var(--ph-deep))]">{formatGNF((item.confirmedPrice || 0) * item.quantity)}</p>
                    <p className="text-[10px] text-[hsl(var(--ph-ink-soft))]">{formatGNF(item.confirmedPrice || 0)} / u</p>
                  </div>
                </div>
              );
            })}
            {unavailable.map((item) => {
              const m = getMed(item.medicineId);
              return (
                <div key={item.medicineId} className="ph-card p-3 flex items-center gap-3 opacity-60">
                  <div className="h-12 w-12 rounded-xl bg-red-50 flex items-center justify-center overflow-hidden grayscale">
                    {m.image ? <img src={m.image} alt={m.name} loading="lazy" width={512} height={512} className="h-full w-full object-contain p-0.5" /> : <span className="text-2xl">{m.emoji}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <X className="h-3.5 w-3.5 text-red-500" />
                      <h3 className="ph-display font-semibold text-sm line-through">{m.name}</h3>
                    </div>
                    <p className="text-[11px] text-red-500">Indisponible</p>
                    {m.prescription && <div className="mt-1"><PrescriptionBadge small /></div>}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="ph-card p-4 mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[hsl(var(--ph-ink-soft))]">Sous-total</span>
              <span className="font-semibold">{formatGNF(subtotal)}</span>
            </div>
            {order.deliveryMode === "livraison" && (
              <div className="flex justify-between text-sm">
                <span className="text-[hsl(var(--ph-ink-soft))]">Livraison</span>
                <span className="font-semibold">{order.deliveryFee ? formatGNF(order.deliveryFee) : "—"}</span>
              </div>
            )}
            <div className="border-t border-[hsl(var(--ph-border))] pt-2 flex justify-between items-center">
              <span className="ph-display font-bold">Total</span>
              <span className="ph-display font-bold text-lg text-[hsl(var(--ph-purple))]">{formatGNF(total)}</span>
            </div>
          </div>

          <div className="fixed bottom-20 left-4 right-4 z-30 space-y-2">
            <button onClick={onAccept} className="ph-btn-primary w-full h-12 flex items-center justify-center gap-2">
              <Check className="h-4 w-4" /> Accepter et payer
            </button>
            <button onClick={onCancel} className="w-full h-11 rounded-full bg-white border border-red-300 text-red-600 font-semibold text-sm active:scale-95 transition">
              Annuler la commande
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ---------- Screen 6: Order History ----------
function OrderHistory({ orders, getMed, onOpen, onReorder, onBack }: {
  orders: Order[];
  getMed: (id: string) => Medicine;
  onOpen: (o: Order) => void;
  onReorder: (o: Order) => void;
  onBack: () => void;
}) {
  const canReorder = (s: OrderStatus) => s === "delivered" || s === "accepted" || s === "ready" || s === "cancelled" || s === "expired";
  return (
    <div className="px-4 pt-4 pb-24">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="h-9 w-9 rounded-full bg-white border border-[hsl(var(--ph-border))] flex items-center justify-center">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="ph-display font-bold text-xl">Mes commandes</h1>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-16 text-[hsl(var(--ph-ink-soft))] text-sm">Aucune commande pour l'instant</div>
      ) : (
        <div className="space-y-2.5">
          {orders.map((o) => (
            <div key={o.id} className="ph-card p-4">
             <button onClick={() => onOpen(o)} className="w-full text-left active:scale-[0.99] transition">
              <div className="flex items-center justify-between mb-2">
                <span className="ph-display font-bold text-sm">#{o.ref}</span>
                <StatusBadge status={o.status} />
              </div>
              <p className="text-xs text-[hsl(var(--ph-ink-soft))] line-clamp-1">
                {o.items.map((i) => getMed(i.medicineId).name).join(", ")}
              </p>
              {o.items.some((i) => getMed(i.medicineId).prescription) && (
                <div className="mt-1.5"><PrescriptionBadge small /></div>
              )}
              <div className="flex items-center justify-between mt-2">
                <span className="text-[11px] text-[hsl(var(--ph-ink-soft))]">
                  {o.items.length} article{o.items.length > 1 ? "s" : ""} · {o.deliveryMode}
                </span>
                <ChevronRight className="h-4 w-4 text-[hsl(var(--ph-ink-soft))]" />
              </div>
             </button>
             {canReorder(o.status) && (
               <button
                 onClick={(e) => { e.stopPropagation(); onReorder(o); }}
                 className="mt-3 w-full h-10 rounded-xl bg-[hsl(var(--ph-purple)/0.1)] text-[hsl(var(--ph-purple))] font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition"
               >
                 <RotateCcw className="h-4 w-4" /> Recommander en 1 clic
               </button>
             )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const map: Record<OrderStatus, { label: string; cls: string }> = {
    pending_pharmacist: { label: "En attente", cls: "bg-amber-100 text-amber-700" },
    awaiting_client:    { label: "Confirmée",  cls: "bg-blue-100 text-blue-700" },
    accepted:           { label: "Payée · Retrait", cls: "bg-[hsl(var(--ph-purple)/0.15)] text-[hsl(var(--ph-purple))]" },
    ready:              { label: "Payée · À livrer", cls: "bg-teal-100 text-teal-700" },
    delivered:          { label: "Livrée",     cls: "bg-emerald-100 text-emerald-700" },
    cancelled:          { label: "Annulée",    cls: "bg-red-100 text-red-700" },
    expired:            { label: "Expirée",    cls: "bg-gray-200 text-gray-700" },
  };
  const m = map[status];
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${m.cls}`}>{m.label}</span>;
}

// ============================================================
// PHARMACIST AREA
// ============================================================

function PharmacistArea({ view, setView, orders, setOrders, medicines, setMedicines, pharmacyId, refreshMedicines, activeOrder, setActiveOrderId, getMed, requestPrescription }: {
  view: PharmView;
  setView: (v: PharmView) => void;
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  medicines: Medicine[];
  setMedicines: React.Dispatch<React.SetStateAction<Medicine[]>>;
  pharmacyId: string | null;
  refreshMedicines: () => Promise<void>;
  activeOrder: Order | null;
  setActiveOrderId: (id: string | null) => void;
  getMed: (id: string) => Medicine;
  requestPrescription: (id: string) => void;
}) {
  return (
    <>
      {view === "dashboard" && (
        <PharmacistDashboard
          orders={orders}
          getMed={getMed}
          onOpen={(o) => { setActiveOrderId(o.id); setView("order"); }}
          onGoCatalogue={() => setView("catalogue")}
          onMarkDelivered={(id) => {
            const o = orders.find((x) => x.id === id);
            setOrders((p) => p.map((x) => (x.id === id ? { ...x, status: "delivered" } : x)));
            sonner.success("Commande livrée ✓", {
              description: o ? `#${o.ref} marquée comme livrée.` : undefined,
              duration: 2500,
            });
          }}
        />
      )}
      {view === "order" && activeOrder && (
        <PharmacistOrderDetail
          order={activeOrder}
          getMed={getMed}
          onBack={() => setView("dashboard")}
          onRequestPrescription={() => requestPrescription(activeOrder.id)}
          onSubmit={(updated) => {
            setOrders((p) => p.map((o) => o.id === updated.id ? updated : o));
            setView("dashboard");
            if (updated.status === "cancelled") {
              sonner.error(`Commande #${updated.ref} annulée`, {
                description: "Aucun médicament disponible.",
                duration: 3000,
              });
            } else {
              sonner.success(`Réponse envoyée au client ✓`, {
                description: `Commande #${updated.ref} — en attente de paiement.`,
                duration: 3000,
              });
            }
          }}
        />
      )}
      {view === "catalogue" && (
        <PharmacistCatalogue
          medicines={medicines}
          setMedicines={setMedicines}
          pharmacyId={pharmacyId}
          refreshMedicines={refreshMedicines}
          onBack={() => setView("dashboard")}
        />
      )}
      {view === "stats" && (
        <PharmacistStats orders={orders} medicines={medicines} getMed={getMed} />
      )}
      {view === "hours" && (
        <PharmacistHours />
      )}
      <PharmTabBar view={view} setView={setView} nouvelles={orders.filter((o) => o.status === "pending_pharmacist").length} />
    </>
  );
}

function PharmTabBar({ view, setView, nouvelles }: { view: PharmView; setView: (v: PharmView) => void; nouvelles: number }) {
  const tabs = [
    { key: "dashboard" as PharmView, icon: ClipboardList, label: "Commandes", badge: nouvelles },
    { key: "stats" as PharmView, icon: BarChart3, label: "Stats" },
    { key: "catalogue" as PharmView, icon: Pill, label: "Catalogue" },
    { key: "hours" as PharmView, icon: CalendarClock, label: "Horaires" },
  ];
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[hsl(var(--ph-border))] safe-area-bottom">
      <div className="grid grid-cols-4">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = view === t.key || (t.key === "dashboard" && view === "order");
          return (
            <button key={t.key} onClick={() => setView(t.key)} className="relative flex flex-col items-center gap-1 py-2.5 active:scale-95 transition">
              <div className="relative">
                <Icon className={`h-5 w-5 ${active ? "text-[hsl(var(--ph-purple))]" : "text-[hsl(var(--ph-ink-soft))]"}`} />
                {t.badge && t.badge > 0 ? (
                  <span className="absolute -top-1.5 -right-2 h-4 min-w-[16px] px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">{t.badge}</span>
                ) : null}
              </div>
              <span className={`text-[10px] font-semibold ${active ? "text-[hsl(var(--ph-purple))]" : "text-[hsl(var(--ph-ink-soft))]"}`}>{t.label}</span>
              {active && <span className="absolute top-0 h-0.5 w-8 bg-[hsl(var(--ph-purple))] rounded-full" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// ---------- Pharm 1: Dashboard ----------
function PharmacistDashboard({ orders, getMed, onOpen, onGoCatalogue, onMarkDelivered }: {
  orders: Order[];
  getMed: (id: string) => Medicine;
  onOpen: (o: Order) => void;
  onGoCatalogue: () => void;
  onMarkDelivered: (id: string) => void;
}) {
  const [tab, setTab] = useState<"nouvelles" | "en_cours" | "terminees">("nouvelles");
  const nouvelles = orders.filter((o) => o.status === "pending_pharmacist");
  const enCours = orders.filter((o) => ["awaiting_client", "accepted", "ready"].includes(o.status));
  const terminees = orders.filter((o) => ["delivered", "cancelled", "expired"].includes(o.status));

  const gainToday = orders
    .filter((o) => ["accepted", "ready", "delivered"].includes(o.status))
    .reduce((s, o) => s + o.items.reduce((a, i) => a + (i.confirmedPrice || 0) * i.quantity, 0) + (o.deliveryFee || 0), 0);

  const list = tab === "nouvelles" ? nouvelles : tab === "en_cours" ? enCours : terminees;

  return (
    <div className="px-4 pt-4 pb-24">
      <div className="grid grid-cols-3 gap-2 mb-4">
        <StatCard label="Nouvelles" value={nouvelles.length.toString()} tone="purple" />
        <StatCard label="En cours" value={enCours.length.toString()} tone="amber" />
        <StatCard label="Aujourd'hui" value={formatGNF(gainToday)} tone="emerald" small />
      </div>

      <div className="flex gap-1.5 bg-[hsl(var(--ph-muted))] rounded-full p-1 mb-4">
        {(["nouvelles", "en_cours", "terminees"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`flex-1 h-9 rounded-full text-xs font-semibold transition ${
              tab === k ? "bg-white text-[hsl(var(--ph-deep))] shadow-sm" : "text-[hsl(var(--ph-ink-soft))]"
            }`}
          >
            {k === "nouvelles" ? "Nouvelles" : k === "en_cours" ? "En cours" : "Terminées"}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="text-center py-16 text-[hsl(var(--ph-ink-soft))] text-sm">Aucune commande</div>
      ) : (
        <div className="space-y-2.5">
          {list.map((o) => (
            <PharmOrderCard key={o.id} order={o} getMed={getMed} onOpen={() => onOpen(o)} onMarkDelivered={() => onMarkDelivered(o.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, tone, small }: { label: string; value: string; tone: "purple" | "amber" | "emerald"; small?: boolean }) {
  const bg = { purple: "bg-[hsl(var(--ph-purple)/0.1)] text-[hsl(var(--ph-purple))]", amber: "bg-amber-100 text-amber-700", emerald: "bg-emerald-100 text-emerald-700" }[tone];
  return (
    <div className="ph-card p-3">
      <p className="text-[10px] text-[hsl(var(--ph-ink-soft))] font-semibold uppercase tracking-wider">{label}</p>
      <p className={`ph-display font-bold mt-1 ${small ? "text-xs" : "text-lg"}`}>{value}</p>
      <div className={`h-1 w-6 rounded-full mt-1.5 ${bg.split(" ")[0]}`} />
    </div>
  );
}

function PharmOrderCard({ order, getMed, onOpen, onMarkDelivered }: { order: Order; getMed: (id: string) => Medicine; onOpen: () => void; onMarkDelivered: () => void }) {
  const isPaid = order.status === "accepted" || order.status === "ready";

  return (
    <div className="ph-card p-4 w-full text-left">
     <button onClick={onOpen} className="w-full text-left active:scale-[0.99] transition">
      <div className="flex items-center justify-between mb-1">
        <span className="ph-display font-bold text-sm">#{order.ref}</span>
        <StatusBadge status={order.status} />
      </div>
      <p className="text-sm font-semibold text-[hsl(var(--ph-ink))]">{order.clientName}</p>
      <p className="text-[11px] text-[hsl(var(--ph-ink-soft))]">{order.clientPhone}</p>
      <div className="mt-2 flex flex-wrap gap-1">
        {order.items.slice(0, 4).map((i) => (
          <span key={i.medicineId} className="text-[10px] bg-[hsl(var(--ph-muted))] px-2 py-0.5 rounded-full">
            {getMed(i.medicineId).emoji} {getMed(i.medicineId).name} ×{i.quantity}
          </span>
        ))}
      </div>
      <div className="flex items-center mt-3 text-[11px] text-[hsl(var(--ph-ink-soft))]">
        {order.deliveryMode === "livraison" ? "🛵 Livraison" : "🏪 Retrait"}
      </div>
     </button>
     {isPaid && (
       <div className="mt-3 pt-3 border-t border-[hsl(var(--ph-border))]">
         <div className="flex items-center gap-2 mb-2 bg-emerald-50 rounded-lg px-2.5 py-2">
           <span className="text-base">💳</span>
           <p className="text-[11px] font-semibold text-emerald-700 leading-tight">
             Payée — {order.deliveryMode === "livraison" ? "en attente de livraison" : "prête au retrait"}
           </p>
         </div>
         <button
           onClick={(e) => { e.stopPropagation(); onMarkDelivered(); }}
           className="w-full h-10 rounded-full bg-emerald-500 text-white text-xs font-bold active:scale-[0.98] transition"
         >
           ✓ Marquer comme {order.deliveryMode === "livraison" ? "livrée" : "retirée"}
         </button>
       </div>
     )}
    </div>
  );
}

// ---------- Pharm 2: Order Detail ----------
function PharmacistOrderDetail({ order, getMed, onBack, onSubmit, onRequestPrescription }: {
  order: Order;
  getMed: (id: string) => Medicine;
  onBack: () => void;
  onSubmit: (order: Order) => void;
  onRequestPrescription: () => void;
}) {
  const [items, setItems] = useState<OrderItem[]>(
    order.items.map((i) => {
      const m = getMed(i.medicineId);
      return {
        ...i,
        isAvailable: i.isAvailable ?? true,
        confirmedPrice: i.confirmedPrice ?? pharmacistPrice(m),
      };
    })
  );
  const [deliveryFee, setDeliveryFee] = useState<string>(order.deliveryFee?.toString() || "");

  const setItem = (id: string, patch: Partial<OrderItem>) =>
    setItems((p) => p.map((i) => i.medicineId === id ? { ...i, ...patch } : i));

  const availableItems = items.filter((i) => i.isAvailable);
  const subtotal = availableItems.reduce((s, i) => s + (Number(i.confirmedPrice) || 0) * i.quantity, 0);
  const total = subtotal + (Number(deliveryFee) || 0);
  const allUnavailable = availableItems.length === 0;
  const canSubmit = allUnavailable || availableItems.every((i) => Number(i.confirmedPrice) > 0);

  const handleSubmit = () => {
    onSubmit({
      ...order,
      items,
      deliveryFee: Number(deliveryFee) || 0,
      status: allUnavailable ? "cancelled" : "awaiting_client",
    });
  };

  return (
    <div className="px-4 pt-4 pb-40">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="h-9 w-9 rounded-full bg-white border border-[hsl(var(--ph-border))] flex items-center justify-center">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="ph-display font-bold text-xl">#{order.ref}</h1>
          <p className="text-xs text-[hsl(var(--ph-ink-soft))]">
            {order.deliveryMode === "livraison" ? "🛵 Livraison" : "🏪 Retrait"}
          </p>
        </div>
      </div>

      <div className="ph-card p-4 mb-4 flex items-center justify-between">
        <div>
          <p className="ph-display font-semibold text-sm">{order.clientName}</p>
          <p className="text-xs text-[hsl(var(--ph-ink-soft))] mt-0.5">{order.clientPhone}</p>
        </div>
        <a href={`tel:${order.clientPhone}`} className="h-11 w-11 rounded-full bg-emerald-500 text-white flex items-center justify-center active:scale-95">
          <Phone className="h-5 w-5" />
        </a>
      </div>

      {order.deliveryMode === "livraison" && (order.city || order.deliveryAddress) && (
        <div className="ph-card p-4 mb-4">
          <h3 className="ph-display font-semibold text-sm flex items-center gap-2 mb-2">
            <MapPin className="h-4 w-4 text-[hsl(var(--ph-purple))]" /> Livraison
          </h3>
          {order.city && <p className="text-xs font-semibold text-[hsl(var(--ph-ink))]">{order.city}</p>}
          {order.deliveryAddress && (
            <p className="text-xs text-[hsl(var(--ph-ink-soft))] mt-1 leading-relaxed">{order.deliveryAddress}</p>
          )}
        </div>
      )}

      {(() => {
        const needsRx = order.items.some((i) => getMed(i.medicineId).prescription);
        if (order.prescriptionUrl) {
          return (
            <div className="ph-card p-4 mb-4">
              <h3 className="ph-display font-semibold text-sm flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-amber-600" /> Ordonnance reçue
              </h3>
              <a
                href={order.prescriptionUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-xl overflow-hidden border border-[hsl(var(--ph-border))]"
              >
                <img src={order.prescriptionUrl} alt="Ordonnance" className="w-full max-h-64 object-contain bg-[hsl(var(--ph-muted))]" />
              </a>
              <p className="text-[11px] text-[hsl(var(--ph-ink-soft))] mt-2">Toucher pour agrandir</p>
            </div>
          );
        }
        if (!needsRx) return null;
        return (
          <div className="ph-card p-4 mb-4 border border-amber-200 bg-amber-50">
            <h3 className="ph-display font-semibold text-sm flex items-center gap-2 text-amber-900">
              <AlertCircle className="h-4 w-4 text-amber-600" /> Ordonnance nécessaire
            </h3>
            <p className="text-[11px] text-amber-800 mt-1 leading-relaxed">
              Certains produits nécessitent une ordonnance. Demandez au client de l'envoyer.
            </p>
            {order.prescriptionRequested ? (
              <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-amber-900">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Ordonnance demandée — en attente du client
              </div>
            ) : (
              <button
                onClick={onRequestPrescription}
                className="mt-3 w-full h-10 rounded-xl bg-amber-500 text-white font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition"
              >
                <Upload className="h-4 w-4" /> Demander l'ordonnance au client
              </button>
            )}
          </div>
        );
      })()}

      <h3 className="ph-display font-semibold text-sm mb-2">Médicaments</h3>
      <div className="space-y-2.5">
        {items.map((item) => {
          const m = getMed(item.medicineId);
          return (
            <div key={item.medicineId} className={`ph-card p-3 ${!item.isAvailable ? "opacity-70" : ""}`}>
              <div className="flex items-start gap-3">
                <div className="h-12 w-12 rounded-xl bg-[hsl(var(--ph-purple)/0.08)] flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {m.image ? <img src={m.image} alt={m.name} loading="lazy" width={512} height={512} className="h-full w-full object-contain p-0.5" /> : <span className="text-2xl">{m.emoji}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="ph-display font-semibold text-sm">{m.name}</h4>
                  <p className="text-[11px] text-[hsl(var(--ph-ink-soft))]">{m.dosage} · × {item.quantity}</p>
                  <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-semibold text-[hsl(var(--ph-ink-soft))]">
                      Catalogue : <span className="text-[hsl(var(--ph-purple))]">{formatGNF(pharmacistPrice(m))}</span>
                    </span>
                    {m.prescription && <PrescriptionBadge small />}
                  </div>
                </div>
                <button
                  onClick={() => setItem(item.medicineId, { isAvailable: !item.isAvailable, confirmedPrice: !item.isAvailable ? item.confirmedPrice : null })}
                  className={`h-8 px-3 rounded-full text-[11px] font-bold flex items-center gap-1 ${
                    item.isAvailable ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                  }`}
                >
                  {item.isAvailable ? <><Check className="h-3 w-3" /> Dispo</> : <><X className="h-3 w-3" /> Indispo</>}
                </button>
              </div>
              {item.isAvailable && (
                <div className="mt-3 flex items-center gap-2">
                  <label className="text-xs text-[hsl(var(--ph-ink-soft))] flex-shrink-0">Prix unitaire</label>
                  <div className="flex-1 relative">
                    <input
                      type="number"
                      inputMode="numeric"
                      value={item.confirmedPrice ?? ""}
                      onChange={(e) => setItem(item.medicineId, { confirmedPrice: e.target.value ? Number(e.target.value) : null })}
                      placeholder="0"
                      className="w-full h-10 px-3 pr-14 rounded-xl bg-[hsl(var(--ph-muted))] text-sm font-semibold outline-none focus:ring-2 focus:ring-[hsl(var(--ph-purple))]"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[hsl(var(--ph-ink-soft))]">GNF</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!allUnavailable && (
        <div className="ph-card p-4 mt-4">
          <label className="text-sm font-semibold flex items-center gap-2">
            🛵 Frais de transport {order.deliveryMode === "retrait" && <span className="text-[10px] font-medium text-[hsl(var(--ph-ink-soft))]">(optionnel)</span>}
          </label>
          <div className="relative mt-2">
            <input
              type="number"
              inputMode="numeric"
              value={deliveryFee}
              onChange={(e) => setDeliveryFee(e.target.value)}
              placeholder="0"
              className="w-full h-11 px-3 pr-14 rounded-xl bg-[hsl(var(--ph-muted))] text-sm font-semibold outline-none focus:ring-2 focus:ring-[hsl(var(--ph-purple))]"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[hsl(var(--ph-ink-soft))]">GNF</span>
          </div>
        </div>
      )}

      {!allUnavailable && (
        <div className="ph-card p-4 mt-4 space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-[hsl(var(--ph-ink-soft))]">Sous-total</span>
            <span className="font-semibold">{formatGNF(subtotal)}</span>
          </div>
          {(Number(deliveryFee) || 0) > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-[hsl(var(--ph-ink-soft))]">Transport</span>
              <span className="font-semibold">{formatGNF(Number(deliveryFee) || 0)}</span>
            </div>
          )}
          <div className="border-t border-[hsl(var(--ph-border))] pt-2 flex justify-between items-center">
            <span className="ph-display font-bold">Total</span>
            <span className="ph-display font-bold text-lg text-[hsl(var(--ph-purple))]">{formatGNF(total)}</span>
          </div>
          <div className="mt-2 pt-2 border-t border-dashed border-[hsl(var(--ph-border))] space-y-1">
            <div className="flex justify-between text-[11px] text-[hsl(var(--ph-ink-soft))]">
              <span>Commission Galimo</span>
              <span className="font-semibold">−{formatGNF(galimoCommission(subtotal))}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-emerald-700">Net pharmacie</span>
              <span className="font-bold text-emerald-700">{formatGNF(pharmacyNet(subtotal) + (Number(deliveryFee) || 0))}</span>
            </div>
            <p className="text-[10px] text-[hsl(var(--ph-ink-soft))] leading-tight pt-0.5">
              Le transport (livreur) n'est pas soumis à commission.
            </p>
          </div>
        </div>
      )}

      <div className="mt-4">
        <button
          onClick={() => printOrderTicket(order, getMed)}
          className="w-full h-11 rounded-xl bg-white border border-[hsl(var(--ph-border))] text-sm font-semibold flex items-center justify-center gap-2 text-[hsl(var(--ph-deep))] active:scale-[0.99]"
        >
          <Printer className="h-4 w-4" /> Imprimer / exporter le ticket (PDF)
        </button>
      </div>

      <div className="fixed bottom-16 left-4 right-4 z-30">
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={`w-full h-12 rounded-full font-semibold text-sm flex items-center justify-center gap-2 active:scale-95 transition ${
            allUnavailable ? "bg-red-500 text-white" : "ph-btn-primary"
          }`}
        >
          {allUnavailable ? <><X className="h-4 w-4" /> Annuler la commande</> : <><Check className="h-4 w-4" /> Envoyer au client</>}
        </button>
      </div>
    </div>
  );
}

// ---------- Pharm 3: Catalogue ----------
function PharmacistCatalogue({ medicines, setMedicines, pharmacyId, refreshMedicines, onBack }: {
  medicines: Medicine[];
  setMedicines: React.Dispatch<React.SetStateAction<Medicine[]>>;
  pharmacyId: string | null;
  refreshMedicines: () => Promise<void>;
  onBack: () => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Medicine | null>(null);
  const grouped = useMemo(() => {
    const g: Record<string, Medicine[]> = {};
    CATEGORIES.filter((c) => c.id !== "all").forEach((c) => {
      g[c.id] = medicines.filter((m) => m.category === c.id);
    });
    return g;
  }, [medicines]);

  const cycleStock = async (id: string) => {
    const cycle: StockLevel[] = ["high", "medium", "low", "out"];
    const current = medicines.find((m) => m.id === id);
    if (!current) return;
    const idx = cycle.indexOf(current.stock);
    const nextStock = cycle[(idx + 1) % cycle.length];
    setMedicines((p) => p.map((m) => (m.id === id ? { ...m, stock: nextStock } : m)));
    try {
      await api(`/medicines/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ inStock: nextStock !== "out" }),
      });
    } catch (err) {
      sonner.error("Stock non enregistré", { description: (err as Error).message });
    }
  };

  return (
    <div className="px-4 pt-4 pb-24">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="h-9 w-9 rounded-full bg-white border border-[hsl(var(--ph-border))] flex items-center justify-center">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="ph-display font-bold text-xl">Catalogue</h1>
      </div>

      <div className="space-y-5">
        {CATEGORIES.filter((c) => c.id !== "all").map((c) => (
          <div key={c.id}>
            <h3 className="ph-display font-bold text-sm text-[hsl(var(--ph-ink))] mb-2 flex items-center gap-2">
              <span>{c.emoji}</span>{c.label}
              <span className="text-[10px] font-normal text-[hsl(var(--ph-ink-soft))]">({grouped[c.id]?.length || 0})</span>
            </h3>
            <div className="space-y-2">
              {grouped[c.id]?.map((m) => (
                <div key={m.id} className="ph-card p-3 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-[hsl(var(--ph-purple)/0.08)] flex items-center justify-center overflow-hidden">
                    {m.image ? <img src={m.image} alt={m.name} loading="lazy" width={512} height={512} className="h-full w-full object-contain p-0.5" /> : <span className="text-xl">{m.emoji}</span>}
                  </div>
                  <button onClick={() => cycleStock(m.id)} className="flex-shrink-0" title="Changer stock">
                    <span className={`block h-3 w-3 rounded-full ${STOCK_COLORS[m.stock]}`} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <h4 className="ph-display font-semibold text-sm line-clamp-1">{m.name}</h4>
                    <p className="text-[11px] text-[hsl(var(--ph-ink-soft))] line-clamp-1">{m.dosage}</p>
                    <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-bold text-[hsl(var(--ph-purple))]">
                        {formatGNF(pharmacistPrice(m))}
                      </span>
                      {m.prescription && <PrescriptionBadge small />}
                    </div>
                  </div>
                  <button
                    onClick={() => setEditing(m)}
                    className="h-8 w-8 rounded-full bg-[hsl(var(--ph-muted))] flex items-center justify-center"
                    aria-label="Éditer"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => setShowAdd(true)}
        className="ph-btn-primary fixed bottom-20 right-4 h-14 w-14 rounded-full flex items-center justify-center shadow-2xl z-30"
        aria-label="Ajouter"
      >
        <Plus className="h-6 w-6" />
      </button>

      {(showAdd || editing) && pharmacyId && (
        <MedicineFormModal
          initial={editing}
          onClose={() => { setShowAdd(false); setEditing(null); }}
          onSave={async (m) => {
            try {
              if (editing) {
                await api(`/medicines/${editing.id}`, {
                  method: "PATCH",
                  body: JSON.stringify(demoMedicineToApiBody(m, pharmacyId)),
                });
                sonner.success("Médicament modifié", { description: m.name, duration: 2000 });
              } else {
                await api("/medicines", {
                  method: "POST",
                  body: JSON.stringify(demoMedicineToApiBody(m, pharmacyId)),
                });
                sonner.success("Médicament ajouté ✓", { description: m.name, duration: 2000 });
              }
              await refreshMedicines();
              setShowAdd(false); setEditing(null);
            } catch (err) {
              sonner.error("Échec de l'enregistrement", { description: (err as Error).message });
            }
          }}
          onDelete={editing ? async () => {
            try {
              await api(`/medicines/${editing.id}`, {
                method: "PATCH",
                body: JSON.stringify({ isActive: false }),
              });
              sonner.error("Médicament supprimé", { description: editing.name, duration: 2000 });
              await refreshMedicines();
              setEditing(null);
            } catch (err) {
              sonner.error("Échec de la suppression", { description: (err as Error).message });
            }
          } : undefined}
        />
      )}
    </div>
  );
}

// ---------- Add/Edit Medicine Modal ----------
function MedicineFormModal({ initial, onClose, onSave, onDelete }: {
  initial: Medicine | null;
  onClose: () => void;
  onSave: (m: Medicine) => void;
  onDelete?: () => void;
}) {
  const cats = CATEGORIES.filter((c) => c.id !== "all") as { id: Exclude<Category, "all">; label: string; emoji: string }[];
  const [name, setName] = useState(initial?.name || "");
  const [dosage, setDosage] = useState(initial?.dosage || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [category, setCategory] = useState<Exclude<Category, "all">>(initial?.category || "fievre");
  const [emoji, setEmoji] = useState(initial?.emoji || "💊");
  const [prescription, setPrescription] = useState(initial?.prescription || false);
  const [onOrder, setOnOrder] = useState(initial?.onOrder || false);
  const [stock, setStock] = useState<StockLevel>(initial?.stock || "high");
  const [image, setImage] = useState<string | undefined>(initial?.image);
  const [price, setPrice] = useState<string>(
    initial?.price != null ? String(initial.price) : ""
  );
  const [processing, setProcessing] = useState(false);
  const [scanning, setScanning] = useState(false);

  const scanFromImage = async (dataUrl: string) => {
    setScanning(true);
    try {
      const data = await api<any>("/scan-medicine", {
        method: "POST",
        body: JSON.stringify({ image: dataUrl }),
      });
      if (!data || data.error) {
        sonner.error("Scan impossible", { description: data?.error || "Réessaie avec une photo plus nette" });
        return;
      }
      if (data.name) setName(data.name);
      if (data.dosage) setDosage(data.dosage);
      if (data.description) setDescription(data.description);
      if (data.emoji) setEmoji(data.emoji);
      if (typeof data.prescription === "boolean") setPrescription(data.prescription);
      const validCats = ["fievre","antibio","vitamines","cardio","soins","bebe"];
      if (data.category && validCats.includes(data.category)) {
        setCategory(data.category);
      }
      sonner.success("Boîte scannée ✨", { description: "Vérifie les infos avant d'enregistrer" });
    } catch (err: any) {
      console.error(err);
      sonner.error("Erreur de scan", { description: err?.message || "Réessaie" });
    } finally {
      setScanning(false);
    }
  };

  const handleScanFile = async (file: File) => {
    const reader = new FileReader();
    reader.onload = () => scanFromImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handlePickImage = async (file: File) => {
    if (!file) return;
    setProcessing(true);
    try {
      const { removeBackground } = await import("@imgly/background-removal");
      const blob = await removeBackground(file, { output: { format: "image/png", quality: 0.9 } });
      const reader = new FileReader();
      reader.onload = () => setImage(reader.result as string);
      reader.readAsDataURL(blob);
      sonner.success("Image traitée", { description: "Fond retiré avec succès" });
    } catch (err) {
      console.error(err);
      // fallback: keep original image if bg removal fails
      const reader = new FileReader();
      reader.onload = () => setImage(reader.result as string);
      reader.readAsDataURL(file);
      sonner.error("Fond non retiré", { description: "Image ajoutée telle quelle" });
    } finally {
      setProcessing(false);
    }
  };

  const canSave = name.trim().length > 0 && dosage.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      id: initial?.id || `m-${Date.now()}`,
      emoji: emoji || "💊",
      image,
      name: name.trim(),
      dosage: dosage.trim(),
      description: description.trim() || "—",
      category,
      prescription,
      onOrder,
      stock,
      price: Number(price) > 0 ? Number(price) : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white flex items-center justify-between px-5 pt-4 pb-3 border-b border-[hsl(var(--ph-border))]">
          <h2 className="ph-display font-bold text-lg">{initial ? "Modifier" : "Nouveau médicament"}</h2>
          <button onClick={onClose} className="h-9 w-9 rounded-full bg-[hsl(var(--ph-muted))] flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <label className={`flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-r from-[hsl(var(--ph-purple))] to-[hsl(var(--ph-purple-dark,var(--ph-purple)))] text-white cursor-pointer active:scale-[0.98] transition ${scanning ? "opacity-70 pointer-events-none" : ""}`}>
            <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
              {scanning ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold">{scanning ? "Analyse en cours…" : "Scanner la boîte 📸"}</p>
              <p className="text-[11px] opacity-90">Auto-remplit nom, dosage, catégorie…</p>
            </div>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleScanFile(f);
                e.target.value = "";
              }}
            />
          </label>

          <div>
            <label className="text-xs font-semibold text-[hsl(var(--ph-ink-soft))]">Photo du produit</label>
            <div className="mt-2 flex items-center gap-3">
              <div className="h-24 w-24 rounded-2xl bg-[hsl(var(--ph-muted))] flex items-center justify-center overflow-hidden flex-shrink-0 relative">
                {processing ? (
                  <Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--ph-purple))]" />
                ) : image ? (
                  <img src={image} alt="Aperçu" className="h-full w-full object-contain p-1" />
                ) : (
                  <span className="text-3xl opacity-40">📷</span>
                )}
              </div>
              <div className="flex-1 space-y-1.5">
                <label className={`h-11 rounded-xl bg-[hsl(var(--ph-purple)/0.08)] text-[hsl(var(--ph-purple))] font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${processing ? "opacity-60 pointer-events-none" : ""}`}>
                  <Upload className="h-4 w-4" />
                  {image ? "Changer la photo" : "Choisir une photo"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handlePickImage(f);
                      e.target.value = "";
                    }}
                  />
                </label>
                {image && !processing && (
                  <button
                    onClick={() => setImage(undefined)}
                    className="w-full h-9 rounded-xl bg-red-50 text-red-600 font-semibold text-xs flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Retirer
                  </button>
                )}
                <p className="text-[10px] text-[hsl(var(--ph-ink-soft))] leading-tight">
                  Le fond de l'image sera automatiquement retiré pour un rendu uniforme.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-16 w-16 rounded-2xl bg-[hsl(var(--ph-purple)/0.08)] flex items-center justify-center text-3xl flex-shrink-0">
              {emoji || "💊"}
            </div>
            <div className="flex-1">
              <label className="text-xs font-semibold text-[hsl(var(--ph-ink-soft))]">Emoji</label>
              <input
                value={emoji}
                onChange={(e) => setEmoji(e.target.value)}
                maxLength={4}
                placeholder="💊"
                className="w-full h-11 mt-1 px-3 rounded-xl bg-[hsl(var(--ph-muted))] text-sm font-semibold outline-none focus:ring-2 focus:ring-[hsl(var(--ph-purple))]"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-[hsl(var(--ph-ink-soft))]">Nom *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex : Doliprane"
              className="w-full h-11 mt-1 px-3 rounded-xl bg-[hsl(var(--ph-muted))] text-sm font-semibold outline-none focus:ring-2 focus:ring-[hsl(var(--ph-purple))]"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[hsl(var(--ph-ink-soft))]">Dosage / format *</label>
            <input
              value={dosage}
              onChange={(e) => setDosage(e.target.value)}
              placeholder="Ex : 500 mg — 16 cp"
              className="w-full h-11 mt-1 px-3 rounded-xl bg-[hsl(var(--ph-muted))] text-sm font-semibold outline-none focus:ring-2 focus:ring-[hsl(var(--ph-purple))]"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[hsl(var(--ph-ink-soft))] flex items-center gap-1.5">
              Prix catalogue (GNF)
              <span className="text-[10px] font-medium text-[hsl(var(--ph-purple))] bg-[hsl(var(--ph-purple)/0.1)] px-1.5 py-0.5 rounded-full">
                🔒 Pharmacien uniquement
              </span>
            </label>
            <div className="relative mt-1">
              <input
                type="number"
                inputMode="numeric"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Ex : 15 000"
                className="w-full h-11 pl-3 pr-14 rounded-xl bg-[hsl(var(--ph-muted))] text-sm font-semibold outline-none focus:ring-2 focus:ring-[hsl(var(--ph-purple))]"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[hsl(var(--ph-ink-soft))]">GNF</span>
            </div>
            <p className="text-[10px] text-[hsl(var(--ph-ink-soft))] mt-1">
              Pré-remplira automatiquement le prix des commandes. Jamais visible côté client.
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold text-[hsl(var(--ph-ink-soft))]">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Utilisation, indications…"
              className="w-full mt-1 p-3 rounded-xl bg-[hsl(var(--ph-muted))] text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--ph-purple))] resize-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[hsl(var(--ph-ink-soft))]">Catégorie</label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {cats.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCategory(c.id)}
                  className={`h-16 rounded-xl border-2 flex flex-col items-center justify-center gap-0.5 transition ${
                    category === c.id ? "border-[hsl(var(--ph-purple))] bg-[hsl(var(--ph-purple)/0.08)]" : "border-transparent bg-[hsl(var(--ph-muted))]"
                  }`}
                >
                  <span className="text-lg">{c.emoji}</span>
                  <span className="text-[10px] font-semibold">{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-[hsl(var(--ph-ink-soft))]">Stock</label>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {(["high","medium","low","out"] as StockLevel[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setStock(s)}
                  className={`h-11 rounded-xl border-2 flex items-center justify-center gap-1.5 transition ${
                    stock === s ? "border-[hsl(var(--ph-purple))] bg-[hsl(var(--ph-purple)/0.08)]" : "border-transparent bg-[hsl(var(--ph-muted))]"
                  }`}
                >
                  <span className={`h-2.5 w-2.5 rounded-full ${STOCK_COLORS[s]}`} />
                  <span className="text-[10px] font-bold uppercase">{s === "high" ? "Bon" : s === "medium" ? "Moy." : s === "low" ? "Bas" : "Rupt."}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center justify-between p-3 rounded-xl bg-[hsl(var(--ph-muted))] cursor-pointer">
              <span className="text-sm font-semibold">Ordonnance requise</span>
              <input type="checkbox" checked={prescription} onChange={(e) => setPrescription(e.target.checked)} className="h-5 w-5 accent-[hsl(var(--ph-purple))]" />
            </label>
            <label className="flex items-center justify-between p-3 rounded-xl bg-[hsl(var(--ph-muted))] cursor-pointer">
              <span className="text-sm font-semibold">Sur commande</span>
              <input type="checkbox" checked={onOrder} onChange={(e) => setOnOrder(e.target.checked)} className="h-5 w-5 accent-[hsl(var(--ph-purple))]" />
            </label>
          </div>

          <div className="flex gap-2 pt-2">
            {onDelete && (
              <button
                onClick={onDelete}
                className="h-12 px-4 rounded-full bg-red-100 text-red-700 font-semibold text-sm flex items-center justify-center gap-1.5 active:scale-95"
              >
                <Trash2 className="h-4 w-4" /> Suppr.
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={!canSave}
              className={`flex-1 h-12 rounded-full font-bold text-sm flex items-center justify-center gap-2 ${
                canSave ? "ph-btn-primary" : "bg-[hsl(var(--ph-muted))] text-[hsl(var(--ph-ink-soft))]"
              }`}
            >
              <Check className="h-4 w-4" /> {initial ? "Enregistrer" : "Ajouter au catalogue"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PDF TICKET
// ============================================================

function printOrderTicket(order: Order, getMed: (id: string) => Medicine) {
  const doc = new jsPDF({ unit: "mm", format: [80, 297] });
  let y = 8;
  const line = (txt: string, opts?: { bold?: boolean; size?: number; align?: "left" | "center" | "right" }) => {
    doc.setFont("helvetica", opts?.bold ? "bold" : "normal");
    doc.setFontSize(opts?.size ?? 9);
    const x = opts?.align === "center" ? 40 : opts?.align === "right" ? 74 : 6;
    doc.text(txt, x, y, { align: opts?.align ?? "left" });
    y += (opts?.size ?? 9) * 0.45 + 1.5;
  };
  const hr = () => { doc.setLineDashPattern([1, 1], 0); doc.line(6, y, 74, y); y += 2.5; };

  line("PHARMACIE LAMBANGNI", { bold: true, size: 12, align: "center" });
  line("Conakry — Guinee", { size: 8, align: "center" });
  y += 1;
  hr();
  line(`Commande  #${order.ref}`, { bold: true, size: 10 });
  line(`Date      ${new Date(order.createdAt).toLocaleString("fr-FR")}`, { size: 8 });
  line(`Mode      ${order.deliveryMode === "livraison" ? "Livraison" : "Retrait"}`, { size: 8 });
  hr();
  line("CLIENT", { bold: true, size: 9 });
  line(order.clientName, { size: 8 });
  line(order.clientPhone, { size: 8 });
  if (order.deliveryMode === "livraison" && (order.city || order.deliveryAddress)) {
    if (order.city) line(order.city, { size: 8 });
    if (order.deliveryAddress) {
      const wrapped = doc.splitTextToSize(order.deliveryAddress, 68) as string[];
      wrapped.forEach((l) => line(l, { size: 8 }));
    }
  }
  hr();
  line("ARTICLES", { bold: true, size: 9 });
  let subtotal = 0;
  order.items.forEach((it) => {
    const m = getMed(it.medicineId);
    const price = it.confirmedPrice ?? 0;
    const lineTotal = it.isAvailable === false ? 0 : price * it.quantity;
    subtotal += lineTotal;
    const name = `${m.name} ${m.dosage}`;
    const nameLines = doc.splitTextToSize(name, 52) as string[];
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(nameLines, 6, y);
    doc.text(`x${it.quantity}`, 55, y);
    doc.text(
      it.isAvailable === false ? "INDISPO" : `${lineTotal.toLocaleString("fr-FR")}`,
      74,
      y,
      { align: "right" }
    );
    y += nameLines.length * 3.5 + 1;
  });
  hr();
  const totalWithFee = subtotal + (order.deliveryFee || 0);
  line(`Sous-total     ${subtotal.toLocaleString("fr-FR")} GNF`, { size: 9, align: "right" });
  if (order.deliveryFee && order.deliveryFee > 0) {
    line(`Transport      ${order.deliveryFee.toLocaleString("fr-FR")} GNF`, { size: 9, align: "right" });
  }
  line(`TOTAL          ${totalWithFee.toLocaleString("fr-FR")} GNF`, { bold: true, size: 11, align: "right" });
  hr();
  const commission = galimoCommission(subtotal);
  const net = pharmacyNet(subtotal) + (order.deliveryFee || 0);
  line(`Commission Galimo  -${commission.toLocaleString("fr-FR")} GNF`, { size: 8, align: "right" });
  line(`NET PHARMACIE  ${net.toLocaleString("fr-FR")} GNF`, { bold: true, size: 10, align: "right" });
  hr();
  y += 2;
  line("Merci de votre confiance", { size: 8, align: "center" });
  line("Galimo Pharmacie", { size: 8, align: "center" });

  // Open in a new tab so user can print or save
  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
  sonner.success("Ticket PDF généré", { description: `#${order.ref}`, duration: 2000 });
}

// ============================================================
// PHARMACIST STATS
// ============================================================

function PharmacistStats({ orders, medicines, getMed }: {
  orders: Order[];
  medicines: Medicine[];
  getMed: (id: string) => Medicine;
}) {
  const stats = useMemo(() => {
    const paidStatuses: OrderStatus[] = ["accepted", "ready", "delivered"];
    const now = Date.now();
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(startOfDay);
    const day = (startOfWeek.getDay() + 6) % 7; // Monday=0
    startOfWeek.setDate(startOfWeek.getDate() - day);
    const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);

    const orderSubtotal = (o: Order) =>
      o.items.reduce((s, i) => s + (i.isAvailable === false ? 0 : (i.confirmedPrice || 0) * i.quantity), 0);
    const orderTotal = (o: Order) => orderSubtotal(o) + (o.deliveryFee || 0);

    const paid = orders.filter((o) => paidStatuses.includes(o.status));
    const caDay = paid.filter((o) => o.createdAt >= startOfDay.getTime()).reduce((s, o) => s + orderTotal(o), 0);
    const caWeek = paid.filter((o) => o.createdAt >= startOfWeek.getTime()).reduce((s, o) => s + orderTotal(o), 0);
    const caMonth = paid.filter((o) => o.createdAt >= startOfMonth.getTime()).reduce((s, o) => s + orderTotal(o), 0);

    const subDay = paid.filter((o) => o.createdAt >= startOfDay.getTime()).reduce((s, o) => s + orderSubtotal(o), 0);
    const subWeek = paid.filter((o) => o.createdAt >= startOfWeek.getTime()).reduce((s, o) => s + orderSubtotal(o), 0);
    const subMonth = paid.filter((o) => o.createdAt >= startOfMonth.getTime()).reduce((s, o) => s + orderSubtotal(o), 0);

    // Top products (sold qty on paid orders)
    const soldMap = new Map<string, number>();
    paid.forEach((o) => o.items.forEach((i) => {
      if (i.isAvailable === false) return;
      soldMap.set(i.medicineId, (soldMap.get(i.medicineId) || 0) + i.quantity);
    }));
    const topProducts = Array.from(soldMap.entries())
      .map(([id, qty]) => ({ med: getMed(id), qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    // Ruptures fréquentes : items marqués indispo par le pharmacien
    const ruptureMap = new Map<string, number>();
    orders.forEach((o) => o.items.forEach((i) => {
      if (i.isAvailable === false) ruptureMap.set(i.medicineId, (ruptureMap.get(i.medicineId) || 0) + 1);
    }));
    // Ajoute aussi les produits avec stock=0 dans le catalogue
    medicines.filter((m) => m.stock === "out").forEach((m) => {
      if (!ruptureMap.has(m.id)) ruptureMap.set(m.id, 0);
    });
    const topRuptures = Array.from(ruptureMap.entries())
      .map(([id, count]) => ({ med: getMed(id), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const ordersCount = {
      day: paid.filter((o) => o.createdAt >= startOfDay.getTime()).length,
      week: paid.filter((o) => o.createdAt >= startOfWeek.getTime()).length,
      month: paid.filter((o) => o.createdAt >= startOfMonth.getTime()).length,
    };

    return {
      caDay, caWeek, caMonth,
      netDay: caDay - galimoCommission(subDay),
      netWeek: caWeek - galimoCommission(subWeek),
      netMonth: caMonth - galimoCommission(subMonth),
      topProducts, topRuptures, ordersCount, now,
    };
  }, [orders, medicines, getMed]);

  return (
    <div className="px-4 pt-4 pb-24">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-9 w-9 rounded-full bg-[hsl(var(--ph-purple)/0.1)] flex items-center justify-center">
          <BarChart3 className="h-4 w-4 text-[hsl(var(--ph-purple))]" />
        </div>
        <h1 className="ph-display font-bold text-xl">Statistiques</h1>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <RevenueCard label="Aujourd'hui" value={stats.caDay} count={stats.ordersCount.day} tone="purple" />
        <RevenueCard label="Cette semaine" value={stats.caWeek} count={stats.ordersCount.week} tone="emerald" />
        <RevenueCard label="Ce mois" value={stats.caMonth} count={stats.ordersCount.month} tone="amber" />
      </div>

      <div className="ph-card p-4 mb-4">
        <h2 className="ph-display font-semibold text-sm flex items-center gap-2 mb-3">
          <TrendingUp className="h-4 w-4 text-emerald-600" /> Revenu pharmacie
        </h2>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { label: "Jour", net: stats.netDay },
            { label: "Semaine", net: stats.netWeek },
            { label: "Mois", net: stats.netMonth },
          ].map((c) => (
            <div key={c.label} className="rounded-xl bg-[hsl(var(--ph-muted))] p-2">
              <p className="text-[10px] font-semibold text-[hsl(var(--ph-ink-soft))] uppercase tracking-wide">{c.label}</p>
              <p className="text-sm font-bold text-emerald-700 mt-1">{c.net.toLocaleString("fr-FR")}</p>
              <p className="text-[10px] text-[hsl(var(--ph-ink-soft))] mt-1">GNF</p>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-[hsl(var(--ph-ink-soft))] mt-2 leading-tight">
          Revenu net reversé à la pharmacie après déduction de la commission Galimo.
        </p>
      </div>

      <div className="ph-card p-4 mb-4">
        <h2 className="ph-display font-semibold text-sm flex items-center gap-2 mb-3">
          <TrendingUp className="h-4 w-4 text-emerald-600" /> Top produits vendus
        </h2>
        {stats.topProducts.length === 0 ? (
          <p className="text-xs text-[hsl(var(--ph-ink-soft))]">Aucune vente enregistrée.</p>
        ) : (
          <div className="space-y-2">
            {stats.topProducts.map((p, idx) => {
              const max = stats.topProducts[0].qty;
              const pct = Math.round((p.qty / max) * 100);
              return (
                <div key={p.med.id}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold flex items-center gap-1.5">
                      <span className="text-[hsl(var(--ph-ink-soft))]">#{idx + 1}</span>
                      {p.med.name}
                    </span>
                    <span className="font-bold text-[hsl(var(--ph-purple))]">{p.qty} unités</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[hsl(var(--ph-muted))] overflow-hidden">
                    <div className="h-full bg-[hsl(var(--ph-purple))]" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="ph-card p-4">
        <h2 className="ph-display font-semibold text-sm flex items-center gap-2 mb-3">
          <AlertTriangle className="h-4 w-4 text-red-600" /> Ruptures fréquentes
        </h2>
        {stats.topRuptures.length === 0 ? (
          <p className="text-xs text-[hsl(var(--ph-ink-soft))]">Aucune rupture signalée. 👍</p>
        ) : (
          <div className="space-y-2">
            {stats.topRuptures.map((r) => (
              <div key={r.med.id} className="flex items-center justify-between bg-red-50 rounded-lg px-3 py-2">
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate">{r.med.name}</p>
                  <p className="text-[10px] text-[hsl(var(--ph-ink-soft))]">Stock : {r.med.stock === "out" ? "rupture" : r.med.stock}</p>
                </div>
                <span className="text-[10px] font-bold text-red-700 bg-white rounded-full px-2 py-0.5">
                  {r.count === 0 ? "Stock 0" : `${r.count}× indispo`}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RevenueCard({ label, value, count, tone }: { label: string; value: number; count: number; tone: "purple" | "amber" | "emerald" }) {
  const bg = { purple: "bg-[hsl(var(--ph-purple))]", amber: "bg-amber-500", emerald: "bg-emerald-500" }[tone];
  return (
    <div className="ph-card p-3">
      <p className="text-[10px] text-[hsl(var(--ph-ink-soft))] font-semibold uppercase tracking-wider">{label}</p>
      <p className="ph-display font-bold text-sm mt-1 leading-tight">{formatGNF(value)}</p>
      <p className="text-[10px] text-[hsl(var(--ph-ink-soft))] mt-0.5">{count} commande{count > 1 ? "s" : ""}</p>
      <div className={`h-1 w-6 rounded-full mt-1.5 ${bg}`} />
    </div>
  );
}

// ============================================================
// PHARMACIST HOURS
// ============================================================

type DaySchedule = { open: boolean; from: string; to: string };
const DAY_LABELS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const DEFAULT_SCHEDULE: DaySchedule[] = [
  { open: true, from: "08:00", to: "20:00" },
  { open: true, from: "08:00", to: "20:00" },
  { open: true, from: "08:00", to: "20:00" },
  { open: true, from: "08:00", to: "20:00" },
  { open: true, from: "08:00", to: "20:00" },
  { open: true, from: "09:00", to: "18:00" },
  { open: false, from: "10:00", to: "13:00" },
];
const HOURS_STORAGE_KEY = "pharmacy-hours-v1";

function loadSchedule(): DaySchedule[] {
  try {
    const raw = localStorage.getItem(HOURS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length === 7) return parsed;
    }
  } catch {}
  return DEFAULT_SCHEDULE;
}

export function isPharmacyOpen(schedule: DaySchedule[], now = new Date()): { open: boolean; label: string } {
  const dayIdx = (now.getDay() + 6) % 7; // Monday=0
  const today = schedule[dayIdx];
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const toMin = (s: string) => {
    const [h, m] = s.split(":").map(Number);
    return h * 60 + m;
  };
  if (today.open && nowMin >= toMin(today.from) && nowMin < toMin(today.to)) {
    return { open: true, label: `Ouvert jusqu'à ${today.to}` };
  }
  // Find next opening
  for (let i = 0; i < 7; i++) {
    const idx = (dayIdx + i) % 7;
    const d = schedule[idx];
    if (!d.open) continue;
    if (i === 0 && nowMin < toMin(d.from)) {
      return { open: false, label: `Ouvre aujourd'hui à ${d.from}` };
    }
    if (i > 0) {
      return { open: false, label: `Ouvre ${i === 1 ? "demain" : DAY_LABELS[idx]} à ${d.from}` };
    }
  }
  return { open: false, label: "Fermé" };
}

function PharmacistHours() {
  const [schedule, setSchedule] = useState<DaySchedule[]>(() => loadSchedule());
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);
  const status = useMemo(() => isPharmacyOpen(schedule), [schedule, tick]);

  const save = (next: DaySchedule[]) => {
    setSchedule(next);
    try { localStorage.setItem(HOURS_STORAGE_KEY, JSON.stringify(next)); } catch {}
  };

  const setDay = (i: number, patch: Partial<DaySchedule>) => {
    save(schedule.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));
  };

  return (
    <div className="px-4 pt-4 pb-24">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-9 w-9 rounded-full bg-[hsl(var(--ph-purple)/0.1)] flex items-center justify-center">
          <CalendarClock className="h-4 w-4 text-[hsl(var(--ph-purple))]" />
        </div>
        <h1 className="ph-display font-bold text-xl">Horaires</h1>
      </div>

      <div className={`ph-card p-4 mb-4 flex items-center gap-3 ${status.open ? "bg-emerald-50" : "bg-red-50"}`}>
        <div className={`h-3 w-3 rounded-full ${status.open ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} />
        <div>
          <p className={`ph-display font-bold text-sm ${status.open ? "text-emerald-700" : "text-red-700"}`}>
            {status.open ? "Pharmacie ouverte" : "Pharmacie fermée"}
          </p>
          <p className="text-[11px] text-[hsl(var(--ph-ink-soft))]">{status.label}</p>
        </div>
      </div>

      <p className="text-[11px] text-[hsl(var(--ph-ink-soft))] mb-2">
        Les horaires définis ici déterminent automatiquement le statut Ouvert/Fermé affiché au client.
      </p>

      <div className="space-y-2">
        {schedule.map((d, i) => (
          <div key={i} className="ph-card p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="ph-display font-semibold text-sm">{DAY_LABELS[i]}</span>
              <button
                onClick={() => setDay(i, { open: !d.open })}
                className={`h-7 px-3 rounded-full text-[11px] font-bold ${
                  d.open ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                }`}
              >
                {d.open ? "Ouvert" : "Fermé"}
              </button>
            </div>
            {d.open && (
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={d.from}
                  onChange={(e) => setDay(i, { from: e.target.value })}
                  className="flex-1 h-10 px-3 rounded-xl bg-[hsl(var(--ph-muted))] text-sm font-semibold outline-none focus:ring-2 focus:ring-[hsl(var(--ph-purple))]"
                />
                <span className="text-xs text-[hsl(var(--ph-ink-soft))]">→</span>
                <input
                  type="time"
                  value={d.to}
                  onChange={(e) => setDay(i, { to: e.target.value })}
                  className="flex-1 h-10 px-3 rounded-xl bg-[hsl(var(--ph-muted))] text-sm font-semibold outline-none focus:ring-2 focus:ring-[hsl(var(--ph-purple))]"
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}