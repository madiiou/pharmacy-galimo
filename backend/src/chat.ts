import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { pool } from "./db.js";
import type { JwtPayload } from "./auth.js";
import { canManagePharmacy } from "./routes/pharmacies.js";

const JWT_SECRET = process.env.JWT_SECRET as string;

let ioInstance: Server | null = null;

// Prévient en direct les personnes concernées par une commande (le client,
// la pharmacie, et les admins) qu'il y a du nouveau, pour qu'elles
// rafraîchissent sans avoir besoin de sonder le serveur en boucle.
export function notifyOrderChange(order: { user_id: string; pharmacy_id: string }) {
  if (!ioInstance) return;
  ioInstance
    .to(`user:${order.user_id}`)
    .to(`pharmacy:${order.pharmacy_id}`)
    .to("admin")
    .emit("orders_updated");
}

async function canAccessOrder(userId: string, role: string, orderId: string) {
  const result = await pool.query(
    "SELECT user_id, pharmacy_id FROM orders WHERE id = $1",
    [orderId]
  );
  if (!result.rowCount) return false;
  const order = result.rows[0];
  if (role === "admin") return true;
  if (role === "user") return order.user_id === userId;
  if (role === "pharmacy_partner") return canManagePharmacy(userId, role, order.pharmacy_id);
  return false;
}

export function attachChat(httpServer: HttpServer) {
  const io = new Server(httpServer, { path: "/api/socket.io", cors: { origin: "*" } });
  ioInstance = io;

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) throw new Error("Missing token");
      socket.data.user = jwt.verify(token, JWT_SECRET) as JwtPayload;
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", async (socket) => {
    const user = socket.data.user as JwtPayload;

    // Chaque connecté rejoint sa propre room, plus celle(s) de sa pharmacie
    // s'il est partenaire, ou la room admin s'il est admin — ça permet à
    // notifyOrderChange de cibler exactement qui doit être notifié.
    socket.join(`user:${user.sub}`);
    if (user.role === "admin") {
      socket.join("admin");
    } else if (user.role === "pharmacy_partner") {
      const result = await pool.query("SELECT id FROM pharmacies WHERE owner_id = $1", [user.sub]);
      for (const row of result.rows) socket.join(`pharmacy:${row.id}`);
    }

    socket.on("join_order", async (orderId: string) => {
      if (await canAccessOrder(user.sub, user.role, orderId)) {
        socket.join(`order:${orderId}`);
      }
    });

    socket.on("send_message", async ({ orderId, message, senderName }: { orderId: string; message: string; senderName?: string }) => {
      if (!(await canAccessOrder(user.sub, user.role, orderId))) return;

      const result = await pool.query(
        `INSERT INTO order_messages (order_id, sender_id, sender_name, message)
         VALUES ($1,$2,$3,$4) RETURNING *`,
        [orderId, user.sub, senderName ?? null, message]
      );
      io.to(`order:${orderId}`).emit("new_message", result.rows[0]);
    });
  });

  return io;
}
