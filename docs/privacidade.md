# Aviso de Privacidade — [NOME DO SITE]

> **STATUS: ESQUELETO.** Preencha os campos `[A DEFINIR]` e revise com advogado ou DPO
> antes de publicar. Este texto é orientação técnica, não parecer jurídico.

Última atualização: [DATA]

## 1. Quem somos

[NOME DO SITE] ("nós") é um site gratuito de cálculo tributário operado por
[NOME/RAZÃO SOCIAL], CNPJ [A DEFINIR], contato [E-MAIL]. **Não temos vínculo com a
Receita Federal** — usamos os motores de cálculo publicados por ela como software livre.

## 2. Quais dados tratamos (e por quanto tempo)

### Dados da sua operação fiscal — **efêmeros, nunca armazenados**

Para calcular tributos ou gerar um DANFSe, você informa (ou envia, no caso do XML da
NFS-e) dados como nome, CPF/CNPJ, endereço, descrição e valores de operações. Estes
dados são processados **em memória, apenas para produzir o resultado**, e descartados
imediatamente após a resposta. **Não salvos em banco, não salvos em log, não
compartilhamos com terceiros.** Não há cópia, backup ou histórico no servidor.

### Dados técnicos — metadados de segurança

Mantemos registros mínimos de acesso (endereço IP, data/hora, rota acessada, status,
duração) com finalidade exclusiva de segurança e prevenção de abuso, retidos por
[A DEFINIR: sugerido 30] dias e depois eliminados. Registros nunca contêm o conteúdo
da sua operação (XML, PDF, CPF/CNPJ).

## 3. Base legal (LGPD, Lei nº 13.709/2018)

- Dados da operação: execução de solicitação do próprio titular (art. 7º, II) —
  você pede o cálculo, processamos só o suficiente para respondê-lo e descartamos.
- Metadados de segurança: interesse legítimo (art. 7º, IX) — proteção do serviço.
  *Confirme a redação vigente na fonte oficial (planalto.gov.br).*

## 4. O que fica no seu equipamento

Cálculos exportados (JSON) e DANFSe (PDF) são salvos **no seu dispositivo** — a guarda
é sua. Rascunhos de formulário salvos pelo navegador ficam no armazenamento local e
podem ser apagados no botão "Limpar dados" [confirmar quando implementado].

## 5. Segurança

Tráfego criptografado (HTTPS), limites de taxa por IP, serviços isolados em contêineres
sem persistência, logs sem conteúdo sensível, tratamento de erros sem exposição de
detalhes internos.

## 6. Incidentes de segurança

Sem armazenamento de conteúdo, o risco de exposição é mínimo. Se ocorrer incidente
relevante, comunicaremos a ANPD e os titulares afetados conforme o art. 48 da LGPD.

## 7. Seus direitos

Pelo caráter efêmero do tratamento, normalmente não conservamos dados para atender
solicitações de acesso/correção/exclusão. Para exercer direitos ou tirar dúvidas:
[E-MAIL / CANAL A DEFINIR].

## 8. Alterações

Versões deste aviso ficam disponíveis com data em [LINK/REPOSITÓRIO A DEFINIR].
