/* =====================================================================
   Projeto OBA® — Faixa de abertura com teste A/B  (bariatrico.net)
   ---------------------------------------------------------------------
   O QUE FAZ
   Assim que a home termina de montar, uma faixa de vidro fosco com borda
   dourada sobe do centro para cima com uma frase explicativa. Enquanto
   sobe, o desfoque sobre o site vai a zero. Depois do tempo configurado
   (ou no primeiro toque/clique/rolagem) a faixa some.

   A faixa NÃO BLOQUEIA nada: `pointer-events: none` em tudo. Se o usuário
   quiser clicar em "Sou Bariátrico" no primeiro segundo, ele clica — a
   faixa some sozinha.

   ---------------------------------------------------------------------
   COMO TESTAR (importante)
   A faixa aparece UMA VEZ POR SESSÃO. Recarregar, mesmo com Ctrl+Shift+R,
   não a traz de volta: `sessionStorage` só morre quando a aba fecha.

   Para rever quantas vezes quiser, use o modo de teste na URL:

     bariatrico.net/?intro=1   → mostra de novo, variante sorteada
     bariatrico.net/?intro=A   → força a frase A
     bariatrico.net/?intro=B   → força a frase B

   No modo de teste NADA é gravado no banco — assim os seus próprios
   testes não entram na amostra e não distorcem o resultado.
   ---------------------------------------------------------------------

   SINCRONIA COM O dc-runtime (support.js)
   O runtime esconde o <x-dc>, carrega React/ReactDOM do vendor/ de forma
   ASSÍNCRONA e só então monta o #dc-root. A faixa espera esse momento —
   antes disso não haveria site atrás para desfocar. A hero entra com a
   coreografia própria dela (~2,4s) POR BAIXO do desfoque.

   MEDIÇÃO (tabela `oba_landing_eventos`, ver migrate_oba_landing_ab.sql)
   - 1 evento 'impressao' por sessão, com a variante sorteada
   - 1 evento 'clique' no primeiro CTA tocado
   - "Saiu sem clicar" = impressões − sessões com clique

   PARA DESLIGAR O TESTE: remova a linha do <script> no index.html.
   ===================================================================== */

(function () {
  'use strict';

  /* ------------------------------------------------------------------
     1. CONFIGURAÇÃO — é aqui que você mexe
     ------------------------------------------------------------------ */

  // Os rótulos 'A' e 'B' são o que vai gravado no banco. As FRASES podem
  // ser trocadas a qualquer momento sem mexer no SQL — só anote em algum
  // lugar qual texto era o 'A' e qual era o 'B' em cada rodada do teste.
  var FRASES = {
    A: 'Um sistema de baixo custo, com suporte de IA e médicos de verdade, para otimizar a vida do bariátrico.',
    B: 'Um sistema com suporte de IA e médicos de verdade, para otimizar a vida de quem fez cirurgia bariátrica.'
  };

  // Todos os tempos em milissegundos, num lugar só.
  // A SUBIDA é lenta de propósito: o movimento é a parte que se olha. O
  // tempo total não precisa acompanhar essa lentidão, porque a faixa nunca
  // impede um clique — quem já decidiu não espera nada.
  var T = {
    visivel:      5200,   // tempo total da faixa em tela
    subida:       2100,   // duração do movimento de subida
    atrasoSubida:  250,   // espera antes de começar a subir
    aparecer:      900,   // fade-in da faixa
    foco:         2400,   // desfoque → nitidez do site atrás
    atrasoFoco:    350,   // espera antes de começar a clarear
    saida:         550    // fade-out no fim
  };

  var ALTURA_SUBIDA = '19vh';   // quanto a faixa sobe a partir do centro
  var MS_ESPERA_DC  = 4000;     // limite para o #dc-root aparecer
  var Z_INDEX       = 50;       // acima das seções (40), abaixo dos modais (60/70)

  // Mesmo Supabase do app, mesma chave anon já usada neste site.
  var SUPA_URL = 'https://pfzghybajniyesoiwrcp.supabase.co';
  var SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmemdoeWJham5peWVzb2l3cmNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5OTAyMzksImV4cCI6MjA5MDU2NjIzOX0.Cw_mNX4I0L_SsIp1lHr3XxmsloqNCr3zgXpd47B3Oc4';
  var TABELA   = 'oba_landing_eventos';

  // Identidade visual: vem do próprio site, não inventa paleta nova.
  var OURO  = '#E3AE37';
  var VIDRO = 'rgba(10,8,7,0.52)';   // mesmo vidro do #saibaCard

  var EASE = 'cubic-bezier(.2,.7,.2,1)';

  /* ------------------------------------------------------------------
     2. MODO DE TESTE
     ------------------------------------------------------------------ */

  var forcado = (function () {
    var m = /[?&]intro=([AB1])/i.exec(location.search || '');
    return m ? m[1].toUpperCase() : null;
  })();
  var ehTeste = forcado !== null;

  /* ------------------------------------------------------------------
     3. GUARDAS — quando NÃO mostrar nem registrar
     ------------------------------------------------------------------ */

  if (navigator.webdriver === true ||
      /bot|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit/i
        .test(navigator.userAgent || '')) return;

  // Link direto para uma seção (#sou-medico etc.): o usuário já sabe onde
  // quer chegar. No modo de teste isso não vale.
  if (!ehTeste && location.hash && location.hash.length > 1) return;

  var ss = (function () {
    try { sessionStorage.setItem('__t', '1'); sessionStorage.removeItem('__t'); return sessionStorage; }
    catch (e) { return null; }   // navegação privada em iOS antigo
  })();

  // Uma vez por sessão — exceto no modo de teste.
  if (!ehTeste && ss && ss.getItem('obaIntroVista') === '1') return;

  var poucoMovimento = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------------
     4. SESSÃO E SORTEIO DA VARIANTE
     ------------------------------------------------------------------ */

  function novoId() {
    return 'v' + Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
  }

  var SID = (ss && ss.getItem('obaAbSessao')) || novoId();
  if (ss && !ehTeste) ss.setItem('obaAbSessao', SID);

  var VAR;
  if (forcado === 'A' || forcado === 'B') {
    VAR = forcado;                       // ?intro=A / ?intro=B força a frase
  } else {
    VAR = ss && ss.getItem('obaAbVariante');
    if (VAR !== 'A' && VAR !== 'B') {
      VAR = Math.random() < 0.5 ? 'A' : 'B';
      if (ss && !ehTeste) ss.setItem('obaAbVariante', VAR);
    }
  }

  var t0 = Date.now();
  var faixaVisivel = false;
  var cliqueRegistrado = false;

  /* ------------------------------------------------------------------
     5. REGISTRO NO SUPABASE
     ------------------------------------------------------------------ */

  function registrar(tipo, extra) {
    if (ehTeste) return;   // teste seu não entra na amostra

    var corpo = {
      sessao_id: SID,
      variante: VAR,
      tipo: tipo,
      referrer: (document.referrer || '').slice(0, 300) || null,
      user_agent: (navigator.userAgent || '').slice(0, 300),
      largura_tela: window.innerWidth || null
    };
    if (extra) { for (var k in extra) { if (extra[k] != null) corpo[k] = extra[k]; } }

    try {
      // keepalive: o clique nos botões leva para app.bariatrico.net. Sem
      // isso o navegador cancelaria a requisição no meio da navegação e o
      // clique — o dado que mais importa — se perderia.
      fetch(SUPA_URL + '/rest/v1/' + TABELA, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPA_KEY,
          'Authorization': 'Bearer ' + SUPA_KEY,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(corpo),
        keepalive: true
      }).catch(function () {});
    } catch (e) { /* sem rede: o site funciona igual, só não mede */ }
  }

  /* ------------------------------------------------------------------
     6. IDENTIFICAÇÃO DO CTA CLICADO
     ------------------------------------------------------------------
     O dc-runtime transforma `onClick="{{ ... }}"` em handler React — o
     atributo não existe no DOM final. O que sobrevive é: href, data-contato,
     aria-label e o texto visível.

     O React 18 (createRoot) escuta no container #dc-root, não no document.
     Este listener é de captura no document, então roda ANTES do handler do
     site — inclusive antes de um preventDefault ou de uma navegação.      */

  function identificarCta(alvo) {
    if (!alvo || !alvo.closest) return null;

    var a = alvo.closest('a[href]');
    if (a) {
      var h = a.getAttribute('href') || '';
      if (h.indexOf('#sou-bariatrico') === 0) return 'SOU_BARIATRICO';
      if (h.indexOf('#sou-medico') === 0)     return 'SOU_MEDICO';
      if (h.indexOf('#conheco') === 0)        return 'CONHECO_BARIATRICO';
      if (h.indexOf('#contato') === 0)        return 'CONTATO';
      if (h.indexOf('mailto:') === 0)         return 'EMAIL';
      if (/wa\.me|whatsapp/i.test(h))         return 'WHATSAPP';
      if (/app\.bariatrico\.net/.test(h)) {
        if (/modo=medico/.test(h))    return 'APP_MEDICO';
        if (/modo=indicador/.test(h)) return 'APP_INDICADOR';
        if (/modo=restrito/.test(h))  return null;   // acesso interno, não é CTA
        return 'APP_PACIENTE';
      }
    }

    if (alvo.closest('[data-contato]')) return 'CONTATO';

    var rotulado = alvo.closest('[aria-label]');
    var rotulo = rotulado ? rotulado.getAttribute('aria-label') : '';
    if (!rotulo && alvo.textContent && alvo.textContent.length < 40) rotulo = alvo.textContent;
    rotulo = (rotulo || '').trim().toLowerCase();

    if (rotulo.indexOf('saiba mais') === 0)    return 'SAIBA_MAIS';
    if (rotulo.indexOf('como funciona') === 0) return 'COMO_FUNCIONA';

    return null;
  }

  document.addEventListener('click', function (ev) {
    if (cliqueRegistrado) return;
    var cta = identificarCta(ev.target);
    if (!cta) return;
    cliqueRegistrado = true;
    registrar('clique', {
      cta: cta,
      segundos_ate_clique: Math.round((Date.now() - t0) / 10) / 100,
      // Distingue quem agiu COM a frase em tela de quem agiu depois dela.
      dispensa_por: faixaVisivel ? 'clique' : 'timer'
    });
  }, true);

  /* ------------------------------------------------------------------
     7. ESPERAR O SITE MONTAR
     ------------------------------------------------------------------ */

  function quandoMontado(pronto, desiste) {
    var inicio = Date.now();
    (function tenta() {
      var raiz = document.getElementById('dc-root');
      if (raiz && raiz.querySelector('.sc-host')) {
        // Um quadro extra: o #dc-root já existe, mas a hero ainda não pintou.
        requestAnimationFrame(function () { requestAnimationFrame(pronto); });
        return;
      }
      if (Date.now() - inicio > MS_ESPERA_DC) return desiste();
      requestAnimationFrame(tenta);
    })();
  }

  // Aba em segundo plano: o rAF nem roda e o tempo de exposição seria
  // queimado sem ninguém olhando. Espera a aba ficar visível.
  function quandoVisivel(cb) {
    if (!document.hidden) return cb();
    document.addEventListener('visibilitychange', function ouve() {
      if (document.hidden) return;
      document.removeEventListener('visibilitychange', ouve);
      cb();
    });
  }

  quandoVisivel(function () {
    quandoMontado(mostrar, function () {
      // React não carregou a tempo — o site está quebrado de qualquer forma.
      // Não mostra a faixa e não registra impressão: melhor nenhum dado que
      // dado falso.
    });
  });

  /* ------------------------------------------------------------------
     8. A FAIXA
     ------------------------------------------------------------------ */

  function mostrar() {
    if (ss && !ehTeste) ss.setItem('obaIntroVista', '1');
    t0 = Date.now();
    faixaVisivel = true;
    registrar('impressao');

    var s = function (ms) { return (ms / 1000) + 's'; };

    var temVidro = window.CSS && CSS.supports &&
      (CSS.supports('backdrop-filter', 'blur(2px)') ||
       CSS.supports('-webkit-backdrop-filter', 'blur(2px)'));

    var wrap = document.createElement('div');
    wrap.id = 'obaIntro';
    wrap.setAttribute('aria-hidden', 'true');   // decorativo: o conteúdo real está na página
    wrap.style.cssText = 'position:fixed;inset:0;z-index:' + Z_INDEX + ';pointer-events:none;';

    // Véu: é ele que desfoca o site. Clareia enquanto a faixa sobe.
    var veu = document.createElement('div');
    var trFoco = s(T.foco) + ' ' + EASE + ' ' + s(T.atrasoFoco);
    veu.style.cssText =
      'position:absolute;inset:0;background:rgba(10,8,7,0.40);' +
      (temVidro ? '-webkit-backdrop-filter:blur(18px) saturate(0.92);backdrop-filter:blur(18px) saturate(0.92);' : '') +
      'transition:background ' + trFoco +
      ',-webkit-backdrop-filter ' + trFoco +
      ',backdrop-filter ' + trFoco + ';';

    // A faixa. Vidro fosco + borda fina dourada, quase toda a largura.
    var BASE = 'translate(-50%,-50%)';
    var faixa = document.createElement('div');
    faixa.style.cssText =
      'position:absolute;left:50%;top:50%;' +
      'width:calc(100% - 28px);max-width:1180px;' +
      'box-sizing:border-box;border-radius:8px;' +
      'border:1.5px solid ' + OURO + ';' +
      'background:' + (temVidro ? VIDRO : 'rgba(10,8,7,0.93)') + ';' +
      (temVidro ? '-webkit-backdrop-filter:blur(26px) saturate(1.35);backdrop-filter:blur(26px) saturate(1.35);' : '') +
      'box-shadow:0 40px 90px -30px rgba(0,0,0,0.75);' +
      'padding:clamp(18px,3.4vw,30px) clamp(20px,5vw,52px);' +
      'opacity:0;transform:' + BASE + ' translateY(16px);' +
      'transition:opacity ' + s(T.aparecer) + ' ease,' +
      'transform ' + s(T.subida) + ' ' + EASE + ' ' + s(T.atrasoSubida) + ';';

    var texto = document.createElement('p');
    texto.textContent = FRASES[VAR];
    texto.style.cssText =
      "margin:0;text-align:center;color:" + OURO + ";" +
      "font-family:'Cormorant Garamond',Georgia,serif;font-style:italic;font-weight:600;" +
      'font-size:clamp(19px,2.9vw,34px);line-height:1.3;letter-spacing:0.005em;' +
      'text-shadow:0 2px 24px rgba(0,0,0,0.55);';

    faixa.appendChild(texto);
    wrap.appendChild(veu);
    wrap.appendChild(faixa);   // irmão do véu, não filho: dois backdrop-filter
                               // aninhados se anulam em parte dos navegadores.
    document.body.appendChild(wrap);

    var encerrado = false;

    function encerrar() {
      if (encerrado) return;
      encerrado = true;
      faixaVisivel = false;

      // Desfoque sai na hora: se o usuário clicou num card, a seção entra
      // limpa, sem arrastar o véu por cima dela.
      veu.style.transition = 'opacity .25s ease';
      veu.style.opacity = '0';

      faixa.style.transition = 'opacity ' + s(T.saida) + ' ease,transform ' +
                               s(T.saida + 100) + ' cubic-bezier(.4,0,.2,1)';
      faixa.style.opacity = '0';
      faixa.style.transform = BASE + ' translateY(-26vh)';

      setTimeout(function () {
        if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
      }, T.saida + 150);

      document.removeEventListener('click', encerrar, true);
      document.removeEventListener('touchstart', encerrar, true);
      document.removeEventListener('keydown', encerrar, true);
      window.removeEventListener('scroll', encerrar, true);
      window.removeEventListener('wheel', encerrar, true);
    }

    document.addEventListener('click', encerrar, true);
    document.addEventListener('touchstart', encerrar, true);
    document.addEventListener('keydown', encerrar, true);
    window.addEventListener('scroll', encerrar, true);
    window.addEventListener('wheel', encerrar, true);

    // Entrada. requestAnimationFrame duplo: o primeiro quadro fixa o estado
    // inicial, o segundo dispara a transição. Sem isso o navegador funde os
    // dois e a faixa aparece já no lugar, sem subir.
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        faixa.style.opacity = '1';
        faixa.style.transform = BASE + (poucoMovimento ? '' : ' translateY(-' + ALTURA_SUBIDA.replace('-', '') + ')');

        veu.style.background = 'rgba(10,8,7,0)';
        if (temVidro) {
          veu.style.webkitBackdropFilter = 'blur(0px) saturate(1)';
          veu.style.backdropFilter = 'blur(0px) saturate(1)';
        }
      });
    });

    setTimeout(encerrar, poucoMovimento ? 3000 : T.visivel);
  }
})();
