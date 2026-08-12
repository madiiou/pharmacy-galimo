import { useEffect, useState } from "react";
import { api } from "../api";
import { Layout } from "../components/Layout";

interface UserRow {
  id: string;
  email: string;
  display_name: string | null;
  phone: string | null;
  role: string;
  external_id: string | null;
  created_at: string;
}

export function Users() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  function load() {
    api<UserRow[]>("/users").then(setUsers).catch((err) => setError(err.message));
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <Layout>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Utilisateurs récents</h1>
        <button onClick={load} className="text-sm text-green-700">Rafraîchir</button>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Les comptes créés via le webhook galimo.tech ont un "Identifiant externe" rempli (= leur téléphone).
      </p>
      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="p-3">Créé le</th>
              <th className="p-3">Téléphone</th>
              <th className="p-3">Nom</th>
              <th className="p-3">Email</th>
              <th className="p-3">Rôle</th>
              <th className="p-3">Identifiant externe (galimo.tech)</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b last:border-0">
                <td className="p-3 whitespace-nowrap">{new Date(u.created_at).toLocaleString()}</td>
                <td className="p-3">{u.phone || "—"}</td>
                <td className="p-3">{u.display_name || "—"}</td>
                <td className="p-3">{u.email}</td>
                <td className="p-3">{u.role}</td>
                <td className="p-3">{u.external_id ? "✓ " + u.external_id : "—"}</td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={6} className="p-6 text-center text-gray-500">Aucun utilisateur.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
