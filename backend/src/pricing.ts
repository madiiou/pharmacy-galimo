// Les prix que le pharmacien saisit (catalogue, devis téléphone, confirmation
// de commande) sont ses prix nets. On les majore de 10% pour obtenir le prix
// facturé au client : la marge Galimo est donc incluse dans le prix affiché,
// sans ligne "frais de service" séparée au moment du paiement.
export const SERVICE_FEE_RATE = 0.1;

export function applyServiceFee(pharmacistPrice: number): number {
  return Math.round(pharmacistPrice * (1 + SERVICE_FEE_RATE));
}
