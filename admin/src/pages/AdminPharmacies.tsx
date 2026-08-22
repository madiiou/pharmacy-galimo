import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Plus, Edit, Building2, TrendingUp, Activity, ShieldCheck, Store, Wallet, AlertTriangle, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Switch } from "../components/ui/switch";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { useUserRoles } from "../hooks/useUserRoles";
import { usePharmacies, type Pharmacy } from "../hooks/usePharmacies";
import { GUINEA_CITIES, DAY_LABELS, DEFAULT_SCHEDULE, isPharmacyOpen, type DaySchedule } from "./Pharmacy";
import { formatGNF } from "../lib/pharmacy";
import { api } from "../api";

interface OrderSummary {
  id: string;
  pharmacy_id: string;
  user_id: string;
  status: string;
  payment_status: string;
  total_amount: number;
  delivery_fee: number;
  created_at: string;
}

interface UserSummary {
  id: string;
  email: string;
  display_name: string | null;
  phone: string | null;
  role: string;
  external_id: string | null;
  created_at: string;
}

interface PharmacyStats {
  orders: number;
  paidOrders: number;
  gmv: number;
  commission: number;
}

export interface ClientStats {
  user: UserSummary;
  orders: number;
  paidOrders: number;
  spent: number;
  lastOrderAt: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  awaiting_pharmacist: "En attente pharmacie",
  awaiting_customer: "Devis envoyé",
  pending: "Confirmée",
  confirmed: "Confirmée",
  preparing: "Préparation",
  delivering: "En livraison",
  delivered: "Livrée",
  cancelled: "Annulée",
};

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function useAdminData() {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api<OrderSummary[]>("/orders").catch(() => []),
      api<UserSummary[]>("/users").catch(() => []),
    ])
      .then(([o, u]) => {
        setOrders(o);
        setUsers(u);
      })
      .finally(() => setLoading(false));
  }, []);

  const statsByPharmacy = useMemo(() => {
    const map = new Map<string, PharmacyStats>();
    for (const o of orders) {
      const stats = map.get(o.pharmacy_id) ?? { orders: 0, paidOrders: 0, gmv: 0, commission: 0 };
      stats.orders += 1;
      if (o.payment_status === "paid") {
        stats.paidOrders += 1;
        stats.gmv += o.total_amount;
        stats.commission += Math.round((o.total_amount - (o.delivery_fee || 0)) * 0.1);
      }
      map.set(o.pharmacy_id, stats);
    }
    return map;
  }, [orders]);

  const statusFunnel = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of orders) map.set(o.status, (map.get(o.status) ?? 0) + 1);
    return map;
  }, [orders]);

  const clients: ClientStats[] = useMemo(() => {
    const ordersByUser = new Map<string, OrderSummary[]>();
    for (const o of orders) {
      const list = ordersByUser.get(o.user_id) ?? [];
      list.push(o);
      ordersByUser.set(o.user_id, list);
    }
    return users
      .filter((u) => u.role === "user")
      .map((user) => {
        const userOrders = ordersByUser.get(user.id) ?? [];
        const paid = userOrders.filter((o) => o.payment_status === "paid");
        const lastOrderAt = userOrders.length
          ? userOrders.reduce((max, o) => (o.created_at > max ? o.created_at : max), userOrders[0].created_at)
          : null;
        return {
          user,
          orders: userOrders.length,
          paidOrders: paid.length,
          spent: paid.reduce((s, o) => s + o.total_amount, 0),
          lastOrderAt,
        };
      });
  }, [orders, users]);

  const clientKpis = useMemo(() => {
    const weekAgo = daysAgo(7).toISOString();
    const monthAgo = daysAgo(30).toISOString();
    return {
      total: clients.length,
      newThisWeek: clients.filter((c) => c.user.created_at >= weekAgo).length,
      newThisMonth: clients.filter((c) => c.user.created_at >= monthAgo).length,
      repeatCustomers: clients.filter((c) => c.orders > 1).length,
      withOrders: clients.filter((c) => c.orders > 0).length,
    };
  }, [clients]);

  const statsFor = (pharmacyId: string): PharmacyStats =>
    statsByPharmacy.get(pharmacyId) ?? { orders: 0, paidOrders: 0, gmv: 0, commission: 0 };

  return { statsByPharmacy, statsFor, statusFunnel, clients, clientKpis, loading };
}

function PharmacyDialog({
  pharmacy,
  onSave,
  trigger,
}: {
  pharmacy?: Pharmacy;
  onSave: (data: Partial<Pharmacy>) => Promise<void>;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Pharmacy>>(
    pharmacy || {
      name: "",
      neighborhood: "Kaloum",
      city: "Conakry",
      phone: "",
      whatsapp: "",
      address: "",
      delivery_fee_gnf: 15000,
      delivery_cities: ["Conakry"],
      opening_hours: DEFAULT_SCHEDULE,
      is_active: true,
      is_verified: false,
      description: "",
    }
  );
  const [saving, setSaving] = useState(false);

  const schedule = form.opening_hours ?? DEFAULT_SCHEDULE;
  const setDay = (i: number, patch: Partial<DaySchedule>) => {
    setForm({
      ...form,
      opening_hours: schedule.map((d, idx) => (idx === i ? { ...d, ...patch } : d)),
    });
  };

  const submit = async () => {
    setSaving(true);
    await onSave(form);
    setSaving(false);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{pharmacy ? "Modifier la pharmacie" : "Nouvelle pharmacie"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nom *</Label>
            <Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>Propriétaire (User ID)</Label>
            <Input
              placeholder="uuid du compte partenaire"
              value={form.owner_id || ""}
              onChange={(e) => setForm({ ...form, owner_id: e.target.value })}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Le propriétaire doit aussi avoir le rôle "pharmacy_partner"
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Quartier</Label>
              <Input
                value={form.neighborhood || ""}
                onChange={(e) => setForm({ ...form, neighborhood: e.target.value })}
              />
            </div>
            <div>
              <Label>Ville</Label>
              <Input value={form.city || ""} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Adresse</Label>
            <Input value={form.address || ""} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Téléphone</Label>
              <Input value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <Label>WhatsApp</Label>
              <Input value={form.whatsapp || ""} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Frais de livraison (GNF)</Label>
            <Input
              type="number"
              value={form.delivery_fee_gnf ?? 0}
              onChange={(e) => setForm({ ...form, delivery_fee_gnf: Number(e.target.value) })}
            />
          </div>
          <div>
            <Label>Villes desservies (livraison)</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Coche les villes où cette pharmacie accepte de livrer. Les clients d'autres villes ne pourront pas commander en livraison.
            </p>
            <div className="max-h-48 overflow-y-auto border rounded-lg p-2 grid grid-cols-2 gap-1">
              {GUINEA_CITIES.map((c) => {
                const selected = (form.delivery_cities ?? []).includes(c);
                return (
                  <label key={c} className="flex items-center gap-2 text-sm px-2 py-1 rounded hover:bg-muted cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={(e) => {
                        const current = form.delivery_cities ?? [];
                        setForm({
                          ...form,
                          delivery_cities: e.target.checked
                            ? [...current, c]
                            : current.filter((x) => x !== c),
                        });
                      }}
                    />
                    {c}
                  </label>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {(form.delivery_cities ?? []).length} ville(s) sélectionnée(s)
            </p>
          </div>
          <div>
            <Label>Horaires</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Déterminent le statut Ouvert/Fermé affiché côté client. Le pharmacien peut aussi les modifier depuis son propre écran.
            </p>
            <div className="space-y-1.5">
              {schedule.map((d, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs w-16 flex-shrink-0">{DAY_LABELS[i].slice(0, 3)}</span>
                  <Switch checked={d.open} onCheckedChange={(v) => setDay(i, { open: v })} />
                  {d.open ? (
                    <>
                      <Input
                        type="time"
                        value={d.from}
                        onChange={(e) => setDay(i, { from: e.target.value })}
                        className="h-8 text-xs"
                      />
                      <span className="text-xs text-muted-foreground">→</span>
                      <Input
                        type="time"
                        value={d.to}
                        onChange={(e) => setDay(i, { to: e.target.value })}
                        className="h-8 text-xs"
                      />
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground">Fermé</span>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              value={form.description || ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <Switch
                checked={form.is_active ?? true}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
              />
              <Label>Active</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.is_verified ?? false}
                onCheckedChange={(v) => setForm({ ...form, is_verified: v })}
              />
              <Label>Vérifiée</Label>
            </div>
          </div>
          <Button className="w-full" onClick={submit} disabled={saving || !form.name}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Enregistrer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminPharmacies() {
  const navigate = useNavigate();
  const { isAdmin, loading } = useUserRoles();
  const { pharmacies, createPharmacy, updatePharmacy, loading: pharmLoading } = usePharmacies();
  const { statsByPharmacy, statsFor, statusFunnel, clients, clientKpis, loading: statsLoading } = useAdminData();

  if (loading || pharmLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin()) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
        <h2 className="text-2xl font-semibold">Accès administrateur requis</h2>
        <Button onClick={() => navigate("/")}>Retour</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
        <div className="container mx-auto px-4 py-6 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="text-primary-foreground hover:bg-white/10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Galimo · Console Pharmacies</h1>
            <p className="text-sm opacity-90">Supervision du réseau de pharmacies partenaires</p>
          </div>
          <PharmacyDialog
            onSave={async (data) => {
              await createPharmacy(data);
            }}
            trigger={
              <Button variant="secondary">
                <Plus className="h-4 w-4 mr-1" />
                Nouvelle
              </Button>
            }
          />
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        <GalimoKpis pharmacies={pharmacies} statsByPharmacy={statsByPharmacy} clientKpis={clientKpis} />

        <Tabs defaultValue="pharmacies" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="pharmacies"><Building2 className="h-4 w-4 mr-1" />Pharmacies</TabsTrigger>
            <TabsTrigger value="clients"><Users className="h-4 w-4 mr-1" />Clients</TabsTrigger>
            <TabsTrigger value="revenus"><TrendingUp className="h-4 w-4 mr-1" />Revenus</TabsTrigger>
            <TabsTrigger value="monitoring"><Activity className="h-4 w-4 mr-1" />Monitoring</TabsTrigger>
            <TabsTrigger value="controle"><ShieldCheck className="h-4 w-4 mr-1" />Contrôle</TabsTrigger>
          </TabsList>

          <TabsContent value="pharmacies" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pharmacies.map((p) => (
          <Card key={p.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base">🏥 {p.name}</CardTitle>
                <div className="flex gap-1">
                  {p.is_active ? (
                    <Badge variant="default">Active</Badge>
                  ) : (
                    <Badge variant="secondary">Inactive</Badge>
                  )}
                  {p.is_verified && <Badge className="bg-emerald-600">✓</Badge>}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="text-muted-foreground">
                {p.neighborhood ? `📍 ${p.neighborhood}` : "Pas d'adresse"}
              </p>
              {p.phone && <p>📞 {p.phone}</p>}
              <p>🚚 Livraison : {formatGNF(Number(p.delivery_fee_gnf))}</p>
              {(() => {
                const status = isPharmacyOpen(p.opening_hours ?? DEFAULT_SCHEDULE);
                return (
                  <p className={status.open ? "text-emerald-600" : "text-red-600"}>
                    {status.open ? "🟢" : "🔴"} {status.label}
                  </p>
                );
              })()}
              <p className="text-xs text-muted-foreground">
                {statsFor(p.id).orders} commande{statsFor(p.id).orders > 1 ? "s" : ""} ({statsFor(p.id).paidOrders} payée{statsFor(p.id).paidOrders > 1 ? "s" : ""}) • Owner : {p.owner_id ? p.owner_id.slice(0, 8) + "…" : "aucun"}
              </p>
              <PharmacyDialog
                pharmacy={p}
                onSave={async (data) => {
                  await updatePharmacy(p.id, data);
                }}
                trigger={
                  <Button variant="outline" size="sm" className="w-full mt-2">
                    <Edit className="h-4 w-4 mr-1" />
                    Modifier
                  </Button>
                }
              />
            </CardContent>
          </Card>
        ))}
            </div>
          </TabsContent>

          <TabsContent value="clients" className="mt-4">
            <ClientsTab clients={clients} clientKpis={clientKpis} />
          </TabsContent>

          <TabsContent value="revenus" className="mt-4">
            <RevenusTab pharmacies={pharmacies} statsFor={statsFor} />
          </TabsContent>

          <TabsContent value="monitoring" className="mt-4">
            <MonitoringTab pharmacies={pharmacies} statsFor={statsFor} statusFunnel={statusFunnel} />
          </TabsContent>

          <TabsContent value="controle" className="mt-4">
            <ControleTab pharmacies={pharmacies} updatePharmacy={updatePharmacy} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ============= Sub-components =============

function GalimoKpis({ pharmacies, statsByPharmacy, clientKpis }: {
  pharmacies: Pharmacy[];
  statsByPharmacy: Map<string, PharmacyStats>;
  clientKpis: { total: number; newThisWeek: number; withOrders: number };
}) {
  const active = pharmacies.filter((p) => p.is_active).length;
  let totalOrders = 0, gmv = 0, commissions = 0;
  for (const s of statsByPharmacy.values()) {
    totalOrders += s.orders;
    gmv += s.gmv;
    commissions += s.commission;
  }

  const kpis = [
    { label: "Pharmacies actives", value: `${active}/${pharmacies.length}`, icon: Store, color: "text-primary" },
    { label: "Clients", value: `${clientKpis.total} (+${clientKpis.newThisWeek}/7j)`, icon: Users, color: "text-purple-600" },
    { label: "Commandes totales", value: totalOrders.toLocaleString(), icon: Activity, color: "text-blue-600" },
    { label: "GMV réel (payé)", value: `${(gmv / 1_000_000).toFixed(2)}M GNF`, icon: TrendingUp, color: "text-emerald-600" },
    { label: "Commissions Galimo", value: `${(commissions / 1_000).toFixed(0)}k GNF`, icon: Wallet, color: "text-amber-600" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {kpis.map((k) => (
        <Card key={k.label}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{k.label}</p>
                <p className="text-lg font-bold mt-1">{k.value}</p>
              </div>
              <k.icon className={`h-8 w-8 ${k.color} opacity-70`} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function RevenusTab({ pharmacies, statsFor }: { pharmacies: Pharmacy[]; statsFor: (id: string) => PharmacyStats }) {
  const rows = [...pharmacies]
    .map((p) => ({ p, ...statsFor(p.id) }))
    .sort((a, b) => b.commission - a.commission);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Commissions Galimo (10%) par pharmacie</CardTitle>
        <p className="text-xs text-muted-foreground">
          Chiffres réels calculés à partir des commandes payées (10% du prix des médicaments, hors transport).
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {rows.map(({ p, orders, paidOrders, gmv, commission }, i) => (
            <div key={p.id} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                  {i + 1}
                </div>
                <div>
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.neighborhood} · {orders} commande{orders > 1 ? "s" : ""} ({paidOrders} payée{paidOrders > 1 ? "s" : ""})</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-emerald-600">{formatGNF(commission)}</p>
                <p className="text-xs text-muted-foreground">GMV {formatGNF(gmv)}</p>
              </div>
            </div>
          ))}
          {rows.length === 0 && (
            <p className="p-8 text-center text-sm text-muted-foreground">Aucune pharmacie enregistrée.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function MonitoringTab({ pharmacies, statsFor, statusFunnel }: {
  pharmacies: Pharmacy[];
  statsFor: (id: string) => PharmacyStats;
  statusFunnel: Map<string, number>;
}) {
  const inactive = pharmacies.filter((p) => !p.is_active);
  const unverified = pharmacies.filter((p) => !p.is_verified);
  const noOwner = pharmacies.filter((p) => !p.owner_id);
  const funnelOrder = ["awaiting_pharmacist", "awaiting_customer", "pending", "confirmed", "preparing", "delivering", "delivered", "cancelled"];
  const totalInFunnel = Array.from(statusFunnel.values()).reduce((s, n) => s + n, 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            Alertes réseau
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <AlertRow label="Pharmacies inactives" count={inactive.length} items={inactive.map((p) => p.name)} />
          <AlertRow label="Pharmacies non vérifiées" count={unverified.length} items={unverified.map((p) => p.name)} />
          <AlertRow label="Sans propriétaire assigné" count={noOwner.length} items={noOwner.map((p) => p.name)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Entonnoir des commandes</CardTitle>
          <p className="text-xs text-muted-foreground">Répartition de toutes les commandes par statut actuel.</p>
        </CardHeader>
        <CardContent className="space-y-2">
          {funnelOrder.map((status) => {
            const count = statusFunnel.get(status) ?? 0;
            const pct = totalInFunnel ? Math.round((count / totalInFunnel) * 100) : 0;
            if (count === 0) return null;
            return (
              <div key={status} className="flex items-center gap-3 text-sm">
                <span className="w-40 flex-shrink-0 text-muted-foreground">{STATUS_LABELS[status] ?? status}</span>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                </div>
                <span className="w-16 flex-shrink-0 text-right font-medium">{count} ({pct}%)</span>
              </div>
            );
          })}
          {totalInFunnel === 0 && <p className="text-sm text-muted-foreground">Aucune commande.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Activité par pharmacie</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {pharmacies.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-3 text-sm">
                <div>
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.city} · {p.neighborhood}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={p.is_active ? "default" : "secondary"}>
                    {p.is_active ? "En ligne" : "Hors ligne"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{statsFor(p.id).orders} cmd</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AlertRow({ label, count, items }: { label: string; count: number; items: string[] }) {
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0">
      <div>
        <p className="font-medium">{label}</p>
        {count > 0 && (
          <p className="text-xs text-muted-foreground">{items.slice(0, 3).join(", ")}{items.length > 3 ? "…" : ""}</p>
        )}
      </div>
      <Badge variant={count > 0 ? "destructive" : "secondary"}>{count}</Badge>
    </div>
  );
}

function ClientsTab({ clients, clientKpis }: {
  clients: ClientStats[];
  clientKpis: { total: number; newThisWeek: number; newThisMonth: number; repeatCustomers: number; withOrders: number };
}) {
  const topClients = [...clients].sort((a, b) => b.spent - a.spent).slice(0, 20);
  const repeatRate = clientKpis.withOrders ? Math.round((clientKpis.repeatCustomers / clientKpis.withOrders) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Clients inscrits", value: clientKpis.total },
          { label: "Nouveaux (30j)", value: clientKpis.newThisMonth },
          { label: "Ont déjà commandé", value: clientKpis.withOrders },
          { label: "Clients fidèles", value: `${clientKpis.repeatCustomers} (${repeatRate}%)` },
        ].map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className="text-lg font-bold mt-1">{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Meilleurs clients</CardTitle>
          <p className="text-xs text-muted-foreground">Classés par montant total payé (toutes pharmacies confondues).</p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {topClients.filter((c) => c.orders > 0).map((c, i) => (
              <div key={c.user.id} className="flex items-center justify-between p-3 text-sm">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {i + 1}
                  </div>
                  <div>
                    <p className="font-medium">{c.user.display_name || c.user.phone || c.user.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.user.phone ?? c.user.email} · {c.orders} commande{c.orders > 1 ? "s" : ""} ({c.paidOrders} payée{c.paidOrders > 1 ? "s" : ""})
                    </p>
                  </div>
                </div>
                <p className="font-bold text-emerald-600">{formatGNF(c.spent)}</p>
              </div>
            ))}
            {topClients.filter((c) => c.orders > 0).length === 0 && (
              <p className="p-8 text-center text-sm text-muted-foreground">Aucun client n'a encore commandé.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ControleTab({
  pharmacies,
  updatePharmacy,
}: {
  pharmacies: Pharmacy[];
  updatePharmacy: (id: string, data: Partial<Pharmacy>) => Promise<any>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Actions rapides</CardTitle>
        <p className="text-xs text-muted-foreground">Activer, suspendre ou vérifier une pharmacie en un clic.</p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {pharmacies.map((p) => (
            <div key={p.id} className="flex items-center justify-between p-3">
              <div>
                <p className="font-medium text-sm">{p.name}</p>
                <p className="text-xs text-muted-foreground">{p.neighborhood}, {p.city}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Active</Label>
                  <Switch
                    checked={p.is_active}
                    onCheckedChange={(v) => updatePharmacy(p.id, { is_active: v })}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Vérifiée</Label>
                  <Switch
                    checked={p.is_verified}
                    onCheckedChange={(v) => updatePharmacy(p.id, { is_verified: v })}
                  />
                </div>
              </div>
            </div>
          ))}
          {pharmacies.length === 0 && (
            <p className="p-8 text-center text-sm text-muted-foreground">Aucune pharmacie à contrôler.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}