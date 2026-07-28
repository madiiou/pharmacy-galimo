import { useEffect, useState, useCallback } from "react";
import { api } from "../api";
import { useAuth } from "../auth/AuthContext";

export interface Pharmacy {
  id: string;
  name: string;
  owner_id: string | null;
  logo_url: string | null;
  address: string | null;
  neighborhood: string | null;
  city: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  delivery_fee_gnf: number;
  delivery_zones: string[] | null;
  delivery_cities: string[];
  opening_hours: string | null;
  is_active: boolean;
  is_verified: boolean;
  rating: number | null;
  total_orders: number | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

function toApiBody(payload: Partial<Pharmacy>) {
  return {
    name: payload.name,
    ownerId: payload.owner_id ?? undefined,
    address: payload.address ?? undefined,
    neighborhood: payload.neighborhood ?? undefined,
    city: payload.city ?? undefined,
    phone: payload.phone ?? undefined,
    whatsapp: payload.whatsapp ?? undefined,
    email: payload.email ?? undefined,
    deliveryFeeGnf: payload.delivery_fee_gnf,
    deliveryCities: payload.delivery_cities,
    description: payload.description ?? undefined,
    isActive: payload.is_active,
    isVerified: payload.is_verified,
  };
}

export function usePharmacies() {
  const { user } = useAuth();
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [myPharmacy, setMyPharmacy] = useState<Pharmacy | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPharmacies = useCallback(async () => {
    try {
      const data = await api<Pharmacy[]>("/pharmacies");
      setPharmacies(data);
      if (user?.role === "pharmacy_partner") {
        const mine = await api<Pharmacy[]>("/pharmacies/mine");
        setMyPharmacy(mine[0] ?? null);
      }
    } catch (err) {
      console.error("Error fetching pharmacies:", err);
    } finally {
      setLoading(false);
    }
  }, [user?.role]);

  useEffect(() => {
    fetchPharmacies();
  }, [fetchPharmacies]);

  const createPharmacy = async (payload: Partial<Pharmacy>) => {
    try {
      const data = await api<Pharmacy>("/pharmacies", {
        method: "POST",
        body: JSON.stringify(toApiBody(payload)),
      });
      await fetchPharmacies();
      return data;
    } catch (err) {
      console.error("Error creating pharmacy:", err);
      return null;
    }
  };

  const updatePharmacy = async (id: string, updates: Partial<Pharmacy>) => {
    try {
      const data = await api<Pharmacy>(`/pharmacies/${id}`, {
        method: "PATCH",
        body: JSON.stringify(toApiBody(updates)),
      });
      await fetchPharmacies();
      return data;
    } catch (err) {
      console.error("Error updating pharmacy:", err);
      return null;
    }
  };

  return {
    pharmacies,
    activePharmacies: pharmacies.filter((p) => p.is_active),
    myPharmacy,
    loading,
    createPharmacy,
    updatePharmacy,
    refresh: fetchPharmacies,
  };
}
