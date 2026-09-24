# Feedback e prioridades de produto

## Decisão de posicionamento

O Pocket Library não será limitado a e-books. Ele deve ajudar pessoas a
entender qualquer PDF com texto selecionável: livros, documentação técnica,
manuais, tutoriais e materiais de estudo.

## Feedback registrado

- Usuários podem enviar manuais e tutoriais, não apenas livros.
- Para materiais práticos, a necessidade central é fazer perguntas objetivas
  sobre o documento e chegar rapidamente à página relevante.
- Resumos devem respeitar o ponto atual da leitura quando o material for
  literário, evitando spoilers.
- O produto deve adaptar a experiência ao tipo de leitura, sem forçar uma
  classificação permanente ou imprecisa.

## Perfis de leitura propostos

O usuário escolhe um perfil ao importar o PDF. Mais adiante, o produto poderá
sugerir um perfil a partir de título e texto, mas a escolha do usuário vence.

| Perfil | Objetivo | Assistente |
| --- | --- | --- |
| Livro literário | Acompanhar narrativa sem antecipar acontecimentos | Recapitular até a página atual, explicar personagens e contexto sem spoilers |
| Estudo técnico | Construir entendimento e revisar conceitos | Explicar, traduzir, resumir e gerar revisão a partir de trechos |
| Manual ou tutorial | Encontrar e executar instruções rapidamente | Responder perguntas diretas, trazer passos, alertas e páginas de origem |

## Próximas prioridades

### P0 — Pergunte sobre este documento

Adicionar uma pergunta livre no painel de IA. Para reduzir custo e manter a
resposta verificável, o app extrairá localmente as páginas mais relacionadas à
pergunta, enviará apenas esse contexto ao assistente e exibirá as páginas
consultadas na resposta. Funciona primeiro em PDFs com texto selecionável.

### P1 — Perfil de leitura por PDF

Adicionar o seletor Livro, Estudo técnico ou Manual/tutorial na importação e
persistir a preferência no navegador. O perfil muda tom, ações sugeridas e
instruções enviadas ao assistente.

### P2 — Login e sincronização de dados leves

Após configurar o remetente SES, ativar login por código e sincronizar
progresso, destaques, notas e marcadores. PDFs continuam locais por padrão.

### P3 — OCR

Permitir busca, seleção e recursos de IA em páginas escaneadas ou compostas
somente por imagem. Essa etapa exige avaliar custo, qualidade e privacidade do
processamento.

### P4 — Biblioteca e acesso multiplataforma

Coleções, filtros, capas, edição de título, PWA instalável e, somente mediante
uma decisão explícita de privacidade, upload privado de PDFs para acesso em
vários dispositivos.

## Critérios para a P0

- pergunta em linguagem natural sobre o PDF atual;
- resposta curta, útil e em português;
- indicação de uma ou mais páginas usadas como fonte;
- limite de contexto para proteger a cota de IA;
- comportamento claro quando o PDF não tiver texto selecionável.
