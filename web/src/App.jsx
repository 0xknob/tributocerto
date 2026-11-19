import React, { useState } from "react";
import CalculoRegime from "./components/CalculoRegime.jsx";
import CalculoSimples from "./components/CalculoSimples.jsx";
import Danfse from "./components/Danfse.jsx";
import Tabelas from "./components/Tabelas.jsx";
import RodapeStatus from "./components/RodapeStatus.jsx";

const ABAS = [
  { id: "regime", rotulo: "Regime Regular" },
  { id: "simples", rotulo: "Simples Nacional" },
  { id: "danfse", rotulo: "DANFSe" },
  { id: "tabelas", rotulo: "Tabelas Oficiais" },
];

export default function App() {
  const [aba, setAba] = useState("regime");

  return (
    <div className="app">
      <header className="topo">
        <div className="topo-inner">
          <div className="marca">
            <h1>TributoCerto</h1>
            <span className="sub">CBS · IBS · Imposto Seletivo · DANFSe — Lei Complementar 214/2025</span>
            <span className="selo-oficial">motores open source da Receita Federal</span>
          </div>
          <nav className="abas" aria-label="Seções do site">
            {ABAS.map((a) => (
              <button key={a.id} className={`aba ${aba === a.id ? "ativa" : ""}`} onClick={() => setAba(a.id)}>
                {a.rotulo}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="conteudo">
        {aba === "regime" && <CalculoRegime />}
        {aba === "simples" && <CalculoSimples />}
        {aba === "danfse" && <Danfse />}
        {aba === "tabelas" && <Tabelas />}
      </main>

      <RodapeStatus />
    </div>
  );
}
