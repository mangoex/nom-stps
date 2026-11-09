'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Lock, Mail, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Modal } from '@/components/Modal';

export default function LoginPage() {
  const router = useRouter();
  const [correo, setCorreo] = useState('revisor@manufacturasnorte.mx');
  const [contrasena, setContrasena] = useState('revisor123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecoveryOpen, setIsRecoveryOpen] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoverySuccess, setRecoverySuccess] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo, contrasena }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Credenciales inválidas');
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('nom_session_user', JSON.stringify(data.user));
        localStorage.setItem('nom_session_token', data.token);
      }

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoverySuccess('');
    try {
      const res = await fetch('/api/auth/recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: recoveryEmail }),
      });
      const data = await res.json();
      setRecoverySuccess(data.message || 'Instrucciones enviadas con éxito.');
    } catch (err: any) {
      setError('Error al procesar la recuperación');
    }
  };

  const setPresetUser = (email: string, pass: string) => {
    setCorreo(email);
    setContrasena(pass);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0f172a',
        padding: '1.5rem',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          backgroundColor: 'white',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          padding: '2.5rem',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              backgroundColor: 'var(--gov-maroon)',
              borderRadius: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              margin: '0 auto 1rem',
            }}
          >
            <Shield size={32} />
          </div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            Portal NOM-STPS
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Gestión Integral de Estudios Normativos y Dictaminación
          </p>
        </div>

        {error && (
          <div
            style={{
              padding: '0.75rem',
              backgroundColor: 'var(--danger-bg)',
              color: 'var(--danger)',
              border: '1px solid #fecaca',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
              marginBottom: '1.25rem',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">Correo Electrónico</label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                className="form-control"
                style={{ paddingLeft: '2.5rem' }}
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                required
                placeholder="usuario@empresa.com"
              />
              <Mail
                size={16}
                color="#94a3b8"
                style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)' }}
              />
            </div>
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="form-label" style={{ margin: 0 }}>
                Contraseña
              </label>
              <button
                type="button"
                onClick={() => setIsRecoveryOpen(true)}
                style={{ background: 'transparent', border: 'none', color: 'var(--primary)', fontSize: '0.75rem', cursor: 'pointer' }}
              >
                ¿Olvidó su contraseña?
              </button>
            </div>
            <div style={{ position: 'relative', marginTop: '0.375rem' }}>
              <input
                type="password"
                className="form-control"
                style={{ paddingLeft: '2.5rem' }}
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
                required
              />
              <Lock
                size={16}
                color="#94a3b8"
                style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)' }}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.75rem', fontSize: '0.95rem', marginTop: '0.5rem' }}
            disabled={loading}
          >
            {loading ? 'Iniciando sesión...' : 'Entrar al Sistema'}
            <ArrowRight size={18} />
          </button>
        </form>

        {/* Demo Quick Logins */}
        <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.75rem', textAlign: 'center' }}>
            ACCESOS DE PRUEBA RÁPIDOS POR ROL (RBAC)
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.4rem 0.6rem' }}
              onClick={() => setPresetUser('revisor@manufacturasnorte.mx', 'revisor123')}
            >
              Revisor Oficial
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.4rem 0.6rem' }}
              onClick={() => setPresetUser('elaborador@manufacturasnorte.mx', 'elaborador123')}
            >
              Elaborador / Lab
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.4rem 0.6rem' }}
              onClick={() => setPresetUser('admin@nomstps.gob.mx', 'admin123')}
            >
              Super Admin
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.4rem 0.6rem' }}
              onClick={() => setPresetUser('consulta@manufacturasnorte.mx', 'consulta123')}
            >
              Consulta / Auditor
            </button>
          </div>
        </div>
      </div>

      <Modal isOpen={isRecoveryOpen} onClose={() => setIsRecoveryOpen(false)} title="Recuperación de Contraseña">
        <form onSubmit={handleRecovery}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Ingrese su correo electrónico registrado para enviarle las instrucciones de restablecimiento seguro.
          </p>
          {recoverySuccess && (
            <div
              style={{
                padding: '0.75rem',
                backgroundColor: 'var(--success-bg)',
                color: 'var(--success)',
                border: '1px solid #a7f3d0',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.85rem',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <CheckCircle2 size={16} /> {recoverySuccess}
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Correo Registrado</label>
            <input
              type="email"
              className="form-control"
              value={recoveryEmail}
              onChange={(e) => setRecoveryEmail(e.target.value)}
              required
              placeholder="su_correo@empresa.com"
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
            Enviar Instrucciones
          </button>
        </form>
      </Modal>
    </div>
  );
}
