import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
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
}

interface ManualItem {
  medicineId: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
}

function emptyItem(): ManualItem {
  return { medicineId: "", itemName: "", quantity: 1, unitPrice: 0 };
}

export function ManualOrder() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [pharmacyId, setPharmacyId] = useState("");
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [deliveryFee, setDeliveryFee] = useState("0");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ManualItem[]>([emptyItem()]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.role === "pharmacy_partner") {
      api<Pharmacy[]>("/pharmacies/mine").then((list) => {
        setPharmacies(list);
        if (list[0]) setPharmacyId(list[0].id);
      });
    } else {
      api<Pharmacy[]>("/pharmacies").then(setPharmacies);
    }
  }, [user]);

  useEffect(() => {
    if (!pharmacyId) return;
    api<Medicine[]>(`/medicines?pharmacyId=${pharmacyId}`).then(setMedicines);
  }, [pharmacyId]);

  function updateItem(index: number, patch: Partial<ManualItem>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  function pickMedicine(index: number, medicineId: string) {
    const med = medicines.find((m) => m.id === medicineId);
    updateItem(index, { medicineId, itemName: "", unitPrice: med?.price ?? 0 });
  }

  const total = items.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0) + Number(deliveryFee || 0);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const order = await api<{ id: string }>("/orders/manual", {
        method: "POST",
        body: JSON.stringify({
          pharmacyId,
          customerPhone,
          customerName: customerName || undefined,
          deliveryFee: Number(deliveryFee || 0),
          notes: notes || undefined,
          items: items
            .filter((it) => it.medicineId || it.itemName)
            .map((it) => ({
              medicineId: it.medicineId || undefined,
              itemName: it.medicineId ? undefined : it.itemName,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
            })),
        }),
      });
      navigate(`/orders/${order.id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Layout>
      <h1 className="text-2xl font-semibold mb-4">Nouveau devis (commande téléphone)</h1>

      <form onSubmit={handleSubmit} className="bg-white p-4 rounded shadow space-y-4 max-w-2xl">
        {error && <p className="text-red-600 text-sm">{error}</p>}

        {user?.role === "admin" && (
          <div>
            <label className="block text-sm font-medium mb-1">Pharmacie</label>
            <select value={pharmacyId} onChange={(e) => setPharmacyId(e.target.value)} className="border rounded px-2 py-1 w-full" required>
              <option value="">Choisir</option>
              {pharmacies.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Téléphone du client *</label>
            <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="border rounded px-2 py-1 w-full" placeholder="+224 6XX XX XX XX" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Nom du client</label>
            <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="border rounded px-2 py-1 w-full" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Articles</label>
          <div className="space-y-2">
            {items.map((item, i) => (
              <div key={i} className="flex gap-2 items-start">
                <select
                  value={item.medicineId}
                  onChange={(e) => pickMedicine(i, e.target.value)}
                  className="border rounded px-2 py-1 flex-1"
                >
                  <option value="">Article hors catalogue…</option>
                  {medicines.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                {!item.medicineId && (
                  <input
                    placeholder="Nom de l'article"
                    value={item.itemName}
                    onChange={(e) => updateItem(i, { itemName: e.target.value })}
                    className="border rounded px-2 py-1 flex-1"
                  />
                )}
                <input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(e) => updateItem(i, { quantity: Number(e.target.value) })}
                  className="border rounded px-2 py-1 w-16"
                />
                <input
                  type="number"
                  min={0}
                  value={item.unitPrice}
                  onChange={(e) => updateItem(i, { unitPrice: Number(e.target.value) })}
                  className="border rounded px-2 py-1 w-28"
                  placeholder="Prix unitaire"
                />
                <button type="button" onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))} className="text-red-600 px-2">✕</button>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setItems((prev) => [...prev, emptyItem()])} className="text-sm text-green-700 mt-2">+ Ajouter un article</button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Frais de livraison (GNF)</label>
            <input type="number" min={0} value={deliveryFee} onChange={(e) => setDeliveryFee(e.target.value)} className="border rounded px-2 py-1 w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} className="border rounded px-2 py-1 w-full" />
          </div>
        </div>

        <p className="font-medium">Total : {total.toLocaleString()} GNF</p>

        <button type="submit" disabled={saving || !pharmacyId} className="bg-green-600 text-white rounded px-4 py-2">
          {saving ? "Envoi..." : "Envoyer le devis au client"}
        </button>
      </form>
    </Layout>
  );
}
