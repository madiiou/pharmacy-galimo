import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Plus, Edit, Building2, TrendingUp, Activity, ShieldCheck, Store, Wallet, AlertTriangle } from "lucide-react";
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
import { GUINEA_CITIES } from "./Pharmacy";

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
      is_active: true,
      is_verified: false,
      description: "",
    }
  );
  const [saving, setSaving] = useState(false);

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
        <GalimoKpis pharmacies={pharmacies} />

        <Tabs defaultValue="pharmacies" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="pharmacies"><Building2 className="h-4 w-4 mr-1" />Pharmacies</TabsTrigger>
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
              <p>🚚 Livraison : {Number(p.delivery_fee_gnf).toLocaleString()} GNF</p>
              <p className="text-xs text-muted-foreground">
                {p.total_orders ?? 0} commandes • Owner : {p.owner_id ? p.owner_id.slice(0, 8) + "…" : "aucun"}
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

          <TabsContent value="revenus" className="mt-4">
            <RevenusTab pharmacies={pharmacies} />
          </TabsContent>

          <TabsContent value="monitoring" className="mt-4">
            <MonitoringTab pharmacies={pharmacies} />
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

const AVG_ORDER_GNF = 85_000; // panier moyen estimé
const COMMISSION_RATE = 0.1;

function GalimoKpis({ pharmacies }: { pharmacies: Pharmacy[] }) {
  const active = pharmacies.filter((p) => p.is_active).length;
  const totalOrders = pharmacies.reduce((s, p) => s + (p.total_orders ?? 0), 0);
  const estimatedGmv = totalOrders * AVG_ORDER_GNF;
  const commissions = estimatedGmv * COMMISSION_RATE;

  const kpis = [
    { label: "Pharmacies actives", value: `${active}/${pharmacies.length}`, icon: Store, color: "text-primary" },
    { label: "Commandes totales", value: totalOrders.toLocaleString(), icon: Activity, color: "text-blue-600" },
    { label: "GMV estimé", value: `${(estimatedGmv / 1_000_000).toFixed(1)}M GNF`, icon: TrendingUp, color: "text-emerald-600" },
    { label: "Commissions Galimo", value: `${(commissions / 1_000).toFixed(0)}k GNF`, icon: Wallet, color: "text-amber-600" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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

function RevenusTab({ pharmacies }: { pharmacies: Pharmacy[] }) {
  const rows = [...pharmacies]
    .map((p) => {
      const orders = p.total_orders ?? 0;
      const gmv = orders * AVG_ORDER_GNF;
      return { p, orders, gmv, commission: gmv * COMMISSION_RATE };
    })
    .sort((a, b) => b.commission - a.commission);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Commissions Galimo (10%) par pharmacie</CardTitle>
        <p className="text-xs text-muted-foreground">
          Estimation basée sur un panier moyen de {AVG_ORDER_GNF.toLocaleString()} GNF. Les chiffres réels seront disponibles une fois les commandes migrées en base.
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {rows.map(({ p, orders, gmv, commission }, i) => (
            <div key={p.id} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                  {i + 1}
                </div>
                <div>
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.neighborhood} · {orders} commandes</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-emerald-600">{commission.toLocaleString()} GNF</p>
                <p className="text-xs text-muted-foreground">GMV {gmv.toLocaleString()}</p>
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

function MonitoringTab({ pharmacies }: { pharmacies: Pharmacy[] }) {
  const inactive = pharmacies.filter((p) => !p.is_active);
  const unverified = pharmacies.filter((p) => !p.is_verified);
  const noOwner = pharmacies.filter((p) => !p.owner_id);

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
                  <span className="text-xs text-muted-foreground">{p.total_orders ?? 0} cmd</span>
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