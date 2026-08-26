import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { friendlyError } from '../lib/supabase';
import { Screen, InstallPrompt } from '../components/AppShell';
import Logo from '../components/Logo';
import { Button, Field, Rise, IconButton } from '../components/ui';

export default function Login() {
  const { signIn, user, booting } = useApp();
  const navigate = useNavigate();
  const { state } = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  if (!booting && user) return <Navigate to={state?.from || '/'} replace />;

  const submit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) return setError('Informe e-mail e senha para continuar.');
    setError('');
    setLoading(true);
    const err = await signIn(form.email, form.password);
    setLoading(false);
    if (err) setError(friendlyError(err));
    else navigate(state?.from || '/', { replace: true });
  };

  return (
    <Screen atmosphere="primary" center noNav>
      <Rise i={0} className="mb-5">
        <div className="between mb-4">
          <Logo size={64} />
          <Link className="link-btn cluster" to="/loja">
            <ArrowLeft size={18} aria-hidden="true" /> Ver a vitrine
          </Link>
        </div>
        <p className="t-label">Centro Espírita · Bazar beneficente</p>
        <h1 className="t-display">
          Bazar do<br />
          <span className="t-soft" style={{ color: 'var(--primary-ink)' }}>Renascer</span>
        </h1>
        <p className="t-muted mt-2">Roupas com história, ajuda que transforma.</p>
      </Rise>

      <Rise i={1}>
        <form className="card" onSubmit={submit} noValidate>
          <Field
            label="E-mail"
            type="email"
            value={form.email}
            onChange={set('email')}
            autoComplete="username"
            inputMode="email"
            placeholder="seu@email.com"
          />
          <Field
            className="field--pw"
            label="Senha"
            type={show ? 'text' : 'password'}
            value={form.password}
            onChange={set('password')}
            autoComplete="current-password"
            placeholder="••••••••"
            error={error}
            trailing={
              <IconButton
                label={show ? 'Ocultar senha' : 'Mostrar senha'}
                onClick={() => setShow((v) => !v)}
              >
                {show ? <EyeOff size={22} aria-hidden="true" /> : <Eye size={22} aria-hidden="true" />}
              </IconButton>
            }
          />
          <Button type="submit" loading={loading}>Entrar</Button>
        </form>
      </Rise>

      <Rise i={2}>
        <p className="t-center t-muted">
          Ainda não tem conta?{' '}
          <Link className="link-btn" to="/cadastro" state={state}>Criar conta</Link>
        </p>
      </Rise>

      <Rise i={3}><InstallPrompt /></Rise>
    </Screen>
  );
}
