import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth/AuthContext";
import { Layout } from "../components/Layout";
import { formatGNF } from "../lib/pharmacy";

interface Order {
  id: string;
  status: string;
  payment_status: string;
  total_amount: number;
  created_at: string;
}

const STATUS_LABELS: Record<string, string> = {
  awaiting_customer: "Devis envoyé",
  pending: "En attente",
  confirmed: "Confirmée",
  preparing: "Préparation",
  delivering: "En livraison",
  delivered: "Livrée",
  cancelled: "Annulée",
};

export function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    api<Order[]>("/orders").then(setOrders);
  }, []);

  return (
    <Layout>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Commandes</h1>
        {(user?.role === "admin" || user?.role === "pharmacy_partner") && (
          <Link to="/orders/new" className="bg-green-600 text-white rounded px-4 py-2 text-sm">
            + Devis téléphone
          </Link>
        )}
      </div>
      <div className="grid gap-3">
        {orders.map((o) => (
          <Link key={o.id} to={`/orders/${o.id}`} className="bg-white p-4 rounded shadow flex justify-between hover:bg-gray-50">
            <div>
              <p className="font-medium">#{o.id.slice(0, 8)}</p>
              <p className="text-sm text-gray-500">{new Date(o.created_at).toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="font-medium">{formatGNF(o.total_amount)}</p>
              <p className="text-xs text-gray-500">{STATUS_LABELS[o.status] ?? o.status} · {o.payment_status}</p>
            </div>
          </Link>
        ))}
      </div>
    </Layout>
  );
}
