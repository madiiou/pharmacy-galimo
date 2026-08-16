import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { Login } from "./pages/Login";
import { Home } from "./pages/Home";
import { Pharmacies } from "./pages/Pharmacies";
import { Medicines } from "./pages/Medicines";
import { Orders } from "./pages/Orders";
import { OrderDetail } from "./pages/OrderDetail";
import { ManualOrder } from "./pages/ManualOrder";
import { Users } from "./pages/Users";
import { GalimoBalance } from "./pages/GalimoBalance";
import Pharmacy from "./pages/Pharmacy";
import AdminPharmacies from "./pages/AdminPharmacies";

function RequireAuth({ children }: { children: JSX.Element }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <Toaster richColors position="top-center" />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/shop" element={<Pharmacy />} />
          <Route path="/admin-pharmacies" element={<RequireAuth><AdminPharmacies /></RequireAuth>} />
          <Route path="/pharmacies" element={<RequireAuth><Pharmacies /></RequireAuth>} />
          <Route path="/medicines" element={<RequireAuth><Medicines /></RequireAuth>} />
          <Route path="/orders" element={<RequireAuth><Orders /></RequireAuth>} />
          <Route path="/orders/new" element={<RequireAuth><ManualOrder /></RequireAuth>} />
          <Route path="/orders/:id" element={<RequireAuth><OrderDetail /></RequireAuth>} />
          <Route path="/users" element={<RequireAuth><Users /></RequireAuth>} />
          <Route path="/galimo-balance" element={<RequireAuth><GalimoBalance /></RequireAuth>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
