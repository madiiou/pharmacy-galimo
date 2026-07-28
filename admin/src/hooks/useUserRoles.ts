import { useAuth } from "../auth/AuthContext";

export function useUserRoles() {
  const { user } = useAuth();

  const hasRole = (role: string) => user?.role === role;
  const isAdmin = () => user?.role === "admin";
  const isPharmacyPartner = () => user?.role === "pharmacy_partner";
  const isAdminOrSeller = () => isAdmin();

  return {
    currentUserRole: user?.role ?? "user",
    loading: false,
    hasRole,
    isAdmin,
    isAdminOrSeller,
    isPharmacyPartner,
  };
}
