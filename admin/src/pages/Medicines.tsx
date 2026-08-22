import { useEffect, useState, type FormEvent } from "react";
import { api } from "../api";
import { useAuth } from "../auth/AuthContext";
import { Layout } from "../components/Layout";
import { formatGNF } from "../lib/pharmacy";

interface Pharmacy {
  id: string;
  name: string;
}

interface Medicine {
  id: string;
  name: string;
  price: number;
  category?: string;
  in_stock: boolean;
  requires_prescription: boolean;
  pharmacy_id: string;
}

const CATEGORIES = [
  { id: "fievre", label: "Fièvre" },
  { id: "antibio", label: "Antibiotiques" },
  { id: "vitamines", label: "Vitamines" },
  { id: "cardio", label: "Cardio" },
  { id: "digestif", label: "Digestif" },
  { id: "dermato", label: "Peau" },
  { id: "orl_yeux", label: "ORL & Yeux" },
  { id: "gyneco", label: "Gynéco" },
  { id: "nerveux", label: "Sommeil & Nerfs" },
  { id: "soins", label: "Soins" },
  { id: "materiel", label: "Matériel" },
  { id: "bebe", label: "Bébé" },
];

export function Medicines() {
  const { user } = useAuth();
  const [myPharmacies, setMyPharmacies] = useState<Pharmacy[]>([]);
  const [pharmacyId, setPharmacyId] = useState("");
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("soins");
  const [requiresPrescription, setRequiresPrescription] = useState(false);
  const [inStock, setInStock] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role === "pharmacy_partner") {
      api<Pharmacy[]>("/pharmacies/mine").then((list) => {
        setMyPharmacies(list);
        if (list[0]) setPharmacyId(list[0].id);
      });
    } else {
      api<Pharmacy[]>("/pharmacies").then(setMyPharmacies);
    }
  }, [user]);

  useEffect(() => {
    if (!pharmacyId) return;
    api<Medicine[]>(`/medicines?pharmacyId=${pharmacyId}`).then(setMedicines);
  }, [pharmacyId]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api("/medicines", {
        method: "POST",
        body: JSON.stringify({
          pharmacyId,
          name,
          price: Number(price),
          category,
          requiresPrescription,
          inStock,
        }),
      });
      setName("");
      setPrice("");
      setCategory("soins");
      setRequiresPrescription(false);
      setInStock(true);
      api<Medicine[]>(`/medicines?pharmacyId=${pharmacyId}`).then(setMedicines);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <Layout>
      <h1 className="text-2xl font-semibold mb-4">Médicaments</h1>

      <select value={pharmacyId} onChange={(e) => setPharmacyId(e.target.value)} className="border rounded px-2 py-1 mb-4">
        <option value="">Choisir une pharmacie</option>
        {myPharmacies.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>

      {pharmacyId && (
        <form onSubmit={handleCreate} className="bg-white p-4 rounded shadow mb-6 flex gap-2 flex-wrap">
          {error && <p className="text-red-600 text-sm w-full">{error}</p>}
          <input placeholder="Nom" value={name} onChange={(e) => setName(e.target.value)} className="border rounded px-2 py-1" required />
          <input placeholder="Prix (GNF)" type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="border rounded px-2 py-1" required />
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="border rounded px-2 py-1">
            {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <label className="flex items-center gap-1.5 text-sm px-2">
            <input type="checkbox" checked={requiresPrescription} onChange={(e) => setRequiresPrescription(e.target.checked)} />
            Ordonnance requise
          </label>
          <label className="flex items-center gap-1.5 text-sm px-2">
            <input type="checkbox" checked={inStock} onChange={(e) => setInStock(e.target.checked)} />
            En stock
          </label>
          <button type="submit" className="bg-green-600 text-white rounded px-4 py-1">Ajouter</button>
        </form>
      )}

      <div className="grid gap-3">
        {medicines.map((m) => (
          <div key={m.id} className="bg-white p-4 rounded shadow flex justify-between">
            <div>
              <p className="font-medium">{m.name}</p>
              <p className="text-sm text-gray-500">
                {CATEGORIES.find((c) => c.id === m.category)?.label ?? m.category}
                {m.requires_prescription && <span className="text-amber-600 font-medium"> · Ordonnance</span>}
              </p>
            </div>
            <div className="text-right">
              <p className="font-medium">{formatGNF(m.price)}</p>
              <p className="text-xs text-gray-500">{m.in_stock ? "En stock" : "Rupture"}</p>
            </div>
          </div>
        ))}
      </div>
    </Layout>
  );
}
