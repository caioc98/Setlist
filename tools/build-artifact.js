/* Gera a versão hospedada (um arquivo só) a partir dos mesmos fontes do app.
   Uso: node tools/build-artifact.js [saida.html]

   Diferenças da versão hospedada:
   - roda numa sandbox que bloqueia chamadas de rede, então o login do
     Spotify fica desligado (o app explica isso na tela);
   - a lista sincroniza entre aparelhos pela capability `db` do artifact,
     com o localStorage continuando como cópia local;
   - baixar arquivo passa pela capability `downloads`, porque link de
     download comum não funciona dentro do viewer. */

const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');
const ler = nome => fs.readFileSync(path.join(raiz, nome), 'utf8');

const SINCRONIA = `
/* ---- versão hospedada: sem rede pro Spotify, com sincronia entre aparelhos ---- */
window.SETLIST_SEM_REDE = true;

const temClaude = () => window.claude && typeof claude.use === 'function';

/* Link de download não funciona dentro do viewer: quem salva é o próprio. */
(async () => {
  const downloads = temClaude() && await claude.use('downloads');
  if (downloads) {
    window.SETLIST_BAIXAR = (filename, data) => downloads.save({ filename, data })
      .catch(e => { if (e && e.code !== 'cancelled') document.querySelector('#msg-dados').textContent = 'Não deu pra salvar o arquivo.'; });
    return;
  }
  document.querySelector('#btn-exportar-json').hidden = true;
  window.SETLIST_BAIXAR = () => {
    document.querySelector('#msg-dados').textContent = 'Aqui não dá pra baixar arquivo — usa a versão do GitHub Pages pra isso.';
  };
})();

(async () => {
  if (!temClaude()) return;
  const db = await claude.use('db');
  if (!db) return;

  const doc = db.doc('setlist/lista');
  let ultimo = 0;
  let primeira = true;
  let timer;

  const publicar = lista => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      ultimo = Date.now();
      doc.set({ musicas: lista, atualizadoEm: ultimo }).catch(() => {});
    }, 700);
  };

  /* Junta sem duplicar: o que existe nos dois lados vem da nuvem. */
  const unir = (base, extras) => {
    const chaves = new Set(base.map(window.setlistChave));
    return base.concat(extras.filter(m => !chaves.has(window.setlistChave(m))));
  };

  window.SETLIST_SINC = publicar;

  doc.onSnapshot(snap => {
    const dados = (snap.exists && snap.data()) || {};
    const remotas = Array.isArray(dados.musicas) ? dados.musicas : null;
    const quando = Number(dados.atualizadoEm) || 0;

    /* No primeiro encontro nada se perde: o que só existe num lado entra. */
    if (primeira) {
      primeira = false;
      const locais = window.setlistLista();
      const juntas = unir(remotas || [], locais);
      ultimo = quando;
      if (remotas === null ? juntas.length : juntas.length !== remotas.length) publicar(juntas);
      window.setlistAplicar(juntas);
      return;
    }

    /* Depois disso, vale a última alteração — inclusive remoções. */
    if (!remotas || quando <= ultimo) return;
    ultimo = quando;
    window.setlistAplicar(remotas);
  }, () => {});
})();
`;

const html = ler('index.html');
const corpo = html.split('<body>')[1].split('</body>')[0]
  .replace(/\n?\s*<script src="([^"]+)"><\/script>/g, (_, arquivo) => `\n<script>\n${ler(arquivo)}\n</script>`)
  .replace(/<link rel="stylesheet"[^>]*>\n?/g, '')
  .trim();

const saida = process.argv[2] || path.join(raiz, 'dist', 'setlist-hospedado.html');
fs.mkdirSync(path.dirname(saida), { recursive: true });
fs.writeFileSync(saida, `<title>Setlist</title>
<style>
${ler('styles.css')}
</style>

${corpo}

<script>${SINCRONIA}</script>
`);
console.log('gerado:', saida, `(${(fs.statSync(saida).size / 1024).toFixed(1)} kB)`);
