import React, { useEffect, useRef, useState } from "react";
import { postJSON, getStatus } from "../api.js";
import { TIPOS, montarExport, baixarJson, nomeArquivo, lerArquivoImport, salvarRascunho, lerRascunho } from "../export.js";
import { moeda, uuid, hojeISO } from "../util.js";

const ITEM_VAZIO = () => ({
  cAtivSN: "01",
  cClassTrib: "000001",
  baseCalculo: "950.00",
  valorImpostoSeletivo: "0.00",
  pIBSSN: "",
  pCBSSN: "",
});

const FORM_INICIAL = () => ({
  data: hojeISO(),
  tpDoc: "55",
  CRT: "1",
  tpRegimeIBSCBS: "",
  itens: [ITEM_VAZIO()],
});

function paraPayload(form) {
  const p = {
    id: uuid(),
    versao: "2.0.0",
    data: form.data,
    tpDoc: form.tpDoc,
    CRT: form.CRT,
    itens: form.itens.map((it, i) => {
      const item = {
        numero: i + 1,
        cAtivSN: String(it.cAtivSN).trim(),
        cClassTrib: String(it.cClassTrib).trim(),
        baseCalculo: it.baseCalculo,
        valorImpostoSeletivo: it.valorImpostoSeletivo || "0.00",
      };
      if (it.pIBSSN.trim()) item.pIBSSN = it.pIBSSN.trim();
      if (it.pCBSSN.trim()) item.pCBSSN = it.pCBSSN.trim();
      return item;
    }),
  };
  if (form.tpRegimeIBSCBS) p.tpRegimeIBSCBS = Number(form.tpRegimeIBSCBS);
  return p;
}

function ResultadoSimples({ resultado }) {
  const objetos = resultado?.objetos ?? [];
  return (
    <div>
      <div className="tabela-wrap">
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Estado</th>
              <th>Receita bruta (vRBSNitem)</th>
              <th>Base (vBC)</th>
              <th>% IBS</th>
              <th>IBS</th>
              <th>% CBS</th>
              <th>CBS</th>
            </tr>
          </thead>
          <tbody>
            {objetos.map((o) => {
              const t = o.tribCalc ?? {};
              return (
                <tr key={o.nObj}>
                  <td className="num">{o.nObj}</td>
                  <td>
                    <span className={`badge ${o.estadoItem === "CALCULADO" ? "badge-ok" : "badge-erro"}`}>
                      {o.estadoItem ?? "—"}
                    </span>
                  </td>
                  <td className="num">{moeda(t.vRBSNitem)}</td>
                  <td className="num">{moeda(t.vBC)}</td>
                  <td className="num">{t.pIBSSN ?? "—"}</td>
                  <td className="num">{moeda(t.vIBSSN)}</td>
                  <td className="num">{t.pCBSSN ?? "—"}</td>
                  <td className="num">{moeda(t.vCBSSN)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <details className="memoria">
        <summary>Dados da operação (echo do motor)</summary>
        <pre className="json">{JSON.stringify(resultado?.oper ?? {}, null, 2)}</pre>
      </details>
    </div>
  );
}

export default function CalculoSimples() {
  const [form, setForm] = useState(FORM_INICIAL);
  const [resultado, setResultado] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [msg, setMsg] = useState({ tipo: "", texto: "" });
  const inputImport = useRef(null);

  useEffect(() => {
    const r = lerRascunho(TIPOS.SIMPLES);
    if (r?.itens?.length) {
      setForm(r);
      setMsg({ tipo: "alerta", texto: "Rascunho anterior restaurado do seu navegador." });
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => salvarRascunho(TIPOS.SIMPLES, form), 600);
    return () => clearTimeout(t);
  }, [form]);

  function setCampo(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  function setItem(i, campo, valor) {
    setForm((f) => ({
      ...f,
      itens: f.itens.map((it, idx) => (idx === i ? { ...it, [campo]: valor } : it)),
    }));
  }

  async function calcular(evento) {
    evento.preventDefault();
    setCarregando(true);
    setMsg({ tipo: "", texto: "" });
    setResultado(null);
    try {
      const resposta = await postJSON("/api/calculo/simples-nacional", paraPayload(form));
      setResultado(resposta);
      setMsg({ tipo: "ok", texto: "Cálculo concluído com o motor oficial do Simples Nacional." });
    } catch (e) {
      setMsg({ tipo: "erro", texto: `Falha no cálculo: ${e.message}` });
    } finally {
      setCarregando(false);
    }
  }

  async function exportar() {
    const motor = await getStatus().catch(() => null);
    baixarJson(montarExport(TIPOS.SIMPLES, paraPayload(form), resultado ?? undefined, motor), nomeArquivo(TIPOS.SIMPLES));
    setMsg({ tipo: "ok", texto: "Arquivo de cálculo exportado — ele fica somente com você." });
  }

  async function importar(evento) {
    const file = evento.target.files?.[0];
    evento.target.value = "";
    if (!file) return;
    const r = await lerArquivoImport(file, TIPOS.SIMPLES);
    if (!r.ok) {
      setMsg({ tipo: "erro", texto: `Importação recusada: ${r.erro}` });
      return;
    }
    const e = r.doc.entrada;
    setForm({
      data: e.data ?? hojeISO(),
      tpDoc: e.tpDoc ?? "55",
      CRT: e.CRT ?? "1",
      tpRegimeIBSCBS: e.tpRegimeIBSCBS !== undefined ? String(e.tpRegimeIBSCBS) : "",
      itens: (e.itens ?? []).map((it) => ({
        cAtivSN: it.cAtivSN ?? "",
        cClassTrib: it.cClassTrib ?? "",
        baseCalculo: String(it.baseCalculo ?? ""),
        valorImpostoSeletivo: String(it.valorImpostoSeletivo ?? "0.00"),
        pIBSSN: it.pIBSSN ?? "",
        pCBSSN: it.pCBSSN ?? "",
      })),
    });
    setResultado(null);
    setMsg({ tipo: "ok", texto: `Importado (${r.doc.tipo}). Resultado será recalculado na base atual.` });
  }

  return (
    <div>
      <div className="aviso-efemero">
        <span aria-hidden="true">🔒</span>
        <span>Processamento efêmero — nada é salvo no servidor; rascunho e export ficam com você.</span>
      </div>

      <form className="card" onSubmit={calcular}>
        <h2>Cálculo — Simples Nacional (CBS/IBS na transição)</h2>
        <p className="desc">
          Schema do motor <em>calculadora-rtc-simples-nacional</em>. Na regra de transição (CRT=1) o
          motor classifica a receita bruta (vRBSNitem) sem CBS/IBS; para o cálculo pleno use CRT=3 e
          tpRegimeIBSCBS=2, em datas de incidência já vigentes.
        </p>

        <div className="grid-form">
          <div className="campo">
            <label htmlFor="sn-data">Data da operação</label>
            <input id="sn-data" type="date" required value={form.data} onChange={(e) => setCampo("data", e.target.value)} />
          </div>
          <div className="campo">
            <label htmlFor="sn-tpdoc">Tipo de documento</label>
            <select id="sn-tpdoc" value={form.tpDoc} onChange={(e) => setCampo("tpDoc", e.target.value)}>
              <option value="55">55 — NF-e</option>
              <option value="65">65 — NFC-e</option>
            </select>
          </div>
          <div className="campo">
            <label htmlFor="sn-crt">CRT</label>
            <select id="sn-crt" value={form.CRT} onChange={(e) => setCampo("CRT", e.target.value)}>
              <option value="1">1 — Simples Nacional</option>
              <option value="2">2 — Simples Nacional (excesso sublimite)</option>
              <option value="3">3 — Regime normal</option>
              <option value="4">4 — MEI</option>
            </select>
          </div>
          <div className="campo">
            <label htmlFor="sn-regime">tpRegimeIBSCBS</label>
            <select id="sn-regime" value={form.tpRegimeIBSCBS} onChange={(e) => setCampo("tpRegimeIBSCBS", e.target.value)}>
              <option value="">— não enviar —</option>
              <option value="1">1</option>
              <option value="2">2 (cálculo pleno)</option>
            </select>
            <span className="dica">omitido por padrão; 2 habilita CBS/IBS</span>
          </div>
        </div>

        <div className="cab-itens">
          <h3>Itens ({form.itens.length})</h3>
          <button
            type="button"
            className="btn btn-secundario btn-mini"
            onClick={() => setForm((f) => ({ ...f, itens: [...f.itens, ITEM_VAZIO()] }))}
          >
            + adicionar item
          </button>
        </div>

        {form.itens.map((it, i) => (
          <div className="item" key={i}>
            <span className="num-item">Item {i + 1}</span>
            {form.itens.length > 1 && (
              <button
                type="button"
                className="btn-remover-item"
                onClick={() => setForm((f) => ({ ...f, itens: f.itens.filter((_, idx) => idx !== i) }))}
              >
                remover
              </button>
            )}
            <div className="grid-form">
              <div className="campo">
                <label>Atividade (cAtivSN)</label>
                <input className="mono" value={it.cAtivSN} onChange={(e) => setItem(i, "cAtivSN", e.target.value)} required />
                <span className="dica">consulte a aba Tabelas Oficiais</span>
              </div>
              <div className="campo">
                <label>Class. tributária</label>
                <input
                  className="mono"
                  value={it.cClassTrib}
                  onChange={(e) => setItem(i, "cClassTrib", e.target.value)}
                  required
                />
              </div>
              <div className="campo">
                <label>Base de cálculo (R$)</label>
                <input
                  inputMode="decimal"
                  value={it.baseCalculo}
                  onChange={(e) => setItem(i, "baseCalculo", e.target.value)}
                  required
                />
              </div>
              <div className="campo">
                <label>Imposto Seletivo no item (R$)</label>
                <input
                  inputMode="decimal"
                  value={it.valorImpostoSeletivo}
                  onChange={(e) => setItem(i, "valorImpostoSeletivo", e.target.value)}
                />
                <span className="dica">0,00 quando não houver</span>
              </div>
              <div className="campo">
                <label>% IBS (opcional)</label>
                <input
                  inputMode="decimal"
                  placeholder="da atividade"
                  value={it.pIBSSN}
                  onChange={(e) => setItem(i, "pIBSSN", e.target.value)}
                />
              </div>
              <div className="campo">
                <label>% CBS (opcional)</label>
                <input
                  inputMode="decimal"
                  placeholder="da atividade"
                  value={it.pCBSSN}
                  onChange={(e) => setItem(i, "pCBSSN", e.target.value)}
                />
              </div>
            </div>
          </div>
        ))}

        <div className="acoes">
          <button className="btn btn-primario" type="submit" disabled={carregando}>
            {carregando ? "calculando…" : "Calcular com o motor oficial"}
          </button>
          <button type="button" className="btn btn-secundario" onClick={exportar}>
            Exportar cálculo (.json)
          </button>
          <button type="button" className="btn btn-secundario" onClick={() => inputImport.current?.click()}>
            Importar cálculo
          </button>
          <input
            ref={inputImport}
            type="file"
            accept="application/json,.json"
            style={{ display: "none" }}
            onChange={importar}
          />
        </div>
      </form>

      <div className={`msg msg-${msg.tipo}`}>{msg.texto}</div>

      {resultado && (
        <div className="card">
          <h2>Resultado</h2>
          <ResultadoSimples resultado={resultado} />
        </div>
      )}
    </div>
  );
}
