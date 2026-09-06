/* Cliente do Spotify Web API com login PKCE — roda inteiro no navegador,
   sem servidor e sem client secret. Só precisa de um Client ID criado em
   https://developer.spotify.com/dashboard com o Redirect URI desta página. */

window.SetlistSpotify = (() => {
  const CHAVE_CLIENT = 'setlist.spotify.client';
  const CHAVE_TOKEN = 'setlist.spotify.token';
  const CHAVE_PKCE = 'setlist.spotify.pkce';

  const ESCOPOS = 'playlist-read-private playlist-read-collaborative';
  const AUTORIZAR = 'https://accounts.spotify.com/authorize';
  const TOKEN = 'https://accounts.spotify.com/api/token';
  const API = 'https://api.spotify.com/v1';
  const MAX_PAGINAS = 25;

  const ler = k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
  const gravar = (k, v) => localStorage.setItem(k, JSON.stringify(v));

  const clientId = () => ler(CHAVE_CLIENT) || '';
  const conectado = () => !!(ler(CHAVE_TOKEN) || {}).refresh_token;
  /* OAuth exige http/https: em file:// o Spotify recusa o redirect. */
  const suportado = () => location.protocol === 'http:' || location.protocol === 'https:';
  const redirectUri = () => location.origin + location.pathname;

  function definirClientId(id) {
    gravar(CHAVE_CLIENT, String(id || '').trim());
  }

  function desconectar({ esquecerClientId = false } = {}) {
    localStorage.removeItem(CHAVE_TOKEN);
    localStorage.removeItem(CHAVE_PKCE);
    if (esquecerClientId) localStorage.removeItem(CHAVE_CLIENT);
  }

  /* ---------------- PKCE ---------------- */

  const b64url = buf => btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const aleatorio = bytes => b64url(crypto.getRandomValues(new Uint8Array(bytes)));

  async function desafio(verificador) {
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verificador));
    return b64url(hash);
  }

  async function login() {
    if (!clientId()) throw new Error('Falta o Client ID.');
    if (!suportado()) throw new Error('O login do Spotify só funciona com a página servida por http(s).');

    const verificador = aleatorio(64);
    const estado = aleatorio(16);
    gravar(CHAVE_PKCE, { verificador, estado });

    const params = new URLSearchParams({
      client_id: clientId(),
      response_type: 'code',
      redirect_uri: redirectUri(),
      state: estado,
      scope: ESCOPOS,
      code_challenge_method: 'S256',
      code_challenge: await desafio(verificador),
    });
    location.assign(`${AUTORIZAR}?${params}`);
  }

  function limparUrl() {
    history.replaceState({}, '', redirectUri());
  }

  async function pedirToken(corpo) {
    const resp = await fetch(TOKEN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: clientId(), ...corpo }),
    });
    const dados = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(dados.error_description || dados.error || 'Falha ao autenticar no Spotify.');

    const anterior = ler(CHAVE_TOKEN) || {};
    gravar(CHAVE_TOKEN, {
      access_token: dados.access_token,
      refresh_token: dados.refresh_token || anterior.refresh_token,
      expira_em: Date.now() + (dados.expires_in || 3600) * 1000,
    });
    return dados.access_token;
  }

  /* Roda no carregamento: se voltamos do Spotify com ?code=, troca por token.
     Devolve true quando um login acabou de acontecer. */
  async function init() {
    const params = new URLSearchParams(location.search);
    const erro = params.get('error');
    const codigo = params.get('code');
    if (!erro && !codigo) return false;

    const pkce = ler(CHAVE_PKCE) || {};
    localStorage.removeItem(CHAVE_PKCE);
    limparUrl();

    if (erro) throw new Error(erro === 'access_denied' ? 'Autorização cancelada.' : erro);
    if (!pkce.verificador || params.get('state') !== pkce.estado) {
      throw new Error('Resposta do Spotify não confere com o pedido. Tenta conectar de novo.');
    }

    await pedirToken({
      grant_type: 'authorization_code',
      code: codigo,
      redirect_uri: redirectUri(),
      code_verifier: pkce.verificador,
    });
    return true;
  }

  async function token() {
    const guardado = ler(CHAVE_TOKEN);
    if (!guardado) throw new Error('Conecta a conta do Spotify primeiro.');
    if (guardado.access_token && Date.now() < guardado.expira_em - 30000) return guardado.access_token;
    if (!guardado.refresh_token) throw new Error('Sessão do Spotify expirou. Conecta de novo.');
    return pedirToken({ grant_type: 'refresh_token', refresh_token: guardado.refresh_token });
  }

  async function api(caminho) {
    const url = caminho.startsWith('http') ? caminho : API + caminho;
    let resp = await fetch(url, { headers: { Authorization: `Bearer ${await token()}` } });

    if (resp.status === 401) {
      /* token recusado: força renovação e tenta uma vez mais */
      const guardado = ler(CHAVE_TOKEN) || {};
      gravar(CHAVE_TOKEN, { ...guardado, expira_em: 0 });
      resp = await fetch(url, { headers: { Authorization: `Bearer ${await token()}` } });
    }
    if (resp.status === 404) throw new Error('Playlist não encontrada. Confere o link.');
    if (resp.status === 403) throw new Error('Sem acesso a essa playlist com essa conta.');
    if (resp.status === 429) throw new Error('O Spotify pediu pra esperar um pouco. Tenta de novo em instantes.');
    if (!resp.ok) throw new Error(`Spotify respondeu ${resp.status}.`);
    return resp.json();
  }

  /* Segue o campo `next` até acabar a playlist. */
  async function paginar(caminho, aoAvancar) {
    const itens = [];
    let proxima = caminho;
    for (let i = 0; proxima && i < MAX_PAGINAS; i++) {
      const pagina = await api(proxima);
      itens.push(...(pagina.items || []));
      proxima = pagina.next;
      if (aoAvancar) aoAvancar(itens.length, pagina.total || itens.length);
    }
    return itens;
  }

  /* Aceita link, URI (spotify:playlist:...) ou o ID puro. */
  function idDaPlaylist(entrada) {
    const texto = String(entrada || '').trim();
    if (!texto) return '';
    const url = texto.match(/playlist[/:]([A-Za-z0-9]+)/);
    if (url) return url[1];
    return /^[A-Za-z0-9]{16,}$/.test(texto) ? texto : '';
  }

  async function minhasPlaylists() {
    const itens = await paginar('/me/playlists?limit=50');
    return itens.filter(Boolean).map(p => ({
      id: p.id,
      nome: p.name || '(sem nome)',
      dono: (p.owner || {}).display_name || '',
      total: (p.tracks || {}).total || 0,
    }));
  }

  async function playlist(id) {
    const campos = encodeURIComponent('name,owner(display_name),tracks(total)');
    const p = await api(`/playlists/${id}?fields=${campos}`);
    return { id, nome: p.name || '(sem nome)', dono: (p.owner || {}).display_name || '', total: (p.tracks || {}).total || 0 };
  }

  async function faixas(id, aoAvancar) {
    const campos = encodeURIComponent('next,total,items(track(name,type,artists(name),external_urls(spotify)))');
    const itens = await paginar(`/playlists/${id}/tracks?limit=100&fields=${campos}`, aoAvancar);
    return itens.map(item => {
      const faixa = item && item.track;
      if (!faixa || !faixa.name || faixa.type === 'episode') return null;
      return {
        titulo: faixa.name,
        artista: (faixa.artists || []).map(a => a.name).filter(Boolean).join(', '),
        link: ((faixa.external_urls || {}).spotify) || '',
      };
    }).filter(Boolean);
  }

  return { clientId, definirClientId, conectado, suportado, redirectUri, login, desconectar, init, minhasPlaylists, playlist, faixas, idDaPlaylist };
})();
