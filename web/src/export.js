// Formato de exportação v1 — docs/formato-export.md
// Princípio LGPD: o dado do usuário fica com o usuário. O servidor nunca guarda nada.

export const TIPOS = {
  REGIME: "calculo-regime-regular",
  SIMPLES: "calculo-simples-nacional",
  DANFSE: "danfse",
};

const pad = (n) => String(n).padStart(2, "0");

export function nomeArquivo(tipo) {
  const d = new Date();
  const dataHora = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
  return `calculo-rtc-${tipo}-${dataHora}.json`;
}

export function montarExport(tipo, entrada, resultado, motor) {
  const doc = { versao: 1, geradoEm: new Date().toISOString(), tipo, entrada };
  if (resultado !== undefined && tipo !== TIPOS.DANFSE) doc.resultado = resultado;
  if (motor) doc.motor = motor;
  return doc;
}

export function baixarJson(obj, nomeArquivo) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo;
  a.click();
  URL.revokeObjectURL(url);
}

// Validação mínima da reimportação (regra 2 do formato: validar só o mínimo,
// resultado é recalculado sob demanda).
export async function lerArquivoImport(file, tipoEsperado) {
  let doc;
  try {
    doc = JSON.parse(await file.text());
  } catch {
    return { ok: false, erro: "Arquivo não é um JSON válido." };
  }
  if (doc.versao !== 1) return { ok: false, erro: `Versão do formato desconhecida (${JSON.stringify(doc.versao)}); esperada 1.` };
  if (!Object.values(TIPOS).includes(doc.tipo)) return { ok: false, erro: `'tipo' inválido: ${JSON.stringify(doc.tipo)}.` };
  if (tipoEsperado && doc.tipo !== tipoEsperado) {
    return { ok: false, erro: `Arquivo é do tipo '${doc.tipo}'; abra na aba correspondente.` };
  }
  if (typeof doc.entrada !== "object" || doc.entrada === null) return { ok: false, erro: "'entrada' ausente ou inválida." };
  if (doc.tipo === TIPOS.DANFSE) {
    if (typeof doc.entrada.xml !== "string" || !doc.entrada.xml.trim())
      return { ok: false, erro: "danfse: 'entrada.xml' ausente." };
  } else if (!Array.isArray(doc.entrada.itens) || doc.entrada.itens.length === 0) {
    return { ok: false, erro: "'entrada.itens' ausente ou vazio." };
  }
  return { ok: true, doc };
}

// Rascunho no navegador (nada vai para o servidor)
const chaveRascunho = (tipo) => `tributocerto:rascunho:${tipo}`;

export function salvarRascunho(tipo, form) {
  try {
    localStorage.setItem(chaveRascunho(tipo), JSON.stringify(form));
  } catch {
    /* localStorage cheio/indisponível: rascunho é best-effort */
  }
}

export function lerRascunho(tipo) {
  try {
    const bruto = localStorage.getItem(chaveRascunho(tipo));
    return bruto ? JSON.parse(bruto) : null;
  } catch {
    return null;
  }
}

export function limparRascunho(tipo) {
  try {
    localStorage.removeItem(chaveRascunho(tipo));
  } catch {
    /* idem */
  }
}
