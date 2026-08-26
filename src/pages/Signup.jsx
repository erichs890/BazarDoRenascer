import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { friendlyError } from '../lib/supabase';
import { Screen } from '../components/AppShell';
import Logo from '../components/Logo';
import { Button, Field, Rise, IconButton, toast } from '../components/ui';

const MIN_PW = 6;

export default function Signup() {
  const { signUp, user, booting } = useApp();
  const navigate = useNavigate();
  const { state } = useLocation();
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  if (!booting && user) return <Navigate to={state?.from || '/'} replace />;

  const submit = async (e) => {
    e.preventDefault();
    const err = {};
    if (f.name.trim().length < 2) err.name = 'Informe seu nome completo.';
    if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) err.email = 'Informe um e-mail válido.';
    if (f.password.length < MIN_PW) err.password = `A senha precisa de pelo menos ${MIN_PW} caracteres.`;
    setErrors(err);
    if (Object.keys(err).length) {
      document.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }
    setLoading(true);
    const authErr = await signUp(f.name, f.email, f.password);
    setLoading(false);
    if (authErr) {
      setErrors({ email: friendlyError(authErr) });
      document.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }
    // Confirmação de e-mail está desligada no projeto: a sessão já vem pronta.
    toast(`Bem-vindo(a), ${f.name.split(' ')[0]}!`);
    navigate(state?.from || '/', { replace: true });
  };

  return (
    <Screen title="Criar conta" back noNav atmosphere="primary" center>
      <Rise i={0} className="mb-5">
        <div className="mb-4"><Logo size={64} /></div>
        <h1 className="t-title">
          Faça parte do<br />
          <span className="t-soft" style={{ color: 'var(--primary-ink)' }}>Renascer.</span>
        </h1>
        <p className="t-muted mt-2">
          Uma conta para comprar peças e acompanhar suas doações.
        </p>
      </Rise>

      <Rise i={1}>
        <form className="card" onSubmit={submit} noValidate>
          <Field
            label="Nome completo"
            value={f.name}
            onChange={set('name')}
            autoComplete="name"
            placeholder="Maria Silva"
            error={errors.name}
          />
          <Field
            label="E-mail"
            type="email"
            value={f.email}
            onChange={set('email')}
            autoComplete="email"
            inputMode="email"
            placeholder="seu@email.com"
            error={errors.email}
          />
          <Field
            className="field--pw"
            label="Senha"
            type={show ? 'text' : 'password'}
            value={f.password}
            onChange={set('password')}
            autoComplete="new-password"
            placeholder="••••••••"
            error={errors.password}
            hint={`Mínimo de ${MIN_PW} caracteres.`}
            trailing={
              <IconButton
                label={show ? 'Ocultar senha' : 'Mostrar senha'}
                onClick={() => setShow((v) => !v)}
              >
                {show ? <EyeOff size={22} aria-hidden="true" /> : <Eye size={22} aria-hidden="true" />}
              </IconButton>
            }
          />
          <Button type="submit" loading={loading}>Criar conta</Button>
        </form>
      </Rise>

      <Rise i={2}>
        <p className="t-center t-muted">
          Já tem conta? <Link className="link-btn" to="/login" state={state}>Entrar</Link>
        </p>
      </Rise>
    </Screen>
  );
}
