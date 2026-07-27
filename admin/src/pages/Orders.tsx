import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { Layout } from "../components/Layout";

interface Order {
  id: string;
  status: string;
  payment_status: string;
  total_amount: number;
  created_at: string;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  confirmed: "Confirmée",
  preparing: "Préparation",
  delivering: "En livraison",
  delivered: "Livrée",
  cancelled: "Annulée",
};

export function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    api<Order[]>("/orders").then(setOrders);
  }, []);

  return (
    <Layout>
      <h1 className="text-2xl font-semibold mb-4">Commandes</h1>
      <div className="grid gap-3">
        {orders.map((o) => (
          <Link key={o.id} to={`/orders/${o.id}`} className="bg-white p-4 rounded shadow flex justify-between hover:bg-gray-50">
            <div>
              <p className="font-medium">#{o.id.slice(0, 8)}</p>
              <p className="text-sm text-gray-500">{new Date(o.created_at).toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="font-medium">{o.total_amount.toLocaleString()} GNF</p>
              <p className="text-xs text-gray-500">{STATUS_LABELS[o.status] ?? o.status} · {o.payment_status}</p>
            </div>
          </Link>
        ))}
      </div>
    </Layout>
  );
}
