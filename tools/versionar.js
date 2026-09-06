/* Carimba um hash do conteúdo nos arquivos que o index.html carrega, pra que
   um deploy novo nunca seja servido com o JS velho do cache — e mostra esse
   hash no rodapé, pra dar pra conferir qual versão está aberta.
   Uso: node tools/versionar.js */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const raiz = path.join(__dirname, '..');
const arquivo = nome => path.join(raiz, nome);
const partes = ['styles.css', 'seed.js', 'spotify.js', 'app.js'];

const hash = crypto.createHash('sha1')
  .update(partes.map(n => fs.readFileSync(arquivo(n))).join('\n'))
  .digest('hex').slice(0, 8);

const html = fs.readFileSync(arquivo('index.html'), 'utf8')
  .replace(/(href="styles\.css)(\?v=[a-f0-9]+)?"/, `$1?v=${hash}"`)
  .replace(/(src="(?:seed|spotify|app)\.js)(\?v=[a-f0-9]+)?"/g, `$1?v=${hash}"`)
  .replace(/(id="build">)[^<]*/, `$1${hash}`);

fs.writeFileSync(arquivo('index.html'), html);
console.log('versão:', hash);
