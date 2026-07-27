export const formatGNF = (n: number): string =>
  new Intl.NumberFormat("fr-FR").format(Math.round(n)).replace(/\u202f/g, " ") + " GNF";

export const generateOrderRef = (): string =>
  "GAL-" + Math.floor(1000 + Math.random() * 9000);
