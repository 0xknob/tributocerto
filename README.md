# TributoCerto — Calculadora CBS, IBS e DANFSe

Site **gratuito** de cálculo tributário sobre os motores de cálculo open source da
**Receita Federal** (Reforma Tributária do Consumo — LC 214/2025):

| Serviço upstream | Uso |
|---|---|
| [calculadora-rtc-regime-regular](https://github.com/ReceitaFederal/calculadora-rtc-regime-regular) | CBS, IBS, Imposto Seletivo (regime geral) + tabelas oficiais (NCM/NBS, alíquotas, fundamentações) |
| [calculadora-rtc-simples-nacional](https://github.com/ReceitaFederal/calculadora-rtc-simples-nacional) | CBS/IBS no Simples Nacional + atividades |
| [calculadora-rtc-gerador-danfse](https://github.com/ReceitaFederal/calculadora-rtc-gerador-danfse) | XML de NFS-e → PDF DANFSe |

## Arquitetura

```
navegador → Caddy (HTTPS + estático) → BFF (Fastify) → ┬ regime-regular  (Java/Spring)
                                                       ├ simples-nacional (Java/Spring)
                                                       └ danfse           (Go)
```

**Princípios**: não reimplementamos cálculo (consumimos as APIs oficiais);
**processamento efêmero** (nenhum dado de usuário é armazenado ou logado);
atualização controlada por CI com os testes oficiais da Receita como portão.

## Estrutura

```
├── docker-compose.yml          # stack completa (local builda; produção usa GHCR via .env)
├── .env.example                # modelo do .env de produção (imagens GHCR + domínio)
├── Caddyfile                   # reverse proxy, HTTPS automático, front estático
├── docker/                     # Dockerfiles: 2 serviços Java, caddy (frontend embutido)
├── bff/                        # BFF Fastify (proxy seguro, /api/status, efemeridade)
├── web/                        # frontend React/Vite (build dentro do Docker, sem Node no host)
├── scripts/clone-upstream.ps1  # clona os repos da Receita em upstream/
├── scripts/validar-export.mjs  # validador do formato de exportação (docs/formato-export.md)
├── .upstream-versions.json     # SHAs em produção (atualizado pelo CI via PR)
├── .github/workflows/          # ci.yml, sync-upstream.yml (build+PR) e deploy.yml (SSH)
└── docs/                       # privacidade, termo de uso, formato de exportação + exemplos
```

## Rodando localmente

Pré-requisitos: Docker Desktop, Git (Java/Go/Maven não são necessários — tudo roda em
container).

```powershell
powershell -File scripts/clone-upstream.ps1   # clona os 3 repos em upstream/
docker compose up -d --build
```

> Se o build do compose reclamar de `additional privileges requested (fs.read=…)`
> (Docker Desktop com sandbox endurecido), faça o build manual e suba sem `--build`:
>
> ```powershell
> docker build -f docker/regime-regular.Dockerfile -t tributocerto-regime-regular:local .
> docker build -f docker/simples-nacional.Dockerfile -t tributocerto-simples-nacional:local .
> docker build -t tributocerto-danfse:local upstream/calculadora-rtc-gerador-danfse
> docker build -t tributocerto-bff bff
> docker build -f docker/caddy.Dockerfile -t tributocerto-caddy .
> docker compose up -d
> ```

- Site: http://localhost
- Swagger dos serviços (direto, sem o BFF):
  - regime-regular: http://localhost:8080/api/swagger-ui.html
  - simples-nacional: http://localhost:8082/api/swagger-ui.html
  - danfse: http://localhost:8083/api/swagger-ui/index.html *(mapear porta no compose se quiser acessar)*

> Nota: o compose não publica as portas dos serviços internos (acesso somente via BFF).
> Para inspecionar o Swagger local, adicione `ports` temporários.

## API pública (via BFF)

| Rota | Descrição |
|---|---|
| `POST /api/calculo/regime-regular` | Cálculo CBS/IBS/Seletivo (modo observabilidade, erros `REG-*` por item) |
| `POST /api/calculo/simples-nacional` | Cálculo Simples Nacional (erros `VSN-*`) |
| `POST /api/danfse?stc=0&canhoto=true` | XML NFS-e → PDF (`stc`, `canhoto` whitelist) |
| `GET /api/dados-abertos/*` | NCM, NBS, alíquotas, fundamentações legais |
| `GET /api/simples-nacional/atividades[/:codigo]` | Atividades vigentes (`?data=AAAA-MM-DD`) |
| `GET /api/status` | Versões/saúde dos 3 motores (rodapé do site) |
| `GET /health` | Saúde do BFF |

Controles: rate limit 60 req/min por IP, corpo ≤ 6 MiB, timeout upstream 30 s,
erros 5xx genéricos, logs apenas com metadados (rota/status/duração).

## Atualização (site em dia com a Receita)

1. `sync-upstream.yml` roda diário, compara SHAs (`git ls-remote`) com
   `.upstream-versions.json`.
2. Se mudou: clona, **roda os testes oficiais** (`mvnw clean test`, `go test`),
   builda imagens no GHCR (tag do SHA + tag `latest`) e **abre um PR**.
3. Você revisa e mergeia → `deploy.yml` faz deploy via SSH.

Regra: **build automático, deploy controlado** — cálculo tributário errado no ar
destrói a credibilidade do site.

## Produção (servidor Linux)

O servidor **não precisa dos fontes da Receita** — só deste repo e um `.env`:

```bash
git clone https://github.com/SEU-USUARIO/tributocerto.git /opt/tributocerto
cd /opt/tributocerto
cp .env.example .env && vim .env   # imagens GHCR + SITE_ADDRESS
docker compose build bff && docker compose up -d --pull=always
```

Deploy contínuo: configure os secrets `SSH_HOST`/`SSH_USER`/`SSH_KEY` no GitHub e
todo push na `main` roda o `deploy.yml`. Detalhes no cabeçalho do workflow.

> Nota: a tag `latest` acompanha o último build aprovado. Se o PR do sync-upstream
> ficar aberto enquanto um novo sync rodar, `latest` avança antes do merge — para
> pinar, use a tag do SHA registrada em `.upstream-versions.json`.

## Pontos a confirmar antes de produção

- [ ] Arquivo `LICENSE` dos 3 repos (README do simples-nacional indica MIT; conferir todos).
- [ ] Caminho exato de `/versao` em cada serviço (ver Swagger) — usado no `/api/status`.
- [ ] Presença da pasta `flyway/` e dos scripts SQL nos dois repos Java (READMEs indicam que sim).
- [ ] `docs/privacidade.md` e `docs/termo-de-uso.md` revisados por advogado/DPO.
- [ ] Se abrir error tracking (Sentry etc.): **scrub de corpo de requisição obrigatório**.

## Roadmap

- [x] Frontend React/Vite — 3 telas de cálculo + Tabelas Oficiais (NCM/NBS/municípios/atividades)
      + rodapé com `/api/status`; export/import no formato v1; rascunho em localStorage
      (build embutido na imagem Caddy — nenhum Node no host/servidor)
- [x] Export/import de cálculos — formato v1 especificado ([docs/formato-export.md](docs/formato-export.md),
      schema + exemplos + validador de referência) **e implementado na UI**
- [x] CI no GitHub (`ci.yml` a cada push/PR; `sync-upstream.yml` diário com testes oficiais + PR)
- [ ] Merge do PR do sync (branch `chore/sync-upstream` já subiu) + packages GHCR públicas
- [ ] Servidor de produção + secrets SSH do `deploy.yml`
- [ ] Testes dourados no CI (entradas/saídas congeladas; diff → revisão manual)
- [ ] Staging + smoke test antes do deploy de produção
