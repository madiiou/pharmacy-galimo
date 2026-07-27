import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { Login } from "./pages/Login";
import { Pharmacies } from "./pages/Pharmacies";
import { Medicines } from "./pages/Medicines";
import { Orders } from "./pages/Orders";
import { OrderDetail } from "./pages/OrderDetail";

function RequireAuth({ children }: { children: JSX.Element }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/pharmacies" element={<RequireAuth><Pharmacies /></RequireAuth>} />
          <Route path="/medicines" element={<RequireAuth><Medicines /></RequireAuth>} />
          <Route path="/orders" element={<RequireAuth><Orders /></RequireAuth>} />
          <Route path="/orders/:id" element={<RequireAuth><OrderDetail /></RequireAuth>} />
          <Route path="*" element={<Navigate to="/pharmacies" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
