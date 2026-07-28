import { Link } from "react-router-dom";
import { Pill, Stethoscope, ShieldCheck } from "lucide-react";

export function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-4">
        <h1 className="text-2xl font-semibold text-center mb-6">Pharmacy Galimo</h1>

        <Link
          to="/shop"
          className="flex items-center gap-4 bg-white rounded-xl shadow p-5 hover:bg-gray-50"
        >
          <Pill className="h-8 w-8 text-purple-700" />
          <div>
            <p className="font-medium">Espace Client</p>
            <p className="text-sm text-gray-500">Ce que voient les clients (catalogue, panier, commandes)</p>
          </div>
        </Link>

        <Link
          to="/shop?view=pharmacien"
          className="flex items-center gap-4 bg-white rounded-xl shadow p-5 hover:bg-gray-50"
        >
          <Stethoscope className="h-8 w-8 text-purple-700" />
          <div>
            <p className="font-medium">Espace Pharmacien</p>
            <p className="text-sm text-gray-500">Ce que voit le pharmacien (commandes, catalogue, stats)</p>
          </div>
        </Link>

        <Link
          to="/admin-pharmacies"
          className="flex items-center gap-4 bg-white rounded-xl shadow p-5 hover:bg-gray-50"
        >
          <ShieldCheck className="h-8 w-8 text-purple-700" />
          <div>
            <p className="font-medium">Espace Admin</p>
            <p className="text-sm text-gray-500">Console pharmacies : KPIs, revenus, monitoring, contrôle</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
