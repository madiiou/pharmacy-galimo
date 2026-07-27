import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { Login } from "./pages/Login";
import { Pharmacies } from "./pages/Pharmacies";
import { Medicines } from "./pages/Medicines";
import { Orders } from "./pages/Orders";
import { OrderDetail } from "./pages/OrderDetail";
import Pharmacy from "./pages/Pharmacy";

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
          <Route path="/login" element={<Login />} />
          <Route path="/shop" element={<RequireAuth><Pharmacy /></RequireAuth>} />
          <Route path="/pharmacies" element={<RequireAuth><Pharmacies /></RequireAuth>} />
          <Route path="/medicines" element={<RequireAuth><Medicines /></RequireAuth>} />
          <Route path="/orders" element={<RequireAuth><Orders /></RequireAuth>} />
          <Route path="/orders/:id" element={<RequireAuth><OrderDetail /></RequireAuth>} />
          <Route path="*" element={<Navigate to="/shop" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
