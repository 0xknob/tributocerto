#!/usr/bin/env node
// Validador de referência do formato de exportação (docs/formato-export.md v1).
//
// Sem dependências: espelha as checagens de docs/formato-export.schema.json
// (a regra mínima de importação). Uso:
//   node scripts/validar-export.mjs [arquivo1.json arquivo2.json ...]
// Sem argumentos, valida todos os exemplos em docs/exemplos/.
//
// Exit 0 = todos válidos; exit 1 = qualquer inválido (saída lista os problemas).

import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const raiz = dirname(dirname(fileURLToPath(import.meta.url)));
const TIPOS = new Set(["calculo-regime-regular", "calculo-simples-nacional", "danfse"]);
const ISO8601 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

function validar(caminho) {
  const erros = [];
  let doc;
  try {
    doc = JSON.parse(readFileSync(caminho, "utf8"));
  } catch (e) {
    return [`JSON inválido: ${e.message}`];
  }

  if (doc.versao !== 1) erros.push(`'versao' deve ser 1 (recebi ${JSON.stringify(doc.versao)})`);
  if (typeof doc.geradoEm !== "string" || !ISO8601.test(doc.geradoEm))
    erros.push(`'geradoEm' deve ser timestamp ISO 8601 (recebi ${JSON.stringify(doc.geradoEm)})`);
  if (!TIPOS.has(doc.tipo))
    erros.push(`'tipo' deve ser um de: ${[...TIPOS].join(", ")} (recebi ${JSON.stringify(doc.tipo)})`);
  if (typeof doc.entrada !== "object" || doc.entrada === null || Array.isArray(doc.entrada))
    erros.push("'entrada' deve ser objeto");

  if (erros.length > 0) return erros; // sem tipo confiável, não validar além da estrutura mínima

  if (doc.tipo === "danfse") {
    if (typeof doc.entrada.xml !== "string" || doc.entrada.xml.length === 0)
      erros.push("danfse: 'entrada.xml' deve ser string não vazia");
    const p = doc.entrada.parametros;
    if (p !== undefined) {
      if (typeof p !== "object" || p === null || Array.isArray(p)) erros.push("danfse: 'entrada.parametros' deve ser objeto");
      else {
        if (p.stc !== undefined && ![0, 1, 2].includes(p.stc)) erros.push("danfse: 'parametros.stc' deve ser 0, 1 ou 2");
        if (p.canhoto !== undefined && typeof p.canhoto !== "boolean") erros.push("danfse: 'parametros.canhoto' deve ser boolean");
        const conhecidos = new Set(["stc", "canhoto"]);
        for (const k of Object.keys(p)) if (!conhecidos.has(k)) erros.push(`danfse: 'parametros' não aceita '${k}'`);
      }
    }
    if ("resultado" in doc) erros.push("danfse: arquivo não deve carregar 'resultado' (PDF é binário)");
  } else {
    if (!Array.isArray(doc.entrada.itens) || doc.entrada.itens.length === 0)
      erros.push(`${doc.tipo}: 'entrada.itens' deve ser array com pelo menos 1 item`);
    if ("resultado" in doc && (typeof doc.resultado !== "object" || doc.resultado === null))
      erros.push("'resultado', quando presente, deve ser objeto");
  }

  if ("motor" in doc && (typeof doc.motor !== "object" || doc.motor === null))
    erros.push("'motor', quando presente, deve ser objeto");

  return erros;
}

const alvos = process.argv.length > 2
  ? process.argv.slice(2)
  : readdirSync(join(raiz, "docs", "exemplos")).filter((f) => f.endsWith(".json")).map((f) => join(raiz, "docs", "exemplos", f));

let falhou = false;
for (const caminho of alvos) {
  const erros = validar(caminho);
  if (erros.length === 0) {
    console.log(`ok    ${caminho}`);
  } else {
    falhou = true;
    console.error(`FALHA ${caminho}`);
    for (const e of erros) console.error(`  - ${e}`);
  }
}
process.exit(falhou ? 1 : 0);
