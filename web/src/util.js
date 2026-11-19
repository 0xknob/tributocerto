// Utilitários pequenos e sem dependências.

// Pega o primeiro campo existente de um objeto (defensivo p/ respostas de
// serviços upstream cujos nomes de campo podem variar).
export function pick(obj, chaves, fallback = "") {
  if (!obj || typeof obj !== "object") return fallback;
  for (const c of chaves) if (obj[c] !== undefined && obj[c] !== null) return obj[c];
  return fallback;
}

const fmtMoedaIntl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

// "950.00" | 950 | "R$ 950" → "R$ 950,00" (devolve o original se não for número)
export function moeda(v) {
  if (v === undefined || v === null || v === "") return "—";
  const n = typeof v === "number" ? v : Number(String(v).replace(/[^\d,.-]/g, "").replace(",", "."));
  return Number.isFinite(n) ? fmtMoedaIntl.format(n) : String(v);
}

export function numero(v) {
  if (v === undefined || v === null || v === "") return "—";
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString("pt-BR") : String(v);
}

export function uuid() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// Valor para <input type="datetime-local"> a partir de agora
export function agoraDateTimeLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// "2026-03-15" → "15/03/2026"
export function dataBR(iso) {
  if (!iso || typeof iso !== "string") return String(iso ?? "—");
  const [a, m, d] = iso.split("-");
  return d && m ? `${d}/${m}/${a}` : iso;
}

function pad(n) {
  return String(n).padStart(2, "0");
}
