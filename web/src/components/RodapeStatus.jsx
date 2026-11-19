import React, { useEffect, useState } from "react";
import { getStatus } from "../api.js";

// Rodapé: versões/saúde dos 3 motores (transparência sobre a base em uso).
function versaoCompacta(v) {
  if (v === null || v === undefined) return "—";
  if (typeof v === "string") return v;
  const s = JSON.stringify(v);
  return s.length > 90 ? `${s.slice(0, 90)}…` : s;
}

export default function RodapeStatus() {
  const [status, setStatus] = useState(null);
  const [erro, setErro] = useState("");

  async function atualizar() {
    try {
      setStatus(await getStatus());
      setErro("");
    } catch (e) {
      setErro(e.message);
    }
  }

  useEffect(() => {
    atualizar();
    const t = setInterval(atualizar, 60_000);
    return () => clearInterval(t);
  }, []);

  return (
    <footer className="rodape">
      <div className="rodape-inner">
        <div className="status-linha">
          <strong>Motores de cálculo:</strong>
          {(status?.servicos ?? []).map((s) => (
            <span key={s.servico} className="status-servico" title={versaoCompacta(s.versao)}>
              <span className={`dot ${s.ok ? "dot-ok" : "dot-off"}`} aria-hidden="true" />
              {s.servico}
              {s.ok ? "" : " (fora)"}
            </span>
          ))}
          {status?.verificadoEm && (
            <span className="status-servico">
              · verificado às {new Date(status.verificadoEm).toLocaleTimeString("pt-BR")}
            </span>
          )}
          <button className="btn btn-secundario btn-mini" onClick={atualizar} type="button">
            atualizar
          </button>
          {erro && <span style={{ color: "#f8b4b4" }}>{erro}</span>}
          {!status && !erro && <span>carregando…</span>}
        </div>
        <div className="lgpd">
          Privacidade: processamento <strong>efêmero</strong> — nenhum dado informado é armazenado ou
          registrado em log pelo servidor; cálculos e rascunhos ficam apenas no seu navegador
          (exporte para guardar). Projeto independente sobre os{" "}
          <a href="https://github.com/ReceitaFederal" target="_blank" rel="noreferrer">
            repos open source da Receita Federal
          </a>
          . Não substitui orientação contábil.
        </div>
      </div>
    </footer>
  );
}
