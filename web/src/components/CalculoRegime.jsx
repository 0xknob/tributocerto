import React, { useEffect, useMemo, useRef, useState } from "react";
import { getJSON, postJSON, getStatus } from "../api.js";
import { TIPOS, montarExport, baixarJson, nomeArquivo, lerArquivoImport, salvarRascunho, lerRascunho } from "../export.js";
import { pick, moeda, numero, uuid, agoraDateTimeLocal } from "../util.js";

const ITEM_VAZIO = () => ({
  ncm: "24021000",
  cst: "000",
  cClassTrib: "000001",
  baseCalculo: "200",
  quantidade: "1",
  unidade: "VN",
});

const FORM_INICIAL = () => ({
  dataHoraEmissao: agoraDateTimeLocal(),
  uf: "RS",
  municipio: "4314902",
  itens: [ITEM_VAZIO()],
});

function paraPayload(form) {
  return {
    id: uuid(),
    versao: "0.0.1",
    dataHoraEmissao: new Date(form.dataHoraEmissao).toISOString(),
    municipio: Number(form.municipio),
    uf: form.uf,
    itens: form.itens.map((it, i) => ({
      numero: i + 1,
      ncm: String(it.ncm).trim(),
      cst: String(it.cst).trim(),
      cClassTrib: String(it.cClassTrib).trim(),
      baseCalculo: Number(it.baseCalculo),
      quantidade: Number(it.quantidade || 1),
      unidade: it.unidade || "VN",
    })),
  };
}

// ------- renderização do resultado -------
function ResultadoRegime({ resultado }) {
  const objetos = resultado?.objetos ?? [];
  const tot = resultado?.total?.tribCalc ?? {};
  const totIBS = tot.IBSCBSTot ?? {};
  const totIS = tot.ISTot ?? {};

  const kpis = [
    { rot: "CBS total", val: moeda(totIBS.gCBS?.vCBS) },
    { rot: "IBS total", val: moeda(totIBS.gIBS?.vIBS) },
    { rot: "IBS UF + Mun", val: `${moeda(totIBS.gIBS?.gIBSUF?.vIBSUF)} + ${moeda(totIBS.gIBS?.gIBSMun?.vIBSMun)}` },
    { rot: "Imposto Seletivo", val: moeda(totIS.vIS) },
    { rot: "Base CBS/IBS", val: moeda(totIBS.vBCIBSCBS) },
  ];

  return (
    <div>
      <div className="res-total">
        {kpis.map((k) => (
          <div className="kpi" key={k.rot}>
            <div className="rot">{k.rot}</div>
            <div className="val">{k.val}</div>
          </div>
        ))}
      </div>

      <div className="tabela-wrap">
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Base</th>
              <th>CBS</th>
              <th>IBS UF</th>
              <th>IBS Mun</th>
              <th>IBS total</th>
              <th>Imp. Seletivo</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {objetos.map((o) => {
              const ibs = o.tribCalc?.IBSCBS?.gIBSCBS ?? {};
              const erro = Array.isArray(o.erros) && o.erros.length > 0;
              const estado = o.estadoItem ?? (erro ? "ERRO" : "CALCULADO");
              return (
                <tr key={o.nObj}>
                  <td className="num">{o.nObj}</td>
                  <td className="num">{moeda(ibs.vBC)}</td>
                  <td className="num">{moeda(ibs.gCBS?.vCBS)}</td>
                  <td className="num">{moeda(ibs.gIBSUF?.vIBSUF)}</td>
                  <td className="num">{moeda(ibs.gIBSMun?.vIBSMun)}</td>
                  <td className="num">{moeda(ibs.vIBS)}</td>
                  <td className="num">{moeda(o.tribCalc?.IS?.vIS)}</td>
                  <td>
                    <span className={`badge ${erro ? "badge-erro" : "badge-ok"}`}>{estado}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <details className="memoria">
        <summary>Memórias de cálculo e detalhes por item</summary>
        <ul>
          {objetos.map((o) => (
            <li key={o.nObj}>
              <strong>Item {o.nObj}</strong>
              {o.erros?.length > 0 && (
                <ul>
                  {o.erros.map((e, i) => (
                    <li key={i} style={{ color: "var(--erro)" }}>
                      {e.codigo ?? ""} {e.mensagem ?? JSON.stringify(e)}
                    </li>
                  ))}
                </ul>
              )}
              <ul>
                {o.tribCalc?.IS?.memoriaCalculo && <li>IS: {o.tribCalc.IS.memoriaCalculo}</li>}
                {o.tribCalc?.IBSCBS?.gIBSCBS?.gIBSUF?.memoriaCalculo && (
                  <li>IBS UF: {o.tribCalc.IBSCBS.gIBSCBS.gIBSUF.memoriaCalculo}</li>
                )}
                {o.tribCalc?.IBSCBS?.gIBSCBS?.gIBSMun?.memoriaCalculo && (
                  <li>IBS Mun: {o.tribCalc.IBSCBS.gIBSCBS.gIBSMun.memoriaCalculo}</li>
                )}
                {o.tribCalc?.IBSCBS?.gIBSCBS?.gCBS?.memoriaCalculo && (
                  <li>CBS: {o.tribCalc.IBSCBS.gIBSCBS.gCBS.memoriaCalculo}</li>
                )}
              </ul>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}

// ------- componente principal -------
export default function CalculoRegime() {
  const [form, setForm] = useState(FORM_INICIAL);
  const [ufs, setUfs] = useState([]);
  const [municipios, setMunicipios] = useState([]);
  const [resultado, setResultado] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [msg, setMsg] = useState({ tipo: "", texto: "" });
  const inputImport = useRef(null);

  // rascunho (best-effort, só no navegador)
  useEffect(() => {
    const r = lerRascunho(TIPOS.REGIME);
    if (r?.itens?.length) {
      setForm(r);
      setMsg({ tipo: "alerta", texto: "Rascunho anterior restaurado do seu navegador." });
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => salvarRascunho(TIPOS.REGIME, form), 600);
    return () => clearTimeout(t);
  }, [form]);

  useEffect(() => {
    getJSON("/api/dados-abertos/ufs")
      .then((lista) => setUfs(Array.isArray(lista) ? lista : []))
      .catch(() => setUfs([]));
  }, []);

  async function carregarMunicipios(sigla) {
    setMunicipios([]);
    if (!sigla) return;
    try {
      const lista = await getJSON(`/api/dados-abertos/ufs/municipios?siglaUf=${encodeURIComponent(sigla)}`);
      setMunicipios(Array.isArray(lista) ? lista : []);
    } catch {
      setMunicipios([]);
    }
  }

  function setCampo(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
    if (campo === "uf") carregarMunicipios(valor);
  }

  function setItem(i, campo, valor) {
    setForm((f) => {
      const itens = f.itens.map((it, idx) => (idx === i ? { ...it, [campo]: valor } : it));
      return { ...f, itens };
    });
  }

  async function calcular(evento) {
    evento.preventDefault();
    setCarregando(true);
    setMsg({ tipo: "", texto: "" });
    setResultado(null);
    try {
      const payload = paraPayload(form);
      const resposta = await postJSON("/api/calculo/regime-regular", payload);
      setResultado(resposta);
      setMsg({ tipo: "ok", texto: "Cálculo concluído com o motor oficial da Receita Federal." });
    } catch (e) {
      setMsg({ tipo: "erro", texto: `Falha no cálculo: ${e.message}` });
    } finally {
      setCarregando(false);
    }
  }

  async function exportar() {
    const motor = await getStatus().catch(() => null);
    const doc = montarExport(TIPOS.REGIME, paraPayload(form), resultado ?? undefined, motor);
    baixarJson(doc, nomeArquivo(TIPOS.REGIME));
    setMsg({ tipo: "ok", texto: "Arquivo de cálculo exportado — ele fica somente com você." });
  }

  async function importar(evento) {
    const file = evento.target.files?.[0];
    evento.target.value = "";
    if (!file) return;
    const r = await lerArquivoImport(file, TIPOS.REGIME);
    if (!r.ok) {
      setMsg({ tipo: "erro", texto: `Importação recusada: ${r.erro}` });
      return;
    }
    const e = r.doc.entrada;
    setForm({
      dataHoraEmissao: e.dataHoraEmissao?.slice(0, 16) ?? agoraDateTimeLocal(),
      uf: e.uf ?? "",
      municipio: String(e.municipio ?? ""),
      itens: (e.itens ?? []).map((it) => ({
        ncm: it.ncm ?? "",
        cst: it.cst ?? "",
        cClassTrib: it.cClassTrib ?? "",
        baseCalculo: String(it.baseCalculo ?? ""),
        quantidade: String(it.quantidade ?? 1),
        unidade: it.unidade ?? "VN",
      })),
    });
    if (e.uf) carregarMunicipios(e.uf);
    setResultado(null);
    setMsg({
      tipo: "ok",
      texto: `Importado (${r.doc.tipo}). O resultado é recalculado sob demanda — valores podem diferir com a base oficial atual.`,
    });
  }

  const siglaUf = (u) => pick(u, ["sigla", "siglaUf", "uf", "siglaUF"], "");
  const nomeUf = (u) => `${siglaUf(u)}${pick(u, ["nome", "name"], "") ? ` — ${pick(u, ["nome", "name"], "")}` : ""}`;
  const codMun = (m) => String(pick(m, ["codigo", "codMunicipio", "codigoMunicipio", "cod"], ""));
  const nomeMun = (m) => pick(m, ["nome", "nomeMunicipio", "municipio", "name"], codMun(m));

  const totalBase = useMemo(
    () => form.itens.reduce((s, it) => s + (Number(it.baseCalculo) || 0), 0),
    [form.itens]
  );

  return (
    <div>
      <div className="aviso-efemero">
        <span aria-hidden="true">🔒</span>
        <span>
          Nada é salvo no servidor: o cálculo é processado e descartado. Um <strong>rascunho</strong>{" "}
          destes campos fica no seu navegador e você pode <strong>exportar</strong> o cálculo em
          arquivo (formato aberto v1) para guardar ou reimportar.
        </span>
      </div>

      <form className="card" onSubmit={calcular}>
        <h2>Cálculo — Regime Regular (CBS, IBS e Imposto Seletivo)</h2>
        <p className="desc">
          Documento fiscal com itens por NCM/NBS. Campos conforme o schema oficial do motor
          <em> calculadora-rtc-regime-regular</em> da Receita Federal.
        </p>

        <div className="grid-form">
          <div className="campo">
            <label htmlFor="rr-data">Data/hora de emissão</label>
            <input
              id="rr-data"
              type="datetime-local"
              required
              value={form.dataHoraEmissao}
              onChange={(e) => setCampo("dataHoraEmissao", e.target.value)}
            />
          </div>
          <div className="campo">
            <label htmlFor="rr-uf">UF</label>
            <select id="rr-uf" value={form.uf} onChange={(e) => setCampo("uf", e.target.value)}>
              {ufs.length === 0 && <option value={form.uf}>{form.uf}</option>}
              {ufs.map((u, i) => (
                <option key={`${siglaUf(u)}-${i}`} value={siglaUf(u)}>
                  {nomeUf(u)}
                </option>
              ))}
            </select>
          </div>
          <div className="campo">
            <label htmlFor="rr-mun">Município (código IBGE)</label>
            <select id="rr-mun" value={form.municipio} onChange={(e) => setCampo("municipio", e.target.value)}>
              <option value={form.municipio}>{form.municipio}</option>
              {municipios.map((m, i) => (
                <option key={`${codMun(m)}-${i}`} value={codMun(m)}>
                  {codMun(m)} — {nomeMun(m)}
                </option>
              ))}
            </select>
            <span className="dica">
              carregue a lista ao trocar a UF; o código pode ser digitado se a lista não carregar
            </span>
          </div>
        </div>

        <div className="cab-itens">
          <h3>Itens do documento ({form.itens.length}) · base total {numero(totalBase)}</h3>
          <button
            type="button"
            className="btn btn-secundario btn-mini"
            onClick={() => setForm((f) => ({ ...f, itens: [...f.itens, ITEM_VAZIO()] }))}
          >
            + adicionar item
          </button>
        </div>

        {form.itens.map((it, i) => (
          <fieldset className="item" key={i} style={{ border: "none", padding: 0 }}>
            <legend className="sr-only" style={{ position: "absolute", left: -9999 }}>
              Item {i + 1}
            </legend>
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
                <label>NCM/NBS</label>
                <input className="mono" value={it.ncm} onChange={(e) => setItem(i, "ncm", e.target.value)} required />
              </div>
              <div className="campo">
                <label>CST</label>
                <input className="mono" value={it.cst} onChange={(e) => setItem(i, "cst", e.target.value)} required />
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
                  type="number"
                  step="0.01"
                  min="0"
                  value={it.baseCalculo}
                  onChange={(e) => setItem(i, "baseCalculo", e.target.value)}
                  required
                />
              </div>
              <div className="campo">
                <label>Quantidade</label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  value={it.quantidade}
                  onChange={(e) => setItem(i, "quantidade", e.target.value)}
                />
              </div>
              <div className="campo">
                <label>Unidade</label>
                <input value={it.unidade} onChange={(e) => setItem(i, "unidade", e.target.value)} />
                <span className="dica">VN = valor (unidade não especificada)</span>
              </div>
            </div>
          </fieldset>
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
          <p className="desc">Calculado pelo motor oficial em tempo real — sem interpolação ou tabela própria.</p>
          <ResultadoRegime resultado={resultado} />
        </div>
      )}
    </div>
  );
}
