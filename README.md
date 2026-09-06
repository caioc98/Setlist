# 🎸 Setlist

Checklist das músicas que eu preciso aprender. Página única, sem servidor e sem
instalação: abre o `index.html` e usa. Os dados ficam salvos no próprio navegador
(`localStorage`).

## Como usar

- **Abrir**: dá duplo clique em `index.html`, ou publica a pasta no GitHub Pages
  (Settings → Pages → branch da pasta raiz) pra usar do celular.
- **Adicionar**: música + artista + status, botão *Adicionar*.
- **Marcar como aprendida**: a caixinha à esquerda. A barra no topo mostra o progresso.
- **Detalhes**: clica no nome da música pra abrir tom, notas, link e o botão de remover.
- **Filtrar**: os chips coloridos filtram por status (dá pra marcar vários), e tem
  busca por nome/artista/notas.

## Status

| Status | Cor | Ideia |
| --- | --- | --- |
| Prioridade | vermelho | é a próxima da fila |
| Importante | laranja | precisa saber, mas não é pra agora |
| Relembrar | azul | já soube tocar, precisa refrescar |
| Boa | roxo | vale a pena aprender um dia |
| Ótimo | verde | tá redonda, só manter |

## Importar do Spotify

Botão **Importar lista**. Cola uma música por linha — o app aceita:

- `Artista - Música` ou `Música - Artista` (escolhe o formato no seletor)
- CSV do [Exportify](https://exportify.net) (colunas `Track Name` / `Artist Name(s)`)
- linhas com link do Spotify junto (o link fica salvo na música)
- numeração e marcadores no começo da linha (`1.`, `-`, `•`) são ignorados

Duplicadas não entram: a comparação é por título + artista, ignorando acento e
maiúscula.

### Como tirar a lista do Spotify

1. **Exportify** (mais fácil): entra em exportify.net, conecta a conta, exporta a
   playlist em CSV, abre o arquivo e cola o conteúdo inteiro no campo de importação.
2. **Na mão**: no app do computador, seleciona as faixas (Ctrl/Cmd + A), copia e cola.

## Backup

Botão **Backup**:

- **Baixar JSON** — arquivo com tudo, pra guardar ou levar pra outro aparelho.
- **Copiar checklist em Markdown** — pra colar no bloco de notas, WhatsApp, issue etc.
- **Restaurar de um JSON** — substitui a lista atual pela do arquivo.
- **Puxar músicas do repositório** — traz o que estiver em `seed.js` e ainda não
  existe na lista (nada é sobrescrito).

## Arquivos

| Arquivo | O que é |
| --- | --- |
| `index.html` | estrutura da página |
| `styles.css` | estilo (tema escuro) |
| `app.js` | toda a lógica: estado, filtros, importação, backup |
| `seed.js` | lista inicial versionada no repositório |
