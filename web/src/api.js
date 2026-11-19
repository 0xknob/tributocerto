// Camada de API — tudo passa pelo BFF (mesma origem). Erros viram mensagens amigáveis.

async function respostaErro(res) {
  let msg = `Erro HTTP ${res.status}`;
  try {
    const corpo = await res.json();
    if (corpo?.mensagem) msg = `${corpo.mensagem}${corpo.erro ? ` (${corpo.erro})` : ""}`;
  } catch {
    /* corpo não-JSON: mantém a mensagem genérica */
  }
  const err = new Error(msg);
  err.status = res.status;
  return err;
}

export async function getJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw await respostaErro(res);
  return res.json();
}

export async function postJSON(path, body) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await respostaErro(res);
  return res.json();
}

// XML de NFS-e → PDF (blob). stc/canhoto são os únicos parâmetros que o BFF repassa.
export async function gerarDanfse(xml, { stc = 0, canhoto = true } = {}) {
  const q = new URLSearchParams({ stc: String(stc), canhoto: String(canhoto) });
  const res = await fetch(`/api/danfse?${q}`, {
    method: "POST",
    headers: { "content-type": "application/xml" },
    body: xml,
  });
  if (!res.ok) throw await respostaErro(res);
  return res.blob();
}

export function getStatus() {
  return getJSON("/api/status");
}
