import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function Login() {
  const { login, token, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const expired = searchParams.get("expired") === "1";

  // Où aller après connexion : la page demandée, sinon l'espace du rôle.
  const destination = (role?: string) =>
    searchParams.get("redirect") || (role === "pharmacy_partner" ? "/pharmacien" : role === "admin" ? "/admin-pharmacies" : "/");

  // Déjà connecté : inutile de ressaisir le mot de passe.
  useEffect(() => {
    if (token && !expired) navigate(destination(user?.role), { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const u = await login(email.trim(), password);
      navigate(destination(u.role), { replace: true });
    } catch (err) {
      const msg = (err as Error).message;
      setError(
        /invalid credentials|401/i.test(msg)
          ? "Email ou mot de passe incorrect."
          : /failed to fetch|network/i.test(msg)
            ? "Connexion impossible. Vérifiez votre réseau et réessayez."
            : msg
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow w-80 space-y-4">
        <h1 className="text-xl font-semibold text-center">Pharmacy Galimo</h1>
        {expired && !error && <p className="text-amber-700 bg-amber-50 rounded px-3 py-2 text-sm">Votre session a expiré. Reconnectez-vous pour continuer.</p>}
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border rounded px-3 py-2"
          required
        />
        <input
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border rounded px-3 py-2"
          required
        />
        <button type="submit" disabled={busy} className="w-full bg-green-600 text-white rounded py-2 font-medium disabled:opacity-60">
          {busy ? "Connexion…" : "Se connecter"}
        </button>
      </form>
    </div>
  );
}
