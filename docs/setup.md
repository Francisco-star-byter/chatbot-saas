# Setup Guide — Chatbot SaaS Inmobiliario

## Requisitos previos
- Node.js 18+
- Cuenta en Supabase (supabase.com)
- Cuenta en Anthropic (console.anthropic.com)

## FASE 1 — Arrancar el backend

```bash
cd backend
cp .env.example .env
# Editar .env con tus claves reales
npm install
npm run dev
```

Verificar que funciona:
```bash
curl http://localhost:3000/health
```

Respuesta esperada:
```json
{ "status": "ok", "timestamp": "...", "env": "development" }
```

Probar endpoint /chat (stub):
```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"client_id": "test-client", "message": "Hola"}'
```

Respuesta esperada:
```json
{
  "reply": "[STUB] Received: \"Hola\" from client test-client",
  "conversation_id": "new-conversation-id",
  "lead_detected": false
}
```

## Variables de entorno (.env)

| Variable | Descripción |
|---|---|
| PORT | Puerto del servidor (default: 3000) |
| NODE_ENV | development / production |
| SUPABASE_URL | URL de tu proyecto Supabase |
| SUPABASE_SERVICE_ROLE_KEY | Clave service_role de Supabase (Settings → API) |
| ANTHROPIC_API_KEY | Clave de API de Anthropic |
| RATE_LIMIT_WINDOW_MS | Ventana de rate limiting en ms (default: 60000) |
| RATE_LIMIT_MAX_REQUESTS | Máx requests por ventana (default: 30) |
