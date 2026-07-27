import { useEffect, useRef, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { io, type Socket } from "socket.io-client";
import { api, getToken } from "../api";
import { useAuth } from "../auth/AuthContext";
import { Layout } from "../components/Layout";

interface OrderItem {
  id: string;
  medicine_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface OrderDetailData {
  id: string;
  status: string;
  payment_status: string;
  total_amount: number;
  delivery_fee: number;
  notes?: string;
  items: OrderItem[];
}

interface Message {
  id: string;
  sender_id: string;
  sender_name?: string;
  message: string;
  created_at: string;
}

const STATUSES = ["pending", "confirmed", "preparing", "delivering", "delivered", "cancelled"];

export function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [order, setOrder] = useState<OrderDetailData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!id) return;
    api<OrderDetailData>(`/orders/${id}`).then(setOrder);
    api<Message[]>(`/orders/${id}/messages`).then(setMessages);

    const socket = io(import.meta.env.VITE_API_URL ?? "/", {
      path: "/api/socket.io",
      auth: { token: getToken() },
    });
    socketRef.current = socket;
    socket.emit("join_order", id);
    socket.on("new_message", (m: Message) => setMessages((prev) => [...prev, m]));

    return () => {
      socket.disconnect();
    };
  }, [id]);

  async function updateStatus(status: string) {
    if (!id) return;
    setOrder(await api(`/orders/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }));
  }

  function sendMessage(e: FormEvent) {
    e.preventDefault();
    if (!draft.trim() || !id) return;
    socketRef.current?.emit("send_message", {
      orderId: id,
      message: draft,
      senderName: user?.display_name ?? user?.email,
    });
    setDraft("");
  }

  if (!order) return <Layout><p>Chargement...</p></Layout>;

  return (
    <Layout>
      <h1 className="text-2xl font-semibold mb-4">Commande #{order.id.slice(0, 8)}</h1>

      <div className="bg-white p-4 rounded shadow mb-4">
        <div className="flex justify-between items-center mb-3">
          <span>Statut : <strong>{order.status}</strong></span>
          <select value={order.status} onChange={(e) => updateStatus(e.target.value)} className="border rounded px-2 py-1">
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <ul className="text-sm divide-y">
          {order.items.map((item) => (
            <li key={item.id} className="py-1 flex justify-between">
              <span>{item.quantity}× {item.medicine_name}</span>
              <span>{item.subtotal.toLocaleString()} GNF</span>
            </li>
          ))}
        </ul>
        <p className="text-right font-medium mt-2">Total : {order.total_amount.toLocaleString()} GNF</p>
      </div>

      <div className="bg-white p-4 rounded shadow">
        <h2 className="font-medium mb-2">Chat</h2>
        <div className="h-48 overflow-y-auto border rounded p-2 mb-2 space-y-1">
          {messages.map((m) => (
            <p key={m.id} className="text-sm">
              <strong>{m.sender_name ?? m.sender_id.slice(0, 6)} :</strong> {m.message}
            </p>
          ))}
        </div>
        <form onSubmit={sendMessage} className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="flex-1 border rounded px-2 py-1"
            placeholder="Écrire un message..."
          />
          <button type="submit" className="bg-green-600 text-white rounded px-4 py-1">Envoyer</button>
        </form>
      </div>
    </Layout>
  );
}
