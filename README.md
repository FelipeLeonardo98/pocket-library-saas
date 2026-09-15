# EstudoPDF — beta pública

Leitor de PDFs focado em estudo. Os arquivos, preferências e anotações ficam no IndexedDB do navegador; somente os trechos enviados ao assistente são processados pelo backend de IA.

Beta: https://beta.dkwxx3mmw59dz.amplifyapp.com

## Executar

```bash
npm install
Copy-Item .env.example .env.local
npm run dev
```

Acesse `http://localhost:3000`, clique em **Adicionar PDF** e escolha um livro.

## Entregue no Marco 1

- biblioteca local de PDFs;
- importação e remoção de livros;
- renderização com PDF.js;
- navegação por botões, número da página ou setas do teclado;
- zoom e tela cheia;
- retomada automática da última página.

## Entregue no Marco 2

- modos **Página original** e **Leitura**;
- extração local do texto da página, sem enviar o PDF;
- temas claro, sépia e escuro;
- ajuste de luminosidade nos dois modos;
- fonte, tamanho, espaçamento e margens no modo leitura;
- preferências persistidas no navegador;
- modo foco com tela cheia e interface reduzida;
- controles responsivos para telas menores.

O modo leitura depende do texto incorporado no PDF. Páginas digitalizadas como imagem precisarão de OCR em um marco futuro.

## Entregue no Marco 3

- marcadores de página nos dois modos de visualização;
- seleção e destaque de trechos no modo **Leitura**, com três cores;
- notas vinculadas a trechos selecionados;
- caderno lateral reunindo marcadores, destaques e notas;
- atalhos do caderno para voltar à página original;
- remoção individual de itens;
- exportação do material de estudo em Markdown;
- persistência totalmente local.

Trechos sobrepostos são evitados no modo **Leitura** nesta versão da POC.

## Marco 3.1

- camada de texto transparente sobre o PDF original;
- seleção, destaque e notas diretamente no modo **Página**;
- destaques posicionados sobre a página e preservados durante o zoom;
- seleção mais robusta por mouse ou toque no modo **Leitura**.

PDFs digitalizados como imagem continuam dependendo de OCR, planejado para um marco posterior.

## Marco 4 — protótipo local

- assistente de leitura executado localmente pelo Ollama;
- explicação de trechos selecionados;
- tradução de trechos para português brasileiro;
- resumo do conteúdo até a página atual, limitado aos últimos 14 mil caracteres;
- acesso às ações de IA tanto pela seleção quanto pelo painel lateral;
- validação inicial do fluxo de IA antes da publicação.

## Beta AWS

- frontend estático no AWS Amplify;
- API Gateway e Lambda Node.js para tradução, explicação e resumo;
- OpenAI `gpt-5.6-luna` como provedor ativo de IA, com Bedrock preservado como alternativa;
- chave da OpenAI protegida no AWS Secrets Manager e lida somente pela Lambda;
- chave beta compartilhada e cota de 30 interações por dia no DynamoDB;
- throttling no API Gateway e IAM mínimo na Lambda;
- alertas de orçamento em US$5 e US$8;
- infraestrutura reproduzível em Terraform na pasta `infra`.

O backend reserva uma interação antes de chamar o modelo e a devolve automaticamente se o provedor falhar. Nenhuma chave bruta fica no Terraform ou no Git, e as chamadas usam `store: false`.

## Privacidade

O PDF permanece no armazenamento local do navegador. Limpar os dados do site remove a biblioteca e o progresso. Arquivos `.pdf`, segredos `.env*` e a pasta `books/` são ignorados pelo Git.
