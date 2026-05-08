(function () {
  'use strict';

  const script = document.currentScript ||
    document.querySelector('script[data-client-id]') ||
    document.querySelector('script[src*="widget.js"]');
  const CLIENT_ID = script?.getAttribute('data-client-id') || '';
  const BASE_URL  = (script?.getAttribute('data-api-url') || 'http://localhost:3000').replace(/\/$/, '');

  if (!CLIENT_ID) {
    console.error('[ChatBot] Missing data-client-id attribute');
    return;
  }

  // ── State ────────────────────────────────────────────────────────────────────
  let conversationId = null;
  let isOpen         = false;
  let cachedGreeting = null;
  let properties     = [];
  let styleEl        = null;
  let cfg = {
    color:    '#2563eb',
    position: 'right',
    agent:    'Asesor Inmobiliario',
    whatsapp: '',
  };

  // ── Color helpers ────────────────────────────────────────────────────────────
  function darken(hex, amt) {
    amt = amt || 18;
    const n = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, (n >> 16) - amt);
    const g = Math.max(0, ((n >> 8) & 0xff) - amt);
    const b = Math.max(0, (n & 0xff) - amt);
    return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
  }

  function toRgb(hex) {
    const n = parseInt(hex.replace('#', ''), 16);
    return [(n >> 16), (n >> 8) & 0xff, n & 0xff].join(',');
  }

  // ── CSS ──────────────────────────────────────────────────────────────────────
  function buildCSS() {
    const c  = cfg.color;
    const cd = darken(c);
    const rg = toRgb(c);
    const s  = cfg.position === 'left' ? 'left' : 'right';

    return `
#cb-btn {
  position:fixed; bottom:24px; ${s}:24px;
  width:60px; height:60px; border-radius:50%;
  background:${c}; color:#fff; border:none; cursor:pointer;
  box-shadow:0 4px 20px rgba(${rg},.5);
  z-index:9998; display:flex; align-items:center; justify-content:center;
  transition:transform .2s, box-shadow .2s;
}
#cb-btn:hover { transform:scale(1.08); box-shadow:0 6px 28px rgba(${rg},.65); }
#cb-btn svg   { width:26px; height:26px; }

#cb-box {
  position:fixed; bottom:96px; ${s}:24px;
  width:360px; height:580px; max-height:calc(100vh - 110px);
  background:#fff; border-radius:20px;
  box-shadow:0 12px 48px rgba(0,0,0,.2);
  display:flex; flex-direction:column;
  z-index:9999; overflow:hidden;
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
  opacity:0; transform:translateY(16px) scale(.97); pointer-events:none;
  transition:opacity .25s, transform .3s cubic-bezier(.34,1.56,.64,1);
}
#cb-box.cb-open { opacity:1; transform:none; pointer-events:auto; }

#cb-header {
  background:linear-gradient(135deg,${c} 0%,${cd} 100%);
  color:#fff; padding:14px 16px;
  display:flex; align-items:center; gap:11px; flex-shrink:0;
}
#cb-avatar {
  width:42px; height:42px; border-radius:50%;
  background:rgba(255,255,255,.2);
  display:flex; align-items:center; justify-content:center;
  font-size:18px; font-weight:700; flex-shrink:0;
}
#cb-header-info { flex:1; min-width:0; }
#cb-agent-name  { font-weight:700; font-size:15px; line-height:1.2; }
#cb-online {
  font-size:11px; opacity:.85; margin-top:3px;
  display:flex; align-items:center; gap:5px;
}
#cb-online::before {
  content:''; width:7px; height:7px; border-radius:50%;
  background:#4ade80; display:inline-block; flex-shrink:0;
}
#cb-close {
  background:rgba(255,255,255,.15); border:none; color:#fff;
  width:30px; height:30px; border-radius:50%; cursor:pointer;
  display:flex; align-items:center; justify-content:center;
  transition:background .15s; flex-shrink:0;
}
#cb-close:hover { background:rgba(255,255,255,.28); }
#cb-close svg   { width:16px; height:16px; }

#cb-messages {
  flex:1; overflow-y:auto; padding:14px 13px 8px;
  display:flex; flex-direction:column; gap:4px;
  background:#f8fafc; scroll-behavior:smooth;
}
#cb-messages::-webkit-scrollbar { width:4px; }
#cb-messages::-webkit-scrollbar-thumb { background:#cbd5e1; border-radius:4px; }

.cb-wrap { display:flex; flex-direction:column; animation:cbIn .2s ease both; }
.cb-wrap.cb-bot  { align-items:flex-start; margin-bottom:6px; }
.cb-wrap.cb-user { align-items:flex-end;   margin-bottom:6px; }
@keyframes cbIn { from{opacity:0;transform:translateY(7px)} to{opacity:1;transform:none} }

.cb-bubble {
  max-width:83%; padding:10px 14px; border-radius:18px;
  font-size:14px; line-height:1.55; word-break:break-word; white-space:pre-wrap;
}
.cb-bubble.cb-bot  {
  background:#fff; color:#1e293b;
  border-bottom-left-radius:4px;
  box-shadow:0 1px 4px rgba(0,0,0,.08);
}
.cb-bubble.cb-user {
  background:${c}; color:#fff; border-bottom-right-radius:4px;
}
.cb-time { font-size:10px; color:#94a3b8; margin-top:3px; padding:0 3px; }

.cb-typing {
  display:flex; gap:5px; padding:11px 15px;
  background:#fff; border-radius:18px; border-bottom-left-radius:4px;
  box-shadow:0 1px 4px rgba(0,0,0,.08);
  animation:cbIn .2s ease both;
}
.cb-dot {
  width:7px; height:7px; background:#cbd5e1; border-radius:50%;
  animation:cbDot 1.3s infinite;
}
.cb-dot:nth-child(2){animation-delay:.18s}
.cb-dot:nth-child(3){animation-delay:.36s}
@keyframes cbDot {
  0%,60%,100%{transform:translateY(0);opacity:.5}
  30%{transform:translateY(-5px);opacity:1}
}

/* Property cards inside chat */
.cb-cards-wrap { animation:cbIn .25s ease both; }
.cb-cards-label {
  font-size:10px; font-weight:700; text-transform:uppercase;
  letter-spacing:.6px; color:#94a3b8; margin:8px 0 7px;
}
.cb-cards-scroll {
  display:flex; gap:10px; overflow-x:auto; padding-bottom:4px;
  -webkit-overflow-scrolling:touch;
}
.cb-cards-scroll::-webkit-scrollbar { display:none; }
.cb-prop-card {
  flex-shrink:0; width:155px; background:#fff;
  border-radius:12px; overflow:hidden;
  border:1px solid #e2e8f0;
  transition:box-shadow .2s,transform .2s;
}
.cb-prop-card:hover { box-shadow:0 4px 16px rgba(0,0,0,.1); transform:translateY(-2px); }
.cb-prop-img {
  height:88px; background:#e2e8f0; position:relative; overflow:hidden;
}
.cb-prop-img img { width:100%; height:100%; object-fit:cover; display:block; }
.cb-prop-img-ph {
  width:100%; height:100%; display:flex; align-items:center;
  justify-content:center; font-size:26px; color:#94a3b8;
}
.cb-prop-badge {
  position:absolute; top:6px; left:6px;
  background:${c}; color:#fff;
  font-size:9px; font-weight:700; padding:2px 7px; border-radius:10px;
}
.cb-prop-body  { padding:8px 9px 9px; }
.cb-prop-title {
  font-size:12px; font-weight:600; color:#0f172a;
  margin:0 0 3px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
}
.cb-prop-price { font-size:12px; font-weight:700; color:${c}; margin:0 0 3px; }
.cb-prop-loc   {
  font-size:10px; color:#94a3b8; margin:0;
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
}

/* WhatsApp bar */
#cb-wa {
  display:flex; align-items:center; justify-content:center; gap:8px;
  padding:9px 16px; background:#f0fdf4; border-top:1px solid #dcfce7;
  color:#16a34a; font-size:13px; font-weight:600;
  text-decoration:none; flex-shrink:0;
  transition:background .15s; font-family:inherit;
}
#cb-wa:hover { background:#dcfce7; }
#cb-wa svg   { width:18px; height:18px; flex-shrink:0; }

#cb-form {
  display:flex; border-top:1px solid #e2e8f0;
  background:#fff; padding:10px 12px; gap:8px;
  align-items:flex-end; flex-shrink:0;
}
#cb-input {
  flex:1; border:1.5px solid #e2e8f0; border-radius:20px;
  padding:9px 14px; font-size:14px; outline:none; resize:none;
  font-family:inherit; line-height:1.4; max-height:100px;
  overflow-y:auto; background:#f8fafc; color:#1e293b;
  transition:border-color .2s,background .2s;
}
#cb-input:focus { border-color:${c}; background:#fff; }
#cb-input::-webkit-scrollbar { display:none; }
#cb-send {
  background:${c}; color:#fff; border:none; border-radius:50%;
  width:38px; height:38px; cursor:pointer; flex-shrink:0;
  display:flex; align-items:center; justify-content:center;
  transition:background .2s,transform .15s;
}
#cb-send:hover:not(:disabled) { background:${cd}; transform:scale(1.06); }
#cb-send:disabled { background:#cbd5e1; cursor:not-allowed; }
#cb-send svg { width:16px; height:16px; }

#cb-bubble {
  position:fixed; bottom:94px; ${s}:24px;
  background:#fff; border:1px solid #e2e8f0;
  border-radius:14px; padding:10px 14px;
  font-size:13px; color:#1e293b; line-height:1.45;
  box-shadow:0 4px 16px rgba(0,0,0,.12);
  z-index:9997; max-width:220px; pointer-events:none;
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
  opacity:0; transform:translateY(8px) scale(.96);
  transition:opacity .3s,transform .3s;
}
#cb-bubble.cb-show { opacity:1; transform:none; }
#cb-bubble::after {
  content:''; position:absolute; bottom:-7px; ${s}:20px;
  width:12px; height:12px; background:#fff;
  border-right:1px solid #e2e8f0; border-bottom:1px solid #e2e8f0;
  transform:rotate(45deg);
}

@media(max-width:420px){
  #cb-box { width:calc(100vw - 20px); right:10px; left:10px; bottom:80px; }
  #cb-bubble,#cb-btn { ${s}:14px; }
}`;
  }

  function applyStyles() {
    if (!styleEl) {
      styleEl = document.createElement('style');
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = buildCSS();
  }

  // ── SVG icons ────────────────────────────────────────────────────────────────
  var I = {
    chat:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    send:  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>',
    wa:    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M11.999 2C6.477 2 2 6.477 2 12c0 1.77.46 3.435 1.264 4.888L2 22l5.294-1.236A9.955 9.955 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 11.999 2zm0 18a7.955 7.955 0 0 1-4.065-1.11l-.29-.173-3.146.735.761-3.067-.19-.305A7.956 7.956 0 0 1 4 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.588 8-7.999 8z"/></svg>',
  };

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function esc(t) {
    return String(t)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;');
  }

  function fmt(text) {
    return esc(text)
      .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
      .replace(/\n/g,'<br>');
  }

  function hhmm() {
    var d = new Date();
    return ('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2);
  }

  function initials(name) {
    return (name || 'A').split(' ').map(function(w){return w[0]||'';}).join('').slice(0,2).toUpperCase() || '🏠';
  }

  function fmtPrice(p, op) {
    if (!p) return 'Consultar precio';
    return '$' + Number(p).toLocaleString('es-CO') + (op === 'rent' ? '/mes' : '');
  }

  // ── Build DOM ────────────────────────────────────────────────────────────────
  function buildWidget() {
    // Floating button
    var btn = document.createElement('button');
    btn.id = 'cb-btn';
    btn.setAttribute('aria-label','Abrir chat');
    btn.innerHTML = I.chat;
    btn.onclick = toggleChat;

    // Chat box
    var box = document.createElement('div');
    box.id = 'cb-box';
    box.innerHTML =
      '<div id="cb-header">' +
        '<div id="cb-avatar">' + initials(cfg.agent) + '</div>' +
        '<div id="cb-header-info">' +
          '<div id="cb-agent-name">' + esc(cfg.agent) + '</div>' +
          '<div id="cb-online">En línea</div>' +
        '</div>' +
        '<button id="cb-close" aria-label="Cerrar">' + I.close + '</button>' +
      '</div>' +
      '<div id="cb-messages"></div>' +
      '<div id="cb-footer"></div>';

    // Bubble
    var bubble = document.createElement('div');
    bubble.id = 'cb-bubble';

    document.body.appendChild(bubble);
    document.body.appendChild(btn);
    document.body.appendChild(box);

    document.getElementById('cb-close').onclick = toggleChat;

    var form = document.createElement('form');
    form.id = 'cb-form';
    form.autocomplete = 'off';
    form.innerHTML =
      '<textarea id="cb-input" placeholder="Escribe tu mensaje..." maxlength="500" rows="1"></textarea>' +
      '<button id="cb-send" type="submit" aria-label="Enviar">' + I.send + '</button>';
    form.onsubmit = handleSubmit;
    document.getElementById('cb-footer').appendChild(form);

    var inp = document.getElementById('cb-input');
    inp.oninput = function() {
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 100) + 'px';
    };
    inp.onkeydown = function(e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e); }
    };
  }

  function updateHeader() {
    var el = document.getElementById('cb-agent-name');
    if (el) el.textContent = cfg.agent;
    var av = document.getElementById('cb-avatar');
    if (av) av.textContent = initials(cfg.agent);
  }

  function updateWhatsApp() {
    var existing = document.getElementById('cb-wa');
    if (existing) existing.remove();
    if (!cfg.whatsapp) return;
    var num = cfg.whatsapp.replace(/\D/g,'');
    var a = document.createElement('a');
    a.id = 'cb-wa';
    a.href = 'https://wa.me/57' + num + '?text=Hola%2C%20me%20interesa%20una%20propiedad';
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.innerHTML = I.wa + ' Hablar con asesor por WhatsApp';
    var footer = document.getElementById('cb-footer');
    var form   = document.getElementById('cb-form');
    if (footer && form) footer.insertBefore(a, form);
  }

  // ── Messages ─────────────────────────────────────────────────────────────────
  function addMsg(sender, text) {
    var msgs = document.getElementById('cb-messages');
    var wrap = document.createElement('div');
    wrap.className = 'cb-wrap cb-' + sender;
    wrap.innerHTML =
      '<div class="cb-bubble cb-' + sender + '">' + fmt(text) + '</div>' +
      '<span class="cb-time">' + hhmm() + '</span>';
    msgs.appendChild(wrap);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function addPropertyCards(props) {
    if (!props || !props.length) return;
    var msgs = document.getElementById('cb-messages');
    var wrap = document.createElement('div');
    wrap.className = 'cb-cards-wrap';
    wrap.innerHTML =
      '<div class="cb-cards-label">Propiedades que te pueden interesar</div>' +
      '<div class="cb-cards-scroll">' +
      props.map(function(p) {
        var img = Array.isArray(p.images) && p.images[0]
          ? '<img src="' + esc(p.images[0]) + '" alt="' + esc(p.title) + '" loading="lazy">'
          : '<div class="cb-prop-img-ph">🏠</div>';
        var badge  = p.operation_type === 'sale' ? 'Venta' : 'Arriendo';
        var price  = fmtPrice(p.price, p.operation_type);
        var loc    = [p.zone, p.city].filter(Boolean).join(', ');
        var specs  = p.bedrooms ? p.bedrooms + ' hab' + (p.area_sqm ? ' · ' + p.area_sqm + 'm²' : '') : '';
        return '<div class="cb-prop-card">' +
          '<div class="cb-prop-img">' + img + '<span class="cb-prop-badge">' + badge + '</span></div>' +
          '<div class="cb-prop-body">' +
            '<p class="cb-prop-title">' + esc(p.title) + '</p>' +
            '<p class="cb-prop-price">' + price + '</p>' +
            (specs ? '<p class="cb-prop-loc">' + specs + '</p>' : '') +
            (loc   ? '<p class="cb-prop-loc">📍 ' + esc(loc) + '</p>' : '') +
          '</div>' +
        '</div>';
      }).join('') +
      '</div>';
    msgs.appendChild(wrap);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function showTyping() {
    var msgs = document.getElementById('cb-messages');
    var div  = document.createElement('div');
    div.id   = 'cb-typing-wrap';
    div.className = 'cb-wrap cb-bot';
    div.innerHTML = '<div class="cb-typing"><div class="cb-dot"></div><div class="cb-dot"></div><div class="cb-dot"></div></div>';
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function removeTyping() {
    var t = document.getElementById('cb-typing-wrap');
    if (t) t.remove();
  }

  function setSendDisabled(v) {
    var s = document.getElementById('cb-send');
    var i = document.getElementById('cb-input');
    if (s) s.disabled = v;
    if (i) i.disabled = v;
  }

  // ── Bubble ───────────────────────────────────────────────────────────────────
  var BUBBLES = ['👋 ¿Tienes alguna duda? ¡Pregúntame!', '🏠 ¿Buscas comprar o arrendar?', '✨ Te ayudo a encontrar tu propiedad ideal'];
  var bIdx = 0, bTimer = null;

  function showBubble() {
    if (isOpen) return;
    var el = document.getElementById('cb-bubble');
    if (!el) return;
    el.textContent = BUBBLES[bIdx++ % BUBBLES.length];
    el.classList.add('cb-show');
    setTimeout(function(){ el.classList.remove('cb-show'); }, 4000);
  }

  function startBubble() {
    setTimeout(function(){
      showBubble();
      bTimer = setInterval(showBubble, 10000);
    }, 2800);
  }

  function stopBubble() {
    if (bTimer) { clearInterval(bTimer); bTimer = null; }
    var el = document.getElementById('cb-bubble');
    if (el) el.classList.remove('cb-show');
  }

  // ── Toggle ───────────────────────────────────────────────────────────────────
  async function toggleChat() {
    isOpen = !isOpen;
    var box = document.getElementById('cb-box');
    var btn = document.getElementById('cb-btn');
    if (isOpen) {
      box.classList.add('cb-open');
      btn.innerHTML = I.close;
      stopBubble();
      var msgs = document.getElementById('cb-messages');
      if (msgs && msgs.children.length === 0) {
        var greeting = cachedGreeting || await fetchGreeting();
        addMsg('bot', greeting);
      }
      setTimeout(function(){ var i = document.getElementById('cb-input'); if(i) i.focus(); }, 220);
    } else {
      box.classList.remove('cb-open');
      btn.innerHTML = I.chat;
    }
  }

  // ── API ──────────────────────────────────────────────────────────────────────
  async function fetchGreeting() {
    try {
      var res  = await fetch(BASE_URL + '/chat/greeting?client_id=' + CLIENT_ID);
      var data = await res.json();

      if (data.agent_name) { cfg.agent = data.agent_name; updateHeader(); }

      if (data.widget_color && /^#[0-9a-f]{6}$/i.test(data.widget_color)) {
        cfg.color = data.widget_color;
        applyStyles();
      }
      if (data.widget_position) cfg.position = data.widget_position;
      if (data.whatsapp_number)  { cfg.whatsapp = data.whatsapp_number; }

      cachedGreeting = data.greeting || '¡Hola! ¿Estás buscando comprar o arrendar una propiedad?';
      return cachedGreeting;
    } catch(e) {
      return '¡Hola! ¿Estás buscando comprar o arrendar una propiedad?';
    }
  }

  async function fetchProperties() {
    try {
      var res = await fetch(BASE_URL + '/chat/properties?client_id=' + CLIENT_ID);
      if (res.ok) { var d = await res.json(); properties = Array.isArray(d) ? d : []; }
    } catch(e) { /* silent */ }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    var inp = document.getElementById('cb-input');
    var msg = inp.value.trim();
    if (!msg) return;

    inp.value = '';
    inp.style.height = 'auto';
    addMsg('user', msg);
    setSendDisabled(true);
    showTyping();

    try {
      var res = await fetch(BASE_URL + '/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: CLIENT_ID, message: msg, conversation_id: conversationId }),
      });
      var data = await res.json();
      removeTyping();

      if (!res.ok) {
        addMsg('bot', data.error === 'plan_limit_reached'
          ? 'El chat no está disponible en este momento. Por favor contáctenos directamente.'
          : 'Hubo un problema. Por favor intenta de nuevo.');
      } else {
        conversationId = data.conversation_id;
        addMsg('bot', data.reply);
        if (data.show_properties && data.show_properties.length) {
          addPropertyCards(data.show_properties);
        }
        if (data.lead_score === 'warm' || data.lead_score === 'hot') {
          updateWhatsApp();
        }
      }
    } catch(err) {
      removeTyping();
      addMsg('bot', 'No se pudo conectar. Verifica tu conexión.');
    } finally {
      setSendDisabled(false);
      var i = document.getElementById('cb-input');
      if (i) i.focus();
    }
  }

  // ── Init ─────────────────────────────────────────────────────────────────────
  function init() {
    applyStyles();
    buildWidget();
    fetchGreeting();
    startBubble();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
