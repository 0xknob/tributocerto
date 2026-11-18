# Formato de exportação de cálculos (v1)

Princípio LGPD do projeto: **o dado do usuário fica com o usuário**. O site exporta um
arquivo que ele pode reimportar depois; o servidor nunca guarda nada.

- Especificação formal (validável por máquina): [formato-export.schema.json](formato-export.schema.json)
- Exemplos completos: [exemplos/](exemplos/)
- Validador de referência (sem dependências): `node scripts/validar-export.mjs`

## Especificação

- Arquivo único, JSON UTF-8.
- `versao` (inteiro, obrigatório): versão deste formato. Reimportar uma versão
  desconhecida gera **aviso**, não erro.

| Campo       | Tipo   | Obrigatório | Descrição |
| ----------- | ------ | ----------- | --------- |
| `versao`    | number | sim         | Sempre `1` |
| `geradoEm`  | string | sim         | Timestamp ISO 8601 da exportação |
| `tipo`      | string | sim         | `calculo-regime-regular` \| `calculo-simples-nacional` \| `danfse` |
| `entrada`   | object | sim         | O que foi enviado à API — shape depende do `tipo` (abaixo) |
| `resultado` | object | não         | Resposta exata recebida da API. **Omitido para `danfse`** (PDF é binário, não serializável em JSON) |
| `motor`     | object | não         | Snapshot de `GET /api/status` no momento do cálculo — rastreabilidade da base oficial usada |

### `entrada` por tipo

- **`calculo-regime-regular`** e **`calculo-simples-nacional`**: o payload JSON
  exato enviado a `POST /api/calculo/...` (schema no Swagger de cada serviço).
  Única restrição imposta por este formato: deve conter `itens` (array ≥ 1).
- **`danfse`**: objeto com:
  - `xml` (string, obrigatório): o XML de NFS-e enviado a `POST /api/danfse`
    (layout da NT-008/CGNFSe — ver docs do repo `calculadora-rtc-gerador-danfse`);
  - `parametros` (objeto, opcional): `stc` (0\|1\|2) e `canhoto` (boolean) —
    os únicos query params que o BFF repassa.

### `motor`

Snapshot da resposta de [`GET /api/status`](../bff/src/server.js) (via BFF):

```json
{
  "ok": true,
  "servicos": [
    { "servico": "regime-regular",   "ok": true, "versao": { "...": "shape do próprio serviço" } },
    { "servico": "simples-nacional", "ok": true, "versao": { "...": "" } },
    { "servico": "danfse",           "ok": true, "versao": { "...": "" } }
  ],
  "verificadoEm": "2026-11-17T12:00:00.000Z"
}
```

O `shape` interno de `versao` é definido por cada serviço upstream e pode mudar;
por isso o formato de exportação o trata como opaco.

## Regras de compatibilidade

1. Evolução do formato: **adicionar campos, nunca remover/renomear** (semântica de
   versionamento major/minor aplicada ao formato).
2. Na reimportação, validar apenas a estrutura mínima (`versao`, `tipo`, `entrada`
   conforme o schema). O `resultado` é **recalculado sob demanda** — pode ter
   mudado com nova base oficial (é inclusive um recurso: reimportar um cálculo
   antigo mostra os valores na base atual).
3. O arquivo pode conter dados pessoais (CPF/CNPJ, valores). O download e a guarda
   são responsabilidade do usuário — o aviso de privacidade deve dizer isso
   explicitamente.
4. Nome sugerido do arquivo: `calculo-rtc-<tipo>-<AAAAMMDD-HHmm>.json`.
5. Arquivos de exemplo em `docs/exemplos/` são material de teste/documentação:
   o campo extra `_exemplo` (nota explicativa) é permitido pelo schema
   (`additionalProperties: true`) e **deve ser ignorado na importação**.
