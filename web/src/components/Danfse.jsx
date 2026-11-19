import React, { useEffect, useRef, useState } from "react";
import { gerarDanfse, getStatus } from "../api.js";
import { TIPOS, montarExport, baixarJson, nomeArquivo, lerArquivoImport, salvarRascunho, lerRascunho } from "../export.js";
import xmlExemplo from "../assets/exemplo-nfse.xml?raw";

const FORM_INICIAL = { xml: "", stc: "0", canhoto: true };

export default function Danfse() {
  const [form, setForm] = useState(FORM_INICIAL);
  const [carregando, setCarregando] = useState(false);
  const [msg, setMsg] = useState({ tipo: "", texto: "" });
  const [pdf, setPdf] = useState(null); // { url, tamanhoKb }
  const inputArquivo = useRef(null);
  const inputImport = useRef(null);

  useEffect(() => {
    const r = lerRascunho(TIPOS.DANFSE);
    if (r?.xml) {
      setForm(r);
      setMsg({ tipo: "alerta", texto: "Rascunho anterior restaurado do seu navegador." });
    }
    return () => {
      if (pdf) URL.revokeObjectURL(pdf.url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(() => salvarRascunho(TIPOS.DANFSE, form), 600);
    return () => clearTimeout(t);
  }, [form]);

  function setCampo(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function lerXmlDeArquivo(evento) {
    const file = evento.target.files?.[0];
    evento.target.value = "";
    if (!file) return;
    setCampo("xml", await file.text());
    setMsg({ tipo: "ok", texto: `XML carregado: ${file.name} (${Math.round(file.size / 1024)} KB).` });
  }

  async function gerar(evento) {
    evento.preventDefault();
    setCarregando(true);
    setMsg({ tipo: "", texto: "" });
    if (pdf) URL.revokeObjectURL(pdf.url);
    setPdf(null);
    try {
      const blob = await gerarDanfse(form.xml, { stc: Number(form.stc), canhoto: form.canhoto });
      setPdf({ url: URL.createObjectURL(blob), tamanhoKb: Math.max(1, Math.round(blob.size / 1024)) });
      setMsg({ tipo: "ok", texto: "DANFSe gerado em PDF pelo motor oficial." });
    } catch (e) {
      setMsg({ tipo: "erro", texto: `Falha na geração: ${e.message}` });
    } finally {
      setCarregando(false);
    }
  }

  async function exportar() {
    const motor = await getStatus().catch(() => null);
    const doc = montarExport(
      TIPOS.DANFSE,
      { xml: form.xml, parametros: { stc: Number(form.stc), canhoto: form.canhoto } },
      undefined,
      motor
    );
    baixarJson(doc, nomeArquivo(TIPOS.DANFSE));
    setMsg({ tipo: "ok", texto: "Exportado (XML + parâmetros). O PDF é regenerado ao reimportar." });
  }

  async function importar(evento) {
    const file = evento.target.files?.[0];
    evento.target.value = "";
    if (!file) return;
    const r = await lerArquivoImport(file, TIPOS.DANFSE);
    if (!r.ok) {
      setMsg({ tipo: "erro", texto: `Importação recusada: ${r.erro}` });
      return;
    }
    const p = r.doc.entrada.parametros ?? {};
    setForm({
      xml: r.doc.entrada.xml,
      stc: p.stc !== undefined ? String(p.stc) : "0",
      canhoto: p.canhoto !== undefined ? p.canhoto : true,
    });
    setPdf(null);
    setMsg({ tipo: "ok", texto: "XML importado — gere o PDF novamente." });
  }

  return (
    <div>
      <div className="aviso-efemero">
        <span aria-hidden="true">🔒</span>
        <span>
          O XML de NFS-e contém dados do prestador e do tomador. Ele é processado de forma efêmera
          para gerar o PDF e nunca é armazenado pelo servidor.
        </span>
      </div>

      <form className="card" onSubmit={gerar}>
        <h2>DANFSe — XML de NFS-e em PDF</h2>
        <p className="desc">
          Cole (ou carregue) o XML de NFS-e no layout da NT-008/CGNFSe. Layout e regras do motor
          oficial <em>calculadora-rtc-gerador-danfse</em>.
        </p>

        <div className="grid-form" style={{ marginBottom: 12 }}>
          <div className="campo">
            <label htmlFor="df-stc">Situação da nota (stc)</label>
            <select id="df-stc" value={form.stc} onChange={(e) => setCampo("stc", e.target.value)}>
              <option value="0">0 — válida</option>
              <option value="1">1 — substituída</option>
              <option value="2">2 — cancelada</option>
            </select>
          </div>
          <div className="campo">
            <label htmlFor="df-canhoto">Canhoto</label>
            <select
              id="df-canhoto"
              value={form.canhoto ? "1" : "0"}
              onChange={(e) => setCampo("canhoto", e.target.value === "1")}
            >
              <option value="1">exibir canhoto</option>
              <option value="0">ocultar canhoto</option>
            </select>
          </div>
        </div>

        <div className="campo">
          <label htmlFor="df-xml">XML da NFS-e</label>
          <textarea
            id="df-xml"
            className="xml"
            placeholder="<NFSe versao=&quot;1.01&quot; …>"
            value={form.xml}
            onChange={(e) => setCampo("xml", e.target.value)}
            required
          />
        </div>

        <div className="acoes">
          <button className="btn btn-primario" type="submit" disabled={carregando || !form.xml.trim()}>
            {carregando ? "gerando PDF…" : "Gerar DANFSe (PDF)"}
          </button>
          <button type="button" className="btn btn-secundario" onClick={() => inputArquivo.current?.click()}>
            Carregar arquivo .xml
          </button>
          <button
            type="button"
            className="btn btn-secundario"
            onClick={() => {
              setCampo("xml", xmlExemplo);
              setMsg({ tipo: "ok", texto: "XML de exemplo (dados fictícios de teste da Receita) carregado." });
            }}
          >
            Usar XML de exemplo
          </button>
          <input
            ref={inputArquivo}
            type="file"
            accept=".xml,application/xml,text/xml"
            style={{ display: "none" }}
            onChange={lerXmlDeArquivo}
          />
          <button type="button" className="btn btn-secundario" onClick={exportar} disabled={!form.xml.trim()}>
            Exportar (.json)
          </button>
          <button type="button" className="btn btn-secundario" onClick={() => inputImport.current?.click()}>
            Importar
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

      {pdf && (
        <div className="card">
          <h2>PDF pronto</h2>
          <p className="desc">
            {pdf.tamanhoKb} KB — gerado agora pelo motor oficial, direto na memória do seu navegador.
          </p>
          <a className="btn btn-primario" href={pdf.url} download="danfse.pdf">
            Baixar danfse.pdf
          </a>
        </div>
      )}
    </div>
  );
}
