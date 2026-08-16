import { useEffect, useState } from "react";
import { api } from "../api";
import { Layout } from "../components/Layout";

export function GalimoBalance() {
  const [balance, setBalance] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    setError(null);
    Promise.all([
      api<any>("/galimo-partner/balance"),
      api<any>("/galimo-partner/history?page=1&limit=30"),
    ])
      .then(([b, h]) => {
        setBalance(b);
        setHistory(Array.isArray(h) ? h : h.data ?? h.history ?? h.items ?? []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <Layout>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Solde Galimo Partenaire</h1>
        <button onClick={load} className="text-sm text-green-700">Rafraîchir</button>
      </div>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
      {loading && <p className="text-gray-500 text-sm mb-4">Chargement...</p>}

      {balance && (
        <div className="bg-white p-4 rounded shadow mb-6">
          <pre className="text-sm overflow-x-auto">{JSON.stringify(balance, null, 2)}</pre>
        </div>
      )}

      <h2 className="text-lg font-semibold mb-2">Historique récent</h2>
      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="p-3">Référence</th>
              <th className="p-3">Statut</th>
              <th className="p-3">Montant</th>
              <th className="p-3">Client</th>
              <th className="p-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {history.map((h, i) => (
              <tr key={h.idrequest ?? h.reference ?? i} className="border-b last:border-0">
                <td className="p-3">{h.reference ?? h.idrequest ?? "—"}</td>
                <td className="p-3">{h.statut ?? h.status ?? "—"}</td>
                <td className="p-3">{h.montant ? `${Number(h.montant).toLocaleString()} ${h.devise ?? "GNF"}` : "—"}</td>
                <td className="p-3">{h.numero_client ?? "—"}</td>
                <td className="p-3">{h.date_traitement ?? h.date_creation ?? "—"}</td>
              </tr>
            ))}
            {history.length === 0 && !loading && (
              <tr><td colSpan={5} className="p-6 text-center text-gray-500">Aucune transaction.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
