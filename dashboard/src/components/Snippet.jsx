import { useState } from 'react';

export default function Snippet({ clientId }) {
  const [copied, setCopied] = useState(false);
  const apiUrl = import.meta.env.VITE_API_URL || 'https://tu-backend.com';

  const code = `<script
  src="${apiUrl}/widget/widget.js"
  data-client-id="${clientId}"
  data-api-url="${apiUrl}"
  defer
></script>`;

  function handleCopy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="snippet-wrap">
      <pre className="snippet-code">{code}</pre>
      <button className="btn btn-outline snippet-btn" onClick={handleCopy}>
        {copied ? '✓ Copiado' : 'Copiar código'}
      </button>
      <p className="hint">Pega este código antes del cierre de tu etiqueta <code>&lt;/body&gt;</code>.</p>
    </div>
  );
}
