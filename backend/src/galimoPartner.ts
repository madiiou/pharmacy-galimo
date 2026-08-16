const BASE_URL = process.env.GALIMO_PARTNER_BASE_URL as string;
const API_KEY = process.env.GALIMO_PARTNER_API_KEY as string;

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getPartnerToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }
  const resp = await fetch(`${BASE_URL}/partner/auth/token`, {
    method: "POST",
    headers: { "x-galimo-partner-key": API_KEY },
  });
  if (!resp.ok) throw new Error(`galimo auth failed: ${resp.status}`);
  const data = await resp.json();
  if (data.error) throw new Error(`galimo auth error: ${JSON.stringify(data)}`);

  cachedToken = {
    token: data.token,
    // On rafraîchit un peu avant l'expiration réelle (24h) par sécurité.
    expiresAt: Date.now() + 23 * 60 * 60 * 1000,
  };
  return cachedToken.token;
}

async function partnerHeaders() {
  return {
    "Content-Type": "application/json",
    "x-galimo-partner-key": API_KEY,
    Authorization: `Bearer ${await getPartnerToken()}`,
  };
}

// Le numéro attendu par Galimo est en 9 chiffres, sans indicatif pays.
export function toGalimoPhone(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, "");
  return digits.slice(-9);
}

export async function requestDebit(params: {
  phone: string;
  amount: number;
  reference: string;
  description: string;
}): Promise<{ idrequest: string; status: string }> {
  const resp = await fetch(`${BASE_URL}/partner/transaction/debit`, {
    method: "POST",
    headers: await partnerHeaders(),
    body: JSON.stringify({
      numero_telephone: toGalimoPhone(params.phone),
      montant: params.amount,
      reference: params.reference,
      description: params.description,
    }),
  });
  const data = await resp.json();
  if (!resp.ok || data.error) {
    throw new Error(data.error_code || data.error || `debit failed: ${resp.status}`);
  }
  return { idrequest: data.idrequest, status: data.status };
}

export async function getTransactionStatus(reference: string) {
  const resp = await fetch(`${BASE_URL}/partner/transaction/status/${reference}`, {
    headers: await partnerHeaders(),
  });
  const data = await resp.json();
  if (!resp.ok || data.error) {
    throw new Error(data.error_code || data.error || `status check failed: ${resp.status}`);
  }
  return data.info as {
    idrequest: string;
    statut: "PENDING" | "WAITING_CLIENT" | "SUCCESS" | "REFUSED" | "EXPIRED" | "FAILED";
    montant: number;
    devise: string;
    numero_client: string;
  };
}
