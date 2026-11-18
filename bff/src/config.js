// Configuração via variáveis de ambiente (defaults para desenvolvimento local)
export const config = {
  port: Number(process.env.PORT ?? 3000),
  logLevel: process.env.LOG_LEVEL ?? "info",

  // Endereços internos dos serviços (nomes do docker-compose)
  regimeUrl: process.env.REGIME_URL ?? "http://localhost:8080",
  simplesUrl: process.env.SIMPLES_URL ?? "http://localhost:8082",
  danfseUrl: process.env.DANFSE_URL ?? "http://localhost:8080",

  upstreamTimeoutMs: Number(process.env.UPSTREAM_TIMEOUT_MS ?? 30000),

  // XML do DANFSe: máx 5 MiB (limite do serviço Go) + folga de JSON de cálculo
  bodyLimitBytes: 6 * 1024 * 1024,
  responseLimitBytes: 10 * 1024 * 1024,

  // Anti-abuso: por IP
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX ?? 60),
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60000),
};
