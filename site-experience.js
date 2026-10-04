(() => {
  'use strict';

  if (window.__possivelSiteExperience) return;
  window.__possivelSiteExperience = true;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const config = window.POSSIVEL_SUPABASE || {};
  const PRO_PRICE = config.proPriceLabel || 'R$ 15,99/mês';
  const MAX_FILE_BYTES = 500 * 1024 * 1024;
  const CLOUD_QUOTA_BYTES = 2 * 1024 * 1024 * 1024;

  const getDb = () => window.POSSIVEL_DB || null;

  function node(tag, className, text) {
    const item = document.createElement(tag);
    if (className) item.className = className;
    if (text !== undefined) item.textContent = text;
    return item;
  }

  function setStatus(id, message, tone = '') {
    const target = $(`#${id}`);
    if (!target) return;
    target.textContent = message;
    target.dataset.tone = tone;
  }

  function formatBytes(bytes) {
    const value = Number(bytes || 0);
    if (value < 1024 * 1024) return `${Math.max(0, Math.round(value / 1024))} KB`;
    if (value < 1024 * 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;
    return `${(value / 1024 / 1024 / 1024).toFixed(2)} GB`;
  }

  function activateView(name) {
    $$('.view').forEach((view) => view.classList.toggle('active', view.dataset.viewPanel === name));
    $$('.nav-item').forEach((button) => button.classList.toggle('active', button.dataset.view === name));
    $('.sidebar')?.classList.remove('open');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (name === 'search') {
      setTimeout(() => $('#discoverSearch')?.focus(), 40);
    }
    if (name === 'books') void loadLibrary('books');
    if (name === 'watch') void loadLibrary('watch');
  }

  function makeNavButton(view, icon, label) {
    const button = node('button', 'nav-item');
    button.type = 'button';
    button.dataset.view = view;
    const symbol = node('span', '', icon);
    button.append(symbol, document.createTextNode(label));
    return button;
  }

  function setupNavigation() {
    const nav = $('.nav-list');
    if (!nav) return;

    const existing = new Map($$('.nav-item', nav).map((button) => [button.dataset.view, button]));
    const home = existing.get('home') || makeNavButton('home', '⌂', 'Início');
    const messages = existing.get('messages') || makeNavButton('messages', '↗', 'Mensagens');
    const search = existing.get('search') || makeNavButton('search', '⌕', 'Buscar');
    const books = existing.get('books') || makeNavButton('books', '▤', 'Livros');
    const watch = existing.get('watch') || makeNavButton('watch', '▶', 'Filmes e séries');

    home.childNodes[home.childNodes.length - 1].textContent = 'Início';
    messages.childNodes[messages.childNodes.length - 1].textContent = 'Mensagens';

    nav.replaceChildren(home, search, messages, books, watch);

    const secondary = ['connections', 'market', 'causes', 'plans']
      .map((name) => existing.get(name))
      .filter(Boolean);

    if (secondary.length) {
      const more = node('details', 'nav-more');
      const summary = node('summary', '', 'Mais');
      const list = node('div', 'nav-more-list');
      secondary.forEach((button) => list.append(button));
      more.append(summary, list);
      nav.append(more);
    }

    $$('.nav-item', nav).forEach((button) => {
      button.addEventListener('click', () => activateView(button.dataset.view));
    });
  }

  function addExperienceViews() {
    const main = $('.main-content');
    if (!main) return;

    if (!$('[data-view-panel="search"]')) {
      const section = node('section', 'view experience-view');
      section.dataset.viewPanel = 'search';
      section.innerHTML = `
        <div class="page-head"><div><p class="section-kicker">encontre no Possível</p><h1>Buscar</h1></div></div>
        <div class="experience-searchbar"><input id="discoverSearch" type="search" maxlength="120" placeholder="Buscar publicações, pessoas e anúncios"><button class="primary-button" id="discoverSearchButton" type="button">Buscar</button></div>
        <p class="experience-status" id="discoverStatus">Digite pelo menos 2 caracteres para pesquisar.</p>
        <div id="discoverResults" class="experience-results"></div>`;
      main.append(section);
    }

    if (!$('[data-view-panel="books"]')) {
      const section = node('section', 'view experience-view');
      section.dataset.viewPanel = 'books';
      section.innerHTML = `
        <div class="page-head"><div><p class="section-kicker">possível play · pro</p><h1>Livros</h1></div><span class="plan-badge">PRO</span></div>
        <div class="experience-hero"><div><strong>Biblioteca de livros</strong><p>Leia PDFs, EPUBs e textos próprios, licenciados ou em domínio público. Salve na sua nuvem privada e acesse em outros dispositivos.</p></div><span>▤</span></div>
        <div class="library-toolbar"><input id="bookUpload" type="file" accept=".pdf,.epub,.txt,application/pdf,application/epub+zip,text/plain" hidden><button class="primary-button" id="bookUploadButton" type="button">＋ Salvar livro na nuvem</button><span id="bookUsage" class="cloud-usage"></span></div>
        <p class="experience-status" id="bookStatus">Carregando sua biblioteca...</p>
        <div id="bookLibrary" class="experience-results"></div>`;
      main.append(section);
    }

    if (!$('[data-view-panel="watch"]')) {
      const section = node('section', 'view experience-view');
      section.dataset.viewPanel = 'watch';
      section.innerHTML = `
        <div class="page-head"><div><p class="section-kicker">possível play · pro</p><h1>Filmes e séries</h1></div><span class="plan-badge">PRO</span></div>
        <div class="experience-hero"><div><strong>Sua tela, sua biblioteca</strong><p>Assista a vídeos próprios, licenciados ou em domínio público salvos na nuvem do Possível Pro.</p></div><span>▶</span></div>
        <div class="library-toolbar"><select id="watchKind"><option value="movie">Filme</option><option value="series">Série</option></select><input id="watchUpload" type="file" accept="video/mp4,video/webm,.mp4,.webm" hidden><button class="primary-button" id="watchUploadButton" type="button">＋ Salvar vídeo na nuvem</button><span id="watchUsage" class="cloud-usage"></span></div>
        <p class="experience-status" id="watchStatus">Carregando sua biblioteca...</p>
        <div id="watchLibrary" class="experience-results"></div>`;
      main.append(section);
    }
  }

  function setupPrice() {
    const price = $('#proPrice');
    if (price) price.textContent = PRO_PRICE;

    const proCard = $$('.plan-card').find((card) => card.querySelector('h2')?.textContent?.includes('Possível Pro'));
    if (!proCard) return;
    const list = proCard.querySelector('ul');
    if (list) {
      const benefits = [
        '50 anúncios ativos',
        '10 GB de mídia social',
        '100 usos da Possível IA por dia',
        'Possível Play: filmes e séries autorizados',
        'Leitura de livros virtuais',
        'Músicas e áudios na Biblioteca Pro',
        '2 GB de nuvem pessoal privada',
        'Acesso com links temporários protegidos',
        'Estatísticas avançadas e selo PRO',
      ];
      list.replaceChildren(...benefits.map((benefit) => node('li', '', benefit)));
    }
  }

  async function runSearch() {
    const query = String($('#discoverSearch')?.value || '').trim();
    const results = $('#discoverResults');
    if (!results) return;

    if (query.length < 2) {
      results.replaceChildren();
      setStatus('discoverStatus', 'Digite pelo menos 2 caracteres para pesquisar.');
      return;
    }

    const db = getDb();
    if (!db) {
      setStatus('discoverStatus', 'Conectando ao Possível...');
      setTimeout(runSearch, 350);
      return;
    }

    setStatus('discoverStatus', 'Buscando...');
    results.replaceChildren();

    try {
      const pattern = `%${query}%`;
      const [postsResult, peopleResult, listingsResult] = await Promise.all([
        db.from('posts').select('id,body,created_at,profiles!posts_author_id_fkey(name,handle)').ilike('body', pattern).order('created_at', { ascending: false }).limit(12),
        db.from('profiles').select('id,name,handle,bio,avatar_url').ilike('name', pattern).order('name').limit(12),
        db.from('listings').select('id,title,description,price,location,status').eq('status', 'active').ilike('title', pattern).order('created_at', { ascending: false }).limit(12),
      ]);

      const error = postsResult.error || peopleResult.error || listingsResult.error;
      if (error) throw error;

      const posts = postsResult.data || [];
      const people = peopleResult.data || [];
      const listings = listingsResult.data || [];
      const total = posts.length + people.length + listings.length;

      if (!total) {
        setStatus('discoverStatus', 'Nenhum resultado encontrado.');
        return;
      }

      setStatus('discoverStatus', `${total} resultado${total === 1 ? '' : 's'} encontrado${total === 1 ? '' : 's'}.`, 'ok');

      const addGroup = (title, items, render) => {
        if (!items.length) return;
        results.append(node('h2', 'experience-group-title', title));
        const grid = node('div', 'experience-grid');
        items.forEach((item) => grid.append(render(item)));
        results.append(grid);
      };

      addGroup('Publicações', posts, (post) => {
        const card = node('article', 'experience-card');
        const author = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles;
        card.append(node('strong', '', author?.name || 'Pessoa'), node('small', '', author?.handle ? `@${author.handle}` : '@possivel'), node('p', '', post.body || ''));
        return card;
      });

      addGroup('Pessoas', people, (person) => {
        const card = node('article', 'experience-card');
        card.append(node('strong', '', person.name || 'Pessoa'), node('small', '', person.handle ? `@${person.handle}` : '@possivel'), node('p', '', person.bio || 'Perfil da comunidade Possível.'));
        return card;
      });

      addGroup('Mercado', listings, (listing) => {
        const card = node('article', 'experience-card');
        card.append(node('strong', '', listing.title || 'Anúncio'), node('small', '', listing.location || 'Localização não informada'));
        if (listing.price !== null && listing.price !== undefined) card.append(node('b', 'experience-price', new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(listing.price))));
        card.append(node('p', '', listing.description || ''));
        return card;
      });
    } catch (error) {
      console.error('busca geral:', error);
      setStatus('discoverStatus', error?.message || 'Não foi possível concluir a busca agora.', 'error');
    }
  }

  async function getProContext() {
    const db = getDb();
    if (!db) throw new Error('Ainda estamos conectando ao Possível. Tente novamente em alguns segundos.');
    const { data: { session }, error: sessionError } = await db.auth.getSession();
    if (sessionError) throw sessionError;
    if (!session?.user) return { db, session: null, plan: 'free' };
    const { data, error } = await db.rpc('get_effective_plan', { p_user_id: session.user.id });
    if (error) throw error;
    return { db, session, plan: typeof data === 'string' ? data : data?.plan || 'free' };
  }

  function renderLocked(container, statusId) {
    container.replaceChildren();
    const card = node('article', 'experience-card experience-locked');
    card.append(node('span', 'experience-lock-icon', '✦'), node('strong', '', `Exclusivo Possível Pro · ${PRO_PRICE}`), node('p', '', 'Assine para usar livros, filmes, séries e sua nuvem pessoal privada.'));
    const button = node('button', 'primary-button', 'Conhecer Possível Pro');
    button.type = 'button';
    button.addEventListener('click', () => activateView('plans'));
    card.append(button);
    container.append(card);
    setStatus(statusId, 'Este recurso é exclusivo para assinantes Pro.');
  }

  async function loadLibrary(view) {
    const isBooks = view === 'books';
    const container = $(isBooks ? '#bookLibrary' : '#watchLibrary');
    const statusId = isBooks ? 'bookStatus' : 'watchStatus';
    const usage = $(isBooks ? '#bookUsage' : '#watchUsage');
    if (!container) return;

    setStatus(statusId, 'Carregando sua biblioteca...');

    try {
      const { db, session, plan } = await getProContext();
      if (!session) {
        container.replaceChildren(node('article', 'experience-card experience-locked', 'Entre na sua conta para acessar a Biblioteca Pro.'));
        setStatus(statusId, 'Você precisa estar conectado.');
        if (usage) usage.textContent = '';
        return;
      }
      if (plan !== 'pro') {
        renderLocked(container, statusId);
        if (usage) usage.textContent = '';
        return;
      }

      const { data, error } = await db.from('pro_media_library').select('id,owner_id,kind,title,storage_path,mime_type,size_bytes,created_at').eq('owner_id', session.user.id).order('created_at', { ascending: false });
      if (error) throw error;

      const allItems = data || [];
      const used = allItems.reduce((sum, item) => sum + Number(item.size_bytes || 0), 0);
      if (usage) usage.textContent = `${formatBytes(used)} de 2 GB usados`;

      const items = allItems.filter((item) => isBooks ? item.kind === 'book' : item.kind === 'movie' || item.kind === 'series');
      container.replaceChildren();

      if (!items.length) {
        container.append(node('article', 'experience-card experience-empty', isBooks ? 'Nenhum livro salvo ainda.' : 'Nenhum filme ou episódio salvo ainda.'));
        setStatus(statusId, 'Sua nuvem está pronta para receber conteúdo autorizado.', 'ok');
        return;
      }

      setStatus(statusId, `${items.length} item${items.length === 1 ? '' : 's'} nesta seção.`, 'ok');
      const grid = node('div', 'experience-grid');

      items.forEach((item) => {
        const card = node('article', 'experience-card library-item');
        card.append(node('span', 'library-kind', item.kind === 'book' ? 'LIVRO' : item.kind === 'series' ? 'SÉRIE' : 'FILME'), node('strong', '', item.title), node('small', '', formatBytes(item.size_bytes)));
        const actions = node('div', 'library-actions');
        const openButton = node('button', 'primary-button', item.kind === 'book' ? 'Ler' : 'Assistir');
        openButton.type = 'button';
        openButton.addEventListener('click', async () => {
          try {
            const { data: signed, error: signedError } = await db.storage.from('pro-library').createSignedUrl(item.storage_path, 60 * 30);
            if (signedError) throw signedError;
            if (!signed?.signedUrl) throw new Error('Não foi possível abrir este conteúdo.');
            window.open(signed.signedUrl, '_blank', 'noopener');
          } catch (error) {
            setStatus(statusId, error?.message || 'Não foi possível abrir este conteúdo.', 'error');
          }
        });

        const removeButton = node('button', 'secondary-button library-remove', 'Remover');
        removeButton.type = 'button';
        removeButton.addEventListener('click', async () => {
          if (!window.confirm(`Remover “${item.title}” da sua nuvem?`)) return;
          try {
            const { error: storageError } = await db.storage.from('pro-library').remove([item.storage_path]);
            if (storageError) throw storageError;
            const { error: rowError } = await db.from('pro_media_library').delete().eq('id', item.id).eq('owner_id', session.user.id);
            if (rowError) throw rowError;
            await loadLibrary(view);
          } catch (error) {
            setStatus(statusId, error?.message || 'Não foi possível remover o arquivo.', 'error');
          }
        });
        actions.append(openButton, removeButton);
        card.append(actions);
        grid.append(card);
      });
      container.append(grid);
    } catch (error) {
      console.error('biblioteca pro:', error);
      container.replaceChildren();
      const message = String(error?.message || '');
      setStatus(statusId, message.includes('pro_media_library') || message.includes('schema cache') ? 'A Biblioteca Pro ainda precisa ser ativada no Supabase.' : (message || 'Não foi possível carregar a Biblioteca Pro.'), 'error');
      if (usage) usage.textContent = '';
    }
  }

  function safeName(name) {
    return String(name || 'arquivo')
      .normalize('NFKD')
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(-120) || 'arquivo';
  }

  async function uploadLibraryFile(view) {
    const isBooks = view === 'books';
    const input = $(isBooks ? '#bookUpload' : '#watchUpload');
    const statusId = isBooks ? 'bookStatus' : 'watchStatus';
    const file = input?.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_BYTES) {
      setStatus(statusId, 'Cada arquivo pode ter no máximo 500 MB.', 'error');
      input.value = '';
      return;
    }

    try {
      const { db, session, plan } = await getProContext();
      if (!session) throw new Error('Entre na sua conta para salvar arquivos.');
      if (plan !== 'pro') throw new Error(`Este recurso é exclusivo do Possível Pro por ${PRO_PRICE}.`);

      const kind = isBooks ? 'book' : ($('#watchKind')?.value === 'series' ? 'series' : 'movie');
      const unique = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const path = `${session.user.id}/${kind}/${Date.now()}-${unique}-${safeName(file.name)}`;
      setStatus(statusId, `Enviando ${file.name}...`);

      const { error: uploadError } = await db.storage.from('pro-library').upload(path, file, { contentType: file.type || undefined, cacheControl: '3600', upsert: false });
      if (uploadError) throw uploadError;

      const title = file.name.replace(/\.[^.]+$/, '').slice(0, 180) || 'Arquivo';
      const { error: rowError } = await db.from('pro_media_library').insert({ owner_id: session.user.id, kind, title, storage_path: path, mime_type: file.type || null, size_bytes: file.size });
      if (rowError) {
        await db.storage.from('pro-library').remove([path]);
        throw rowError;
      }

      input.value = '';
      setStatus(statusId, 'Arquivo salvo na sua nuvem.', 'ok');
      await loadLibrary(view);
    } catch (error) {
      console.error('upload biblioteca pro:', error);
      input.value = '';
      const message = String(error?.message || 'Não foi possível salvar o arquivo.');
      setStatus(statusId, message, 'error');
    }
  }

  function setupInteractions() {
    $('#discoverSearchButton')?.addEventListener('click', runSearch);
    let searchTimer;
    $('#discoverSearch')?.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(runSearch, 350);
    });
    $('#discoverSearch')?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        void runSearch();
      }
    });

    $('#searchInput')?.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      const dedicated = $('#discoverSearch');
      if (dedicated) dedicated.value = event.currentTarget.value;
      activateView('search');
      void runSearch();
    });

    $('#bookUploadButton')?.addEventListener('click', () => $('#bookUpload')?.click());
    $('#watchUploadButton')?.addEventListener('click', () => $('#watchUpload')?.click());
    $('#bookUpload')?.addEventListener('change', () => void uploadLibraryFile('books'));
    $('#watchUpload')?.addEventListener('change', () => void uploadLibraryFile('watch'));
  }

  function injectStyles() {
    if ($('#possivelExperienceStyles')) return;
    const style = node('style');
    style.id = 'possivelExperienceStyles';
    style.textContent = `
      .nav-more{margin-top:8px;border-top:1px solid rgba(0,0,0,.08);padding-top:8px}.nav-more summary{cursor:pointer;color:#77756f;font-size:12px;font-weight:800;padding:9px 12px;list-style:none}.nav-more summary::-webkit-details-marker{display:none}.nav-more-list{display:grid;gap:2px}.experience-view{padding-bottom:80px}.experience-searchbar,.library-toolbar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:18px 0}.experience-searchbar input,.library-toolbar select{flex:1;min-width:220px;border:1px solid #ded6ca;background:#fffdf8;border-radius:16px;padding:13px 15px;font:inherit;color:#202326}.experience-status{color:#77756f;min-height:24px}.experience-status[data-tone="error"]{color:#b3261e}.experience-status[data-tone="ok"]{color:#28633d}.experience-results{display:grid;gap:14px}.experience-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}.experience-group-title{font-size:18px;margin:18px 0 2px}.experience-card{display:grid;gap:7px;background:#fffdf8;border:1px solid #ded6ca;border-radius:18px;padding:16px;box-shadow:0 8px 28px rgba(32,35,38,.05)}.experience-card small{color:#77756f}.experience-card p{margin:0;line-height:1.5}.experience-price{color:#d94f43}.experience-hero{display:flex;justify-content:space-between;gap:20px;align-items:center;background:linear-gradient(135deg,#f7f2ff,#fffdf8);border:1px solid #ddd2f7;border-radius:22px;padding:22px}.experience-hero strong{font-size:24px}.experience-hero p{color:#77756f;max-width:680px}.experience-hero>span{font-size:44px;color:#d94f43}.cloud-usage{color:#77756f;font-weight:700}.experience-locked{text-align:center;justify-items:center;padding:28px}.experience-lock-icon{font-size:34px;color:#d94f43}.experience-empty{text-align:center;color:#77756f}.library-item{align-content:start}.library-kind{font-size:11px;font-weight:900;letter-spacing:.08em;color:#d94f43}.library-actions{display:flex;gap:8px;margin-top:6px}.library-actions button{flex:1}.secondary-button{border:1px solid #ded6ca;background:#fffdf8;color:#202326;border-radius:14px;padding:11px 14px;font-weight:800;cursor:pointer}.library-remove{color:#b3261e}@media(max-width:760px){.experience-searchbar>*{width:100%}.library-toolbar>*{width:100%}.experience-hero{align-items:flex-start}.experience-hero>span{font-size:34px}}`;
    document.head.append(style);
  }

  function init() {
    addExperienceViews();
    setupNavigation();
    setupPrice();
    setupInteractions();
    injectStyles();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
