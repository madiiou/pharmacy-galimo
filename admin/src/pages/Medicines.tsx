import { useEffect, useState, type FormEvent } from "react";
import { api } from "../api";
import { useAuth } from "../auth/AuthContext";
import { Layout } from "../components/Layout";

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
  pharmacy_id: string;
}

export function Medicines() {
  const { user } = useAuth();
  const [myPharmacies, setMyPharmacies] = useState<Pharmacy[]>([]);
  const [pharmacyId, setPharmacyId] = useState("");
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
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
        body: JSON.stringify({ pharmacyId, name, price: Number(price), category }),
      });
      setName("");
      setPrice("");
      setCategory("");
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
          <input placeholder="Catégorie" value={category} onChange={(e) => setCategory(e.target.value)} className="border rounded px-2 py-1" />
          <button type="submit" className="bg-green-600 text-white rounded px-4 py-1">Ajouter</button>
        </form>
      )}

      <div className="grid gap-3">
        {medicines.map((m) => (
          <div key={m.id} className="bg-white p-4 rounded shadow flex justify-between">
            <div>
              <p className="font-medium">{m.name}</p>
              <p className="text-sm text-gray-500">{m.category}</p>
            </div>
            <div className="text-right">
              <p className="font-medium">{m.price.toLocaleString()} GNF</p>
              <p className="text-xs text-gray-500">{m.in_stock ? "En stock" : "Rupture"}</p>
            </div>
          </div>
        ))}
      </div>
    </Layout>
  );
}
