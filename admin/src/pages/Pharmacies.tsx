import { useEffect, useState, type FormEvent } from "react";
import { api } from "../api";
import { useAuth } from "../auth/AuthContext";
import { Layout } from "../components/Layout";

interface Pharmacy {
  id: string;
  name: string;
  city?: string;
  address?: string;
  phone?: string;
  is_verified: boolean;
}

export function Pharmacies() {
  const { user } = useAuth();
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setPharmacies(await api<Pharmacy[]>("/pharmacies"));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api("/pharmacies", {
        method: "POST",
        body: JSON.stringify({ name, city, address }),
      });
      setName("");
      setCity("");
      setAddress("");
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <Layout>
      <h1 className="text-2xl font-semibold mb-4">Pharmacies</h1>

      {user?.role === "admin" && (
        <form onSubmit={handleCreate} className="bg-white p-4 rounded shadow mb-6 flex gap-2 flex-wrap">
          {error && <p className="text-red-600 text-sm w-full">{error}</p>}
          <input placeholder="Nom" value={name} onChange={(e) => setName(e.target.value)} className="border rounded px-2 py-1" required />
          <input placeholder="Ville" value={city} onChange={(e) => setCity(e.target.value)} className="border rounded px-2 py-1" />
          <input placeholder="Adresse" value={address} onChange={(e) => setAddress(e.target.value)} className="border rounded px-2 py-1" />
          <button type="submit" className="bg-green-600 text-white rounded px-4 py-1">Ajouter</button>
        </form>
      )}

      <div className="grid gap-3">
        {pharmacies.map((p) => (
          <div key={p.id} className="bg-white p-4 rounded shadow flex justify-between">
            <div>
              <p className="font-medium">{p.name}</p>
              <p className="text-sm text-gray-500">{p.address} {p.city}</p>
            </div>
            {p.is_verified && <span className="text-xs text-green-700 self-center">Vérifiée</span>}
          </div>
        ))}
      </div>
    </Layout>
  );
}
