/* Setlist — checklist das músicas pra aprender. Tudo local, sem servidor. */

const STATUS = [
  { id: 'prioridade', label: 'Prioridade', cor: 'var(--prioridade)' },
  { id: 'importante', label: 'Importante', cor: 'var(--importante)' },
  { id: 'relembrar',  label: 'Relembrar',  cor: 'var(--relembrar)'  },
  { id: 'boa',        label: 'Boa',        cor: 'var(--boa)'        },
  { id: 'otimo',      label: 'Ótimo',      cor: 'var(--otimo)'      },
];
const STATUS_PADRAO = 'boa';
const CHAVE = 'setlist.v1';

const statusPorId = id => STATUS.find(s => s.id === id) || STATUS.find(s => s.id === STATUS_PADRAO);
const $ = sel => document.querySelector(sel);

/* ---------------- estado ---------------- */

let musicas = carregar();
let filtros = { busca: '', status: new Set(), ordenar: 'status', esconderAprendidas: false };
let abertas = new Set();

function carregar() {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE));
    if (Array.isArray(salvo)) return salvo.map(normalizar);
  } catch (e) { /* dado corrompido: começa do zero */ }
  return (window.SETLIST_SEED || []).map(normalizar);
}

function salvar() {
  localStorage.setItem(CHAVE, JSON.stringify(musicas));
}

function normalizar(m) {
  return {
    id: m.id || crypto.randomUUID(),
    titulo: (m.titulo || '').trim(),
    artista: (m.artista || '').trim(),
    status: statusPorId(m.status).id,
    feito: !!m.feito,
    tom: (m.tom || '').trim(),
    notas: (m.notas || '').trim(),
    link: (m.link || '').trim(),
    criadoEm: m.criadoEm || Date.now(),
  };
}

const assinatura = m => `${m.titulo} :: ${m.artista}`
  .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9:]+/g, ' ').trim();

/* ---------------- render ---------------- */

function preencherSelects() {
  const opcoes = STATUS.map(s => `<option value="${s.id}">${s.label}</option>`).join('');
  $('#in-status').innerHTML = opcoes;
  $('#in-status').value = STATUS_PADRAO;
  $('#status-importar').innerHTML = opcoes;
  $('#status-importar').value = STATUS_PADRAO;
}

function renderChips() {
  $('#chips').innerHTML = STATUS.map(s => {
    const qtd = musicas.filter(m => m.status === s.id).length;
    const ativo = filtros.status.has(s.id);
    return `<button type="button" class="chip" data-status="${s.id}" aria-pressed="${ativo}" style="color:${ativo ? s.cor : ''}">
      <span class="ponto" style="background:${s.cor}"></span>${s.label} <span class="qtd">${qtd}</span>
    </button>`;
  }).join('');
}

function visiveis() {
  const busca = filtros.busca.toLowerCase().trim();
  let lista = musicas.filter(m => {
    if (filtros.esconderAprendidas && m.feito) return false;
    if (filtros.status.size && !filtros.status.has(m.status)) return false;
    if (busca && !`${m.titulo} ${m.artista} ${m.notas}`.toLowerCase().includes(busca)) return false;
    return true;
  });

  const porStatus = m => STATUS.findIndex(s => s.id === m.status);
  const cmp = {
    status: (a, b) => porStatus(a) - porStatus(b) || a.titulo.localeCompare(b.titulo, 'pt-BR'),
    titulo: (a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'),
    artista: (a, b) => (a.artista || 'zzz').localeCompare(b.artista || 'zzz', 'pt-BR') || a.titulo.localeCompare(b.titulo, 'pt-BR'),
    recentes: (a, b) => b.criadoEm - a.criadoEm,
  }[filtros.ordenar];

  return lista.sort(cmp);
}

function render() {
  renderChips();

  const feitas = musicas.filter(m => m.feito).length;
  const pct = musicas.length ? Math.round((feitas / musicas.length) * 100) : 0;
  $('#barra-preenchida').style.width = pct + '%';
  $('#progresso-texto').textContent = `${feitas} de ${musicas.length} aprendidas`;

  const lista = visiveis();
  const alvo = $('#lista');
  alvo.innerHTML = '';

  let grupoAtual = null;
  for (const m of lista) {
    if (filtros.ordenar === 'status' && m.status !== grupoAtual) {
      grupoAtual = m.status;
      const s = statusPorId(m.status);
      const h = document.createElement('div');
      h.className = 'grupo-titulo';
      h.innerHTML = `<span class="ponto" style="background:${s.cor}"></span>${s.label}`;
      alvo.appendChild(h);
    }
    alvo.appendChild(itemEl(m));
  }

  const semNada = musicas.length === 0;
  $('#vazio').hidden = lista.length > 0;
  $('#vazio').textContent = semNada
    ? 'Nenhuma música ainda. Adiciona uma acima ou importa a lista do Spotify.'
    : 'Nada bate com esse filtro.';
}

function itemEl(m) {
  const s = statusPorId(m.status);
  const el = document.createElement('article');
  el.className = 'item' + (m.feito ? ' feito' : '');
  el.style.setProperty('--cor', s.cor);
  el.dataset.id = m.id;

  const sub = [m.artista, m.tom && `tom ${m.tom}`].filter(Boolean).join(' · ');
  el.innerHTML = `
    <div class="item-linha">
      <input type="checkbox" data-acao="feito" ${m.feito ? 'checked' : ''} aria-label="Marcar como aprendida" />
      <div class="item-info" data-acao="abrir">
        <div class="item-titulo">${esc(m.titulo)}</div>
        ${sub ? `<div class="item-sub">${esc(sub)}</div>` : ''}
      </div>
      <select class="status" data-acao="status" aria-label="Status">
        ${STATUS.map(o => `<option value="${o.id}" ${o.id === m.status ? 'selected' : ''}>${o.label}</option>`).join('')}
      </select>
    </div>`;

  if (abertas.has(m.id)) {
    const d = document.createElement('div');
    d.className = 'detalhes';
    d.innerHTML = `
      <input type="text" data-campo="titulo" value="${esc(m.titulo)}" placeholder="Música" />
      <div class="dupla">
        <input type="text" data-campo="artista" value="${esc(m.artista)}" placeholder="Artista" />
        <input type="text" data-campo="tom" value="${esc(m.tom)}" placeholder="Tom / afinação" />
      </div>
      <textarea data-campo="notas" rows="2" placeholder="Notas: trecho difícil, versão, BPM…">${esc(m.notas)}</textarea>
      <input type="text" data-campo="link" value="${esc(m.link)}" placeholder="Link (Spotify, YouTube, cifra…)" />
      <div class="rodape">
        ${m.link ? `<a href="${esc(m.link)}" target="_blank" rel="noopener">abrir link ↗</a>` : '<span></span>'}
        <button type="button" class="btn perigo" data-acao="remover">Remover</button>
      </div>`;
    el.appendChild(d);
  }
  return el;
}

const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------------- interações ---------------- */

$('#form-add').addEventListener('submit', e => {
  e.preventDefault();
  const titulo = $('#in-titulo').value.trim();
  if (!titulo) return;
  musicas.push(normalizar({ titulo, artista: $('#in-artista').value, status: $('#in-status').value }));
  salvar();
  $('#in-titulo').value = '';
  $('#in-artista').value = '';
  $('#in-titulo').focus();
  render();
});

$('#lista').addEventListener('click', e => {
  const item = e.target.closest('.item');
  if (!item) return;
  const m = musicas.find(x => x.id === item.dataset.id);
  if (!m) return;
  const acao = e.target.dataset.acao || e.target.closest('[data-acao]')?.dataset.acao;

  if (acao === 'feito') { m.feito = e.target.checked; salvar(); render(); }
  if (acao === 'abrir') { abertas.has(m.id) ? abertas.delete(m.id) : abertas.add(m.id); render(); }
  if (acao === 'remover') { musicas = musicas.filter(x => x.id !== m.id); abertas.delete(m.id); salvar(); render(); }
});

$('#lista').addEventListener('change', e => {
  const item = e.target.closest('.item');
  const m = item && musicas.find(x => x.id === item.dataset.id);
  if (!m) return;
  if (e.target.dataset.acao === 'status') { m.status = e.target.value; salvar(); render(); }
});

$('#lista').addEventListener('input', e => {
  const campo = e.target.dataset.campo;
  if (!campo) return;
  const m = musicas.find(x => x.id === e.target.closest('.item').dataset.id);
  if (!m) return;
  m[campo] = e.target.value;
  salvar();
  if (campo === 'titulo' || campo === 'artista' || campo === 'tom') {
    const item = e.target.closest('.item');
    item.querySelector('.item-titulo').textContent = m.titulo;
    const sub = item.querySelector('.item-sub');
    const texto = [m.artista, m.tom && `tom ${m.tom}`].filter(Boolean).join(' · ');
    if (sub) sub.textContent = texto;
  }
});

$('#chips').addEventListener('click', e => {
  const chip = e.target.closest('.chip');
  if (!chip) return;
  const id = chip.dataset.status;
  filtros.status.has(id) ? filtros.status.delete(id) : filtros.status.add(id);
  render();
});

$('#busca').addEventListener('input', e => { filtros.busca = e.target.value; render(); });
$('#ordenar').addEventListener('change', e => { filtros.ordenar = e.target.value; render(); });
$('#esconder-aprendidas').addEventListener('change', e => { filtros.esconderAprendidas = e.target.checked; render(); });

/* ---------------- importação ---------------- */

function separarCSV(linha) {
  const campos = [];
  let atual = '', dentro = false;
  for (let i = 0; i < linha.length; i++) {
    const c = linha[i];
    if (c === '"') {
      if (dentro && linha[i + 1] === '"') { atual += '"'; i++; }
      else dentro = !dentro;
    } else if (c === ',' && !dentro) { campos.push(atual); atual = ''; }
    else atual += c;
  }
  campos.push(atual);
  return campos.map(c => c.trim());
}

/* Aceita CSV do Exportify, "Artista - Música", "Música - Artista" e links do Spotify. */
function parseLista(texto, ordem) {
  const linhas = texto.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (!linhas.length) return [];

  const cabecalho = separarCSV(linhas[0]).map(c => c.toLowerCase());
  const iTitulo = cabecalho.findIndex(c => /track name|título|titulo|música|musica|^name$|^song$/.test(c));
  const iArtista = cabecalho.findIndex(c => /artist/.test(c) || c === 'artista');
  if (iTitulo >= 0 && iArtista >= 0) {
    return linhas.slice(1).map(l => {
      const campos = separarCSV(l);
      return { titulo: campos[iTitulo] || '', artista: campos[iArtista] || '' };
    }).filter(m => m.titulo);
  }

  return linhas.map(linha => {
    let link = '';
    const url = linha.match(/https?:\/\/\S+/);
    if (url) { link = url[0]; linha = linha.replace(url[0], '').trim(); }

    linha = linha.replace(/^\s*(\d+[.)]|[-•*])\s+/, '').trim();
    if (!linha) return link ? { titulo: link, artista: '', link } : null;

    const partes = linha.split(/\s+[-–—|]\s+|\t|\s{2,}/).map(p => p.trim()).filter(Boolean);
    let titulo = linha, artista = '';
    if (partes.length >= 2) {
      const a = partes[0], b = partes.slice(1).join(' - ');
      [titulo, artista] = ordem === 'artista-titulo' ? [b, a] : [a, b];
    }
    return { titulo, artista, link };
  }).filter(Boolean);
}

function previaImportacao() {
  const itens = parseLista($('#txt-importar').value, $('#ordem-importar').value);
  const novos = itens.filter(i => !musicas.some(m => assinatura(m) === assinatura(normalizar(i))));
  const exemplo = itens[0] ? ` Ex.: “${itens[0].titulo}”${itens[0].artista ? ` — ${itens[0].artista}` : ''}.` : '';
  $('#previa-importar').textContent = itens.length
    ? `${itens.length} linha(s), ${novos.length} nova(s).${exemplo}`
    : '';
}

$('#btn-importar').addEventListener('click', () => { previaImportacao(); $('#dlg-importar').showModal(); });
$('#txt-importar').addEventListener('input', previaImportacao);
$('#ordem-importar').addEventListener('change', previaImportacao);

$('#btn-confirmar-importar').addEventListener('click', () => {
  const status = $('#status-importar').value;
  const itens = parseLista($('#txt-importar').value, $('#ordem-importar').value).map(i => normalizar({ ...i, status }));
  const adicionados = mesclar(itens);
  $('#txt-importar').value = '';
  $('#previa-importar').textContent = '';
  $('#dlg-importar').close();
  toast(adicionados ? `${adicionados} música(s) importada(s).` : 'Nada novo pra importar.');
});

/* Só adiciona o que ainda não existe (mesmo título + artista). */
function mesclar(itens) {
  const existentes = new Set(musicas.map(assinatura));
  let n = 0;
  for (const item of itens) {
    const chave = assinatura(item);
    if (!item.titulo || existentes.has(chave)) continue;
    existentes.add(chave);
    musicas.push(item);
    n++;
  }
  if (n) { salvar(); render(); }
  return n;
}

/* ---------------- backup ---------------- */

$('#btn-dados').addEventListener('click', () => { $('#msg-dados').textContent = ''; $('#dlg-dados').showModal(); });

$('#btn-exportar-json').addEventListener('click', () => {
  baixar('setlist.json', JSON.stringify(musicas, null, 2), 'application/json');
});

$('#btn-exportar-md').addEventListener('click', async () => {
  const md = STATUS.map(s => {
    const doStatus = musicas.filter(m => m.status === s.id);
    if (!doStatus.length) return '';
    const linhas = doStatus.map(m => `- [${m.feito ? 'x' : ' '}] ${m.titulo}${m.artista ? ` — ${m.artista}` : ''}`);
    return `## ${s.label}\n${linhas.join('\n')}`;
  }).filter(Boolean).join('\n\n');
  try {
    await navigator.clipboard.writeText(md);
    $('#msg-dados').textContent = 'Checklist copiado.';
  } catch (e) {
    baixar('setlist.md', md, 'text/markdown');
  }
});

$('#in-arquivo').addEventListener('change', async e => {
  const arquivo = e.target.files[0];
  if (!arquivo) return;
  try {
    const dados = JSON.parse(await arquivo.text());
    if (!Array.isArray(dados)) throw new Error('formato inesperado');
    musicas = dados.map(normalizar);
    salvar();
    render();
    $('#msg-dados').textContent = `${musicas.length} música(s) restaurada(s).`;
  } catch (err) {
    $('#msg-dados').textContent = 'Não consegui ler esse arquivo.';
  }
  e.target.value = '';
});

$('#btn-seed').addEventListener('click', () => {
  const n = mesclar((window.SETLIST_SEED || []).map(normalizar));
  $('#msg-dados').textContent = n ? `${n} música(s) adicionada(s).` : 'Já está tudo aqui.';
});

$('#btn-limpar').addEventListener('click', () => {
  if (!confirm('Apagar todas as músicas? Isso não tem volta.')) return;
  musicas = [];
  abertas.clear();
  salvar();
  render();
  $('#msg-dados').textContent = 'Lista zerada.';
});

function baixar(nome, conteudo, tipo) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}

let timerToast;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(timerToast);
  timerToast = setTimeout(() => { el.hidden = true; }, 2600);
}

/* ---------------- início ---------------- */

preencherSelects();
render();
salvar();
