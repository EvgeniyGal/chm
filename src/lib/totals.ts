type LineItemInput = {
  quantity: number;
  price: number; // without VAT
};

export function calcRowTotal(item: LineItemInput) {
  return round2(item.quantity * item.price);
}

export function calcTotals(items: LineItemInput[]) {
  const totalWithoutVat = round2(items.reduce((sum, it) => sum + calcRowTotal(it), 0));
  const vat20 = round2(totalWithoutVat * 0.2);
  const totalWithVat = round2(totalWithoutVat + vat20);
  return { totalWithoutVat, vat20, totalWithVat };
}

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function formatMoney(n: number) {
  return n.toFixed(2);
}

