# 🎸 Setlist

Checklist das músicas que eu preciso aprender. Página única, sem servidor e sem
instalação: abre o `index.html` e usa. Os dados ficam salvos no próprio navegador
(`localStorage`).

## Onde roda

| Versão | Como abrir | Spotify | Onde salva |
| --- | --- | --- | --- |
| Local | duplo clique no `index.html` | não (o Spotify exige http/https) | neste navegador |
| GitHub Pages | Settings → Pages → branch, pasta raiz | sim, completo | neste navegador |
| Hospedada (Artifact) | link publicado pelo Claude | não (a sandbox bloqueia a API) | sincroniza entre aparelhos |

Depois de mexer em `app.js`, `spotify.js`, `styles.css` ou `seed.js`, roda
`node tools/versionar.js`: ele carimba o hash do conteúdo nos `?v=` do
`index.html` e no rodapé da página, então o GitHub Pages nunca serve o
JavaScript velho do cache e dá pra conferir na tela qual versão está aberta.

A versão hospedada sai de `node tools/build-artifact.js`, que junta os mesmos
arquivos num HTML só (em `dist/`) e liga a sincronização entre aparelhos.

## Como usar
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

## Abrir playlist do Spotify

Botão **Spotify**: conecta na conta, lista as tuas playlists, mostra as faixas e
importa as que você marcar (com o status que escolher). Também aceita link de
playlist colado — inclusive de playlist pública de outra pessoa.

O app é estático, então o login é o fluxo oficial **OAuth PKCE** do Spotify: roda
todo no navegador, sem servidor e sem client secret. Só precisa de um Client ID
seu, uma vez:

1. Abre o [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) → **Create app**.
2. Em **Redirect URI**, cola o endereço exato que o app mostra na tela (ele calcula
   sozinho a partir da URL aberta) e clica **Add**.
3. Marca **Web API**, salva, copia o **Client ID** e cola no app.

Detalhes que valem saber:

- O login exige a página servida por **http(s)** — abrindo o `index.html` direto
  (`file://`) o Spotify recusa o redirect. Use GitHub Pages, ou `npx serve` e
  abra `http://127.0.0.1:3000` (o Spotify aceita `127.0.0.1`, não `localhost`).
- Permissões pedidas: só leitura de playlists
  (`playlist-read-private`, `playlist-read-collaborative`).
- O token fica no `localStorage` deste aparelho e se renova sozinho; **Desconectar**
  apaga. Nada é enviado pra lugar nenhum além do próprio Spotify.
- Playlists de qualquer tamanho: a leitura é paginada de 100 em 100 faixas.
  Episódios de podcast e faixas locais sem dados são ignorados.
- Faixas que já estão na lista aparecem marcadas como *já na lista* e vêm
  desmarcadas, então dá pra reimportar a playlist depois sem duplicar nada.

## Importar lista na mão

Botão **Importar**. Cola uma música por linha — o app aceita:

- `Artista - Música` ou `Música - Artista` (escolhe o formato no seletor)
- CSV do [Exportify](https://exportify.net) (colunas `Track Name` / `Artist Name(s)`)
- linhas com link do Spotify junto (o link fica salvo na música)
- numeração e marcadores no começo da linha (`1.`, `-`, `•`) são ignorados

Duplicadas não entram: a comparação é por título + artista, ignorando acento e
maiúscula.

Serve pra lista que veio de qualquer lugar: caderno, WhatsApp, CSV do
[Exportify](https://exportify.net), print de setlist etc.

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
| `app.js` | estado, filtros, importação, backup e a tela do Spotify |
| `spotify.js` | login PKCE e leitura da Web API do Spotify |
| `seed.js` | lista inicial versionada no repositório |
| `tools/build-artifact.js` | gera a versão hospedada (arquivo único) |
| `tools/versionar.js` | carimba o hash do conteúdo nos assets (mata cache velho) |
