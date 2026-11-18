// BFF — Backend-For-Frontend
//
// Regra de ouro (LGPD): dado do usuário é EFÊMERO.
//   ✓ processa em memória, repassa ao serviço e descarta
//   ✓ loga SOMENTE metadados (rota, status, duração) — nunca corpo, query ou headers
//   ✓ zero persistência: sem banco, sem cache de resposta, sem error tracker com body
import Fastify from "fastify";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { config } from "./config.js";

const app = Fastify({
  logger: { level: config.logLevel },
  disableRequestLogging: true, // substituído pelo hook abaixo: 1 linha segura por requisição
  bodyLimit: config.bodyLimitBytes,
  requestTimeout: 60_000,
});

await app.register(helmet);
await app.register(rateLimit, {
  max: config.rateLimitMax,
  timeWindow: config.rateLimitWindowMs,
});

// XML e demais content-types chegam como texto cru (o serviço Go consome o XML original;
// JSON tem parser nativo do Fastify e não passa por aqui)
app.addContentTypeParser("*", { parseAs: "string" }, (_req, body, done) => done(null, body));

// 1 linha de log por requisição — sem dado pessoal
app.addHook("onResponse", async (req, reply) => {
  req.log.info({
    event: "request_completed",
    method: req.method,
    route: req.routeOptions?.url ?? "unmatched", // padrão da rota, não a URL real
    status: reply.statusCode,
    durationMs: reply.elapsedTime,
  });
});

// Erros internos nunca vazam detalhes para o cliente
app.setErrorHandler((err, req, reply) => {
  const status = err.statusCode ?? 500;
  req.log.error({ event: "request_error", status, errorType: err.name ?? "Error" });
  if (status >= 500) {
    return reply
      .code(502)
      .send({ erro: "ERRO_INTERNO", mensagem: "Erro inesperado. Tente novamente." });
  }
  reply.code(status).send({ erro: "REQUISICAO_INVALIDA", mensagem: String(err.message).slice(0, 200) });
});

// ---------- proxy para os serviços upstream ----------

async function proxy(req, reply, upstreamUrl, { method = "POST", forwardAllQuery = false, whitelistQuery = [] } = {}) {
  const url = new URL(upstreamUrl);
  if (forwardAllQuery) {
    // Endpoints somente-leitura de tabelas oficiais: filtros são inofensivos
    for (const [k, v] of Object.entries(req.query ?? {})) url.searchParams.set(k, v);
  } else {
    // Endpoints de escrita: somente parâmetros explicitamente autorizados
    for (const k of whitelistQuery) {
      if (req.query?.[k] !== undefined) url.searchParams.set(k, req.query[k]);
    }
  }

  const body =
    method === "GET" ? undefined : typeof req.body === "string" ? req.body : JSON.stringify(req.body ?? {});

  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), config.upstreamTimeoutMs);
  let res;
  try {
    res = await fetch(url, {
      method,
      headers: { "content-type": req.headers["content-type"] ?? "application/json" },
      body,
      signal: ctl.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    const timeout = err?.name === "AbortError";
    req.log.warn({ event: "upstream_error", errorType: timeout ? "timeout" : "unreachable" });
    return reply.code(timeout ? 504 : 502).send({
      erro: "SERVICO_INDISPONIVEL",
      mensagem: "Serviço de cálculo temporariamente indisponível. Tente novamente em instantes.",
    });
  }
  clearTimeout(timer);

  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > config.responseLimitBytes) {
    return reply.code(502).send({ erro: "RESPOSTA_INVALIDA" });
  }
  reply.code(res.status);
  if (buf.length === 0) return reply.send();
  reply.header("content-type", res.headers.get("content-type") ?? "application/json");
  return reply.send(buf);
}

// ---------- rotas públicas ----------

app.get("/health", async () => ({ status: "ok" }));

// CBS/IBS/Imposto Seletivo — regime geral
// (modo observabilidade: erros por item com códigos REG-*, sem interromper os demais)
app.post("/api/calculo/regime-regular", (req, reply) =>
  proxy(req, reply, `${config.regimeUrl}/api/calculadora/observabilidade/regime-geral`));

// CBS/IBS — Simples Nacional (modo observabilidade, códigos VSN-*)
app.post("/api/calculo/simples-nacional", (req, reply) =>
  proxy(req, reply, `${config.simplesUrl}/api/calculadora/observabilidade/simples-nacional`));

// XML NFS-e → PDF DANFSe (stc e canhoto são os únicos parâmetros repassados)
app.post("/api/danfse", (req, reply) =>
  proxy(req, reply, `${config.danfseUrl}/api/danfse`, { whitelistQuery: ["stc", "canhoto"] }));

// Tabelas oficiais (NCM, NBS, alíquotas, fundamentações legais...) — somente leitura
app.get("/api/dados-abertos/*", (req, reply) =>
  proxy(req, reply, `${config.regimeUrl}/api/calculadora/dados-abertos/${req.params["*"]}`, {
    method: "GET",
    forwardAllQuery: true,
  }));

// Atividades do Simples Nacional vigentes em uma data (?data=AAAA-MM-DD)
app.get("/api/simples-nacional/atividades", (req, reply) =>
  proxy(req, reply, `${config.simplesUrl}/api/calculadora/simples-nacional/atividades`, {
    method: "GET",
    forwardAllQuery: true,
  }));

app.get("/api/simples-nacional/atividades/:codigo", (req, reply) =>
  proxy(req, reply, `${config.simplesUrl}/api/calculadora/simples-nacional/atividades/${encodeURIComponent(req.params.codigo)}`, {
    method: "GET",
    forwardAllQuery: true,
  }));

// Painel de versões — o frontend exibe no rodapé ("motor e base atualizados até ...")
// NOTA: confirme o caminho exato de /versao no Swagger de cada serviço (varia entre os repos)
app.get("/api/status", async () => {
  const ping = async (nome, url) => {
    try {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 5000);
      const res = await fetch(url, { signal: ctl.signal });
      clearTimeout(timer);
      return { servico: nome, ok: res.ok, versao: await res.json().catch(() => null) };
    } catch {
      return { servico: nome, ok: false, versao: null };
    }
  };
  const servicos = await Promise.all([
    // regime-regular expõe /versao dentro de dados-abertos (DadosAbertosController);
    // simples-nacional expõe em /api/versao
    ping("regime-regular", `${config.regimeUrl}/api/calculadora/dados-abertos/versao`),
    ping("simples-nacional", `${config.simplesUrl}/api/versao`),
    ping("danfse", `${config.danfseUrl}/health/ready`),
  ]);
  return { ok: servicos.every((s) => s.ok), servicos, verificadoEm: new Date().toISOString() };
});

// ---------- ciclo de vida ----------

process.on("SIGINT", () => void app.close().then(() => process.exit(0)));
process.on("SIGTERM", () => void app.close().then(() => process.exit(0)));

await app.listen({ port: config.port, host: "0.0.0.0" });
