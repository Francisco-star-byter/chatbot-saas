(function () {
  'use strict';

  const script = document.currentScript ||
    document.querySelector('script[data-client-id]') ||
    document.querySelector('script[src*="widget.js"]');
  const CLIENT_ID = script?.getAttribute('data-client-id') || '';
  const BASE_URL = script?.getAttribute('data-api-url') || 'http://localhost:3000';
  const API_URL = BASE_URL + '/chat';

  if (!CLIENT_ID) {
    console.error('[ChatBot] Missing data-client-id attribute');
    return;
  }

  let conversationId = null;
  let isOpen = false;

  // ── Styles ──────────────────────────────────────────────────────────────────
  const css = `
    #cb-btn {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: #2563eb;
      color: #fff;
      border: none;
      cursor: pointer;
      font-size: 26px;
      box-shadow: 0 4px 16px rgba(37,99,235,0.45);
      z-index: 9998;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform .2s, background .2s;
    }
    #cb-btn:hover { background: #1d4ed8; transform: scale(1.08); }

    #cb-box {
      position: fixed;
      bottom: 92px;
      right: 24px;
      width: 340px;
      max-height: 520px;
      background: #fff;
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.18);
      display: flex;
      flex-direction: column;
      z-index: 9999;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      transition: opacity .2s, transform .2s;
    }
    #cb-box.cb-hidden { opacity: 0; pointer-events: none; transform: translateY(12px); }

    #cb-header {
      background: #2563eb;
      color: #fff;
      padding: 14px 16px;
      font-weight: 600;
      font-size: 15px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    #cb-header span.cb-dot {
      width: 9px; height: 9px;
      background: #4ade80;
      border-radius: 50%;
      display: inline-block;
    }

    #cb-messages {
      flex: 1;
      overflow-y: auto;
      padding: 14px 12px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      background: #f8fafc;
    }

    .cb-msg {
      max-width: 82%;
      padding: 9px 13px;
      border-radius: 14px;
      font-size: 14px;
      line-height: 1.45;
      word-break: break-word;
    }
    .cb-msg.cb-bot {
      background: #fff;
      color: #1e293b;
      align-self: flex-start;
      border: 1px solid #e2e8f0;
      border-bottom-left-radius: 4px;
    }
    .cb-msg.cb-user {
      background: #2563eb;
      color: #fff;
      align-self: flex-end;
      border-bottom-right-radius: 4px;
    }
    .cb-msg.cb-typing {
      background: #fff;
      border: 1px solid #e2e8f0;
      align-self: flex-start;
      color: #94a3b8;
      font-style: italic;
      border-bottom-left-radius: 4px;
    }

    #cb-form {
      display: flex;
      border-top: 1px solid #e2e8f0;
      background: #fff;
      padding: 10px 10px;
      gap: 8px;
    }
    #cb-input {
      flex: 1;
      border: 1px solid #e2e8f0;
      border-radius: 20px;
      padding: 8px 14px;
      font-size: 14px;
      outline: none;
      resize: none;
      font-family: inherit;
      line-height: 1.4;
      max-height: 100px;
      overflow-y: auto;
      align-self: flex-end;
    }
    #cb-input:focus { border-color: #2563eb; }
    #cb-send {
      background: #2563eb;
      color: #fff;
      border: none;
      border-radius: 50%;
      width: 36px;
      height: 36px;
      cursor: pointer;
      font-size: 16px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background .2s;
    }
    #cb-send:hover { background: #1d4ed8; }
    #cb-send:disabled { background: #94a3b8; cursor: not-allowed; }

    #cb-bubble {
      position: fixed;
      bottom: 90px;
      right: 24px;
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 10px 14px;
      font-size: 13px;
      color: #1e293b;
      box-shadow: 0 4px 14px rgba(0,0,0,0.13);
      z-index: 9997;
      max-width: 210px;
      line-height: 1.45;
      opacity: 0;
      transform: translateY(8px) scale(0.95);
      transition: opacity .35s, transform .35s;
      pointer-events: none;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    #cb-bubble.cb-bubble-show {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
    #cb-bubble::after {
      content: '';
      position: absolute;
      bottom: -7px;
      right: 22px;
      width: 12px;
      height: 12px;
      background: #fff;
      border-right: 1px solid #e2e8f0;
      border-bottom: 1px solid #e2e8f0;
      transform: rotate(45deg);
    }

    @media (max-width: 400px) {
      #cb-box { width: calc(100vw - 24px); right: 12px; bottom: 80px; }
      #cb-bubble { right: 12px; }
    }
  `;

  // ── DOM ─────────────────────────────────────────────────────────────────────
  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

  function buildWidget() {
    // Button
    const btn = document.createElement('button');
    btn.id = 'cb-btn';
    btn.innerHTML = '💬';
    btn.setAttribute('aria-label', 'Abrir chat');
    btn.onclick = toggleChat;

    // Box
    const box = document.createElement('div');
    box.id = 'cb-box';
    box.className = 'cb-hidden';
    box.innerHTML = `
      <div id="cb-header">
        <span class="cb-dot"></span>
        Asesor Inmobiliario
      </div>
      <div id="cb-messages"></div>
      <form id="cb-form" autocomplete="off">
        <textarea id="cb-input" placeholder="Escribe tu mensaje..." maxlength="500" rows="1"></textarea>
        <button id="cb-send" type="submit" aria-label="Enviar">➤</button>
      </form>
    `;

    // Bubble
    const bubble = document.createElement('div');
    bubble.id = 'cb-bubble';
    document.body.appendChild(bubble);

    document.body.appendChild(btn);
    document.body.appendChild(box);

    document.getElementById('cb-form').onsubmit = handleSubmit;
    const inputEl = document.getElementById('cb-input');
    inputEl.oninput = function () {
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 100) + 'px';
    };
    inputEl.onkeydown = function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e);
      }
    };
  }

  // ── UI Helpers ───────────────────────────────────────────────────────────────
  async function fetchGreeting() {
    try {
      const res = await fetch(BASE_URL + '/chat/greeting?client_id=' + CLIENT_ID);
      const data = await res.json();
      return data.greeting || '¡Hola! ¿Estás buscando comprar o arrendar una propiedad?';
    } catch (err) {
      console.error('[ChatBot] fetchGreeting error:', err);
      return '¡Hola! ¿Estás buscando comprar o arrendar una propiedad?';
    }
  }

  async function toggleChat() {
    isOpen = !isOpen;
    const box = document.getElementById('cb-box');
    const btn = document.getElementById('cb-btn');
    box.classList.toggle('cb-hidden', !isOpen);
    btn.innerHTML = isOpen ? '✕' : '💬';
    if (isOpen) {
      hideBubblePermanently();
      if (document.getElementById('cb-messages').children.length === 0) {
        const greeting = await fetchGreeting();
        addMessage('bot', greeting);
      }
      document.getElementById('cb-input').focus();
    }
  }

  function addMessage(sender, text) {
    const msgs = document.getElementById('cb-messages');
    const div = document.createElement('div');
    div.className = `cb-msg cb-${sender}`;
    div.textContent = text;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
    return div;
  }

  function showTyping() {
    const msgs = document.getElementById('cb-messages');
    const div = document.createElement('div');
    div.className = 'cb-msg cb-typing';
    div.id = 'cb-typing';
    div.textContent = 'Escribiendo...';
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function removeTyping() {
    const t = document.getElementById('cb-typing');
    if (t) t.remove();
  }

  function setSendDisabled(disabled) {
    document.getElementById('cb-send').disabled = disabled;
    document.getElementById('cb-input').disabled = disabled;
  }

  // ── Bubble ───────────────────────────────────────────────────────────────────
  const bubbleMessages = [
    '👋 ¿Tienes alguna duda? ¡Pregúntame!',
    '🏠 ¿Buscas comprar o arrendar?',
    '✨ Puedo ayudarte a encontrar tu propiedad ideal',
    '💬 ¡Escríbeme, respondo al instante!',
  ];
  let bubbleIndex = 0;
  let bubbleTimer = null;

  function showBubble() {
    if (isOpen) return;
    const el = document.getElementById('cb-bubble');
    if (!el) return;
    el.textContent = bubbleMessages[bubbleIndex % bubbleMessages.length];
    bubbleIndex++;
    el.classList.add('cb-bubble-show');
    setTimeout(() => el.classList.remove('cb-bubble-show'), 4000);
  }

  function startBubble() {
    setTimeout(() => {
      showBubble();
      bubbleTimer = setInterval(showBubble, 10000);
    }, 3000);
  }

  function hideBubblePermanently() {
    if (bubbleTimer) clearInterval(bubbleTimer);
    const el = document.getElementById('cb-bubble');
    if (el) el.classList.remove('cb-bubble-show');
  }

  // ── API ──────────────────────────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();
    const input = document.getElementById('cb-input');
    const message = input.value.trim();
    if (!message) return;

    input.value = '';
    input.style.height = 'auto';
    addMessage('user', message);
    setSendDisabled(true);
    showTyping();

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: CLIENT_ID, message, conversation_id: conversationId }),
      });

      const data = await res.json();
      removeTyping();

      if (!res.ok) {
        addMessage('bot', 'Hubo un problema. Por favor intenta de nuevo.');
        console.error('[ChatBot] API error:', data);
      } else {
        conversationId = data.conversation_id;
        addMessage('bot', data.reply);
      }
    } catch (err) {
      removeTyping();
      addMessage('bot', 'No se pudo conectar. Verifica tu conexión.');
      console.error('[ChatBot] Network error:', err);
    } finally {
      setSendDisabled(false);
      document.getElementById('cb-input').focus();
    }
  }

  // ── Init ─────────────────────────────────────────────────────────────────────
  function init() {
    injectStyles();
    buildWidget();
    startBubble();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
