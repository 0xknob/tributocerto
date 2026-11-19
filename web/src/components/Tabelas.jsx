import React, { useEffect, useState } from "react";
import { getJSON } from "../api.js";
import { pick, hojeISO } from "../util.js";

// Tabela genérica: deriva colunas do primeiro objeto da lista (defensivo p/
// respostas de dados abertos cuja forma pode evoluir).
function AutoTable({ data }) {
  if (!Array.isArray(data) || data.length === 0) return <p className="desc">Nenhum resultado.</p>;
  const colunas = [...new Set(data.flatMap((o) => (o && typeof o === "object" ? Object.keys(o) : [])))].slice(0, 8);
  return (
    <div className="tabela-wrap">
      <table>
        <thead>
          <tr>
            {colunas.map((c) => (
              <th key={c}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.slice(0, 200).map((linha, i) => (
            <tr key={i}>
              {colunas.map((c) => (
                <td key={c} className={typeof linha?.[c] === "number" ? "num" : ""}>
                  {typeof linha?.[c] === "object" ? JSON.stringify(linha[c]) : String(linha?.[c] ?? "—").slice(0, 120)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const SUBTABS = [
  { id: "ncm", rotulo: "NCM (bens)" },
  { id: "nbs", rotulo: "NBS (serviços)" },
  { id: "mun", rotulo: "Municípios" },
  { id: "ativ", rotulo: "Atividades — Simples" },
];

export default function Tabelas() {
  const [aba, setAba] = useState("ncm");
  const [codigo, setCodigo] = useState("");
  const [data, setData] = useState(hojeISO());
  const [ufs, setUfs] = useState([]);
  const [uf, setUf] = useState("RS");
  const [resultado, setResultado] = useState(null); // { tipo: 'lista'|'objeto', dados }
  const [carregando, setCarregando] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    getJSON("/api/dados-abertos/ufs")
      .then((l) => setUfs(Array.isArray(l) ? l : []))
      .catch(() => setUfs([]));
  }, []);

  async function consultar() {
    setCarregando(true);
    setMsg("");
    setResultado(null);
    try {
      let dados;
      if (aba === "ncm") {
        dados = await getJSON(`/api/dados-abertos/ncm?ncm=${encodeURIComponent(codigo.trim())}&data=${data}`);
      } else if (aba === "nbs") {
        dados = await getJSON(`/api/dados-abertos/nbs?nbs=${encodeURIComponent(codigo.trim())}&data=${data}`);
      } else if (aba === "mun") {
        dados = await getJSON(`/api/dados-abertos/ufs/municipios?siglaUf=${encodeURIComponent(uf)}`);
      } else {
        // atividades do Simples: por código, ou lista vigente na data
        const c = codigo.trim();
        dados = c
          ? await getJSON(`/api/simples-nacional/atividades/${encodeURIComponent(c)}?data=${data}`)
          : await getJSON(`/api/simples-nacional/atividades?data=${data}`);
      }
      setResultado({ tipo: Array.isArray(dados) ? "lista" : "objeto", dados });
    } catch (e) {
      setMsg(e.message);
    } finally {
      setCarregando(false);
    }
  }

  const placeholder = { ncm: "ex.: 24021000", nbs: "ex.: 101011100", mun: "", ativ: "código da atividade (vazio = listar todas)" }[aba];
  const titulo = {
    ncm: "Consulta NCM — Nomenclatura Comum do Mercosul (bens)",
    nbs: "Consulta NBS — Nomenclatura Brasileira de Serviços",
    mun: "Municípios por UF (código IBGE — use no cálculo do regime regular)",
    ativ: "Atividades do Simples Nacional vigentes na data",
  }[aba];

  return (
    <div>
      <div className="subtabs" role="tablist">
        {SUBTABS.map((t) => (
          <button
            key={t.id}
            className={`subtab ${aba === t.id ? "ativa" : ""}`}
            onClick={() => {
              setAba(t.id);
              setResultado(null);
              setCodigo("");
              setMsg("");
            }}
          >
            {t.rotulo}
          </button>
        ))}
      </div>

      <div className="card">
        <h2>{titulo}</h2>
        <p className="desc">Tabelas oficiais servidas pelo próprio motor da Receita Federal (dados abertos).</p>

        <form
          className="grid-form"
          onSubmit={(e) => {
            e.preventDefault();
            consultar();
          }}
        >
          {aba === "mun" ? (
            <div className="campo">
              <label htmlFor="tb-uf">UF</label>
              <select id="tb-uf" value={uf} onChange={(e) => setUf(e.target.value)}>
                {ufs.map((u, i) => {
                  const s = pick(u, ["sigla", "siglaUf", "uf"], "");
                  return (
                    <option key={`${s}-${i}`} value={s}>
                      {s}
                    </option>
                  );
                })}
                {ufs.length === 0 && <option value={uf}>{uf}</option>}
              </select>
            </div>
          ) : (
            <div className="campo">
              <label htmlFor="tb-codigo">Código</label>
              <input
                id="tb-codigo"
                className="mono"
                value={codigo}
                placeholder={placeholder}
                onChange={(e) => setCodigo(e.target.value)}
                required={aba === "ncm" || aba === "nbs"}
              />
            </div>
          )}
          {aba !== "mun" && (
            <div className="campo">
              <label htmlFor="tb-data">Data de referência</label>
              <input id="tb-data" type="date" value={data} onChange={(e) => setData(e.target.value)} required />
            </div>
          )}
          <div className="campo" style={{ justifyContent: "flex-end" }}>
            <button className="btn btn-primario" type="submit" disabled={carregando}>
              {carregando ? "consultando…" : "Consultar"}
            </button>
          </div>
        </form>
      </div>

      <div className="msg msg-erro">{msg}</div>

      {resultado && (
        <div className="card">
          <h2>Resultado</h2>
          {resultado.tipo === "lista" ? (
            <AutoTable data={resultado.dados} />
          ) : (
            <pre className="json">{JSON.stringify(resultado.dados, null, 2)}</pre>
          )}
        </div>
      )}
    </div>
  );
}
