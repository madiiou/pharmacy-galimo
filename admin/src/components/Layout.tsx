import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow px-6 py-3 flex items-center justify-between">
        <div className="flex gap-4 font-medium">
          <Link to="/shop">Boutique</Link>
          <Link to="/pharmacies">Pharmacies</Link>
          <Link to="/medicines">Médicaments</Link>
          <Link to="/orders">Commandes</Link>
          {user?.role === "admin" && <Link to="/users">Utilisateurs</Link>}
          {user?.role === "admin" && <Link to="/galimo-balance">Solde Galimo</Link>}
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <span>{user?.email} ({user?.role})</span>
          <button onClick={logout} className="text-red-600">Déconnexion</button>
        </div>
      </nav>
      <main className="p-6 max-w-4xl mx-auto">{children}</main>
    </div>
  );
}
