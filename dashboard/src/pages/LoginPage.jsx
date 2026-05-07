import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

export default function LoginPage() {
  const { session, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Redirect to dashboard if session appears (handles OAuth callback race)
  useEffect(() => {
    if (!authLoading && session) {
      console.log('[Login] Session detected, redirecting to /dashboard');
      navigate('/dashboard', { replace: true });
    }
  }, [session, authLoading, navigate]);

  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  if (authLoading) return <div className="page-loading">Cargando...</div>;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);

    if (mode === 'register') {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else setInfo('Revisa tu correo para confirmar tu cuenta.');
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    }
    setLoading(false);
  }

  async function handleGoogle() {
    setError('');
    console.log('[Login] Starting Google OAuth, redirectTo:', window.location.origin);
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        skipBrowserRedirect: true,
      },
    });
    if (error) { console.error('[Login] OAuth error:', error); setError(error.message); return; }
    console.log('[Login] OAuth URL received:', data?.url?.slice(0, 80));
    if (data?.url) window.location.href = data.url;
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1 className="auth-logo">🏠 ChatBot Inmobiliario</h1>
        <h2>{mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}</h2>

        {error && <p className="msg msg-error">{error}</p>}
        {info && <p className="msg msg-info">{info}</p>}

        <form onSubmit={handleSubmit}>
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            placeholder="tu@correo.com"
          />
          <label>Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            placeholder="Mínimo 6 caracteres"
          />
          <button className="btn btn-primary" disabled={loading}>
            {loading ? 'Cargando...' : mode === 'login' ? 'Entrar' : 'Registrarme'}
          </button>
        </form>

        <div className="divider">o</div>
        <button className="btn btn-google" onClick={handleGoogle}>
          <GoogleIcon /> Continuar con Google
        </button>

        <p className="auth-switch">
          {mode === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
          <button className="link-btn" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); setInfo(''); }}>
            {mode === 'login' ? 'Regístrate' : 'Inicia sesión'}
          </button>
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" style={{ marginRight: 8 }}>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}
