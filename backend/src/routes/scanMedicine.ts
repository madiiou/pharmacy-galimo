import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../auth.js";

export const scanMedicineRouter = Router();

const SYSTEM_PROMPT = `Tu es un expert pharmacien. Analyse la photo d'une boîte de médicament et extrais les informations au format JSON strict.
Catégories possibles: "fievre" (antalgiques/fièvre), "antibio" (antibiotiques), "vitamines", "cardio" (cardiovasculaire), "soins" (dermato/soins), "bebe" (bébé/nourrisson).
Stock: toujours "high" par défaut.

Retourne UNIQUEMENT un objet JSON valide (pas de markdown, pas de texte) avec ces champs:
{
  "name": "nom commercial (ex: Doliprane)",
  "dosage": "dosage et format (ex: 500 mg — 16 cp)",
  "description": "brève indication thérapeutique (1 phrase)",
  "category": "fievre|antibio|vitamines|cardio|soins|bebe",
  "emoji": "un seul emoji représentatif",
  "prescription": true|false,
  "confidence": "high|medium|low"
}

Si la boîte n'est pas lisible ou pas un médicament, retourne {"error": "raison"}.`;

const bodySchema = z.object({ image: z.string().min(1) });

scanMedicineRouter.post("/", requireAuth, async (req, res) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Scan non configuré (OPENAI_API_KEY manquante)" });
  }

  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: SYSTEM_PROMPT },
              { type: "image_url", image_url: { url: parsed.data.image } },
            ],
          },
        ],
      }),
    });

    if (!resp.ok) {
      const details = await resp.text();
      return res.status(resp.status).json({ error: "Vision API error", details });
    }

    const data = await resp.json();
    let content: string = data?.choices?.[0]?.message?.content ?? "";
    content = content.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();

    let result: unknown;
    try {
      result = JSON.parse(content);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      result = match ? JSON.parse(match[0]) : { error: "parse failed" };
    }

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "unknown" });
  }
});
