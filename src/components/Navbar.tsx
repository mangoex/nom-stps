'use client';

import React from 'react';
import Link from 'next/link';
import { Plus, Bell, ShieldCheck, Building } from 'lucide-react';

interface NavbarProps {
  titulo: string;
  subtitulo?: string;
}

export function Navbar({ titulo, subtitulo }: NavbarProps) {
  return (
    <header
      style={{
        height: '64px',
        backgroundColor: 'white',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 2rem',
      }}
      className="navbar no-print"
    >
      <div>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
          {titulo}
        </h2>
        {subtitulo && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>{subtitulo}</p>}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.4rem 0.8rem',
            backgroundColor: '#f1f5f9',
            borderRadius: '20px',
            fontSize: '0.75rem',
            fontWeight: 600,
            color: '#475569',
          }}
        >
          <ShieldCheck size={16} color="var(--success)" />
          <span>Cumplimiento STPS Vigente</span>
        </div>

        <Link href="/estudios/nuevo" className="btn btn-primary" style={{ padding: '0.45rem 1rem' }}>
          <Plus size={16} />
          <span>Nuevo Estudio</span>
        </Link>
      </div>
    </header>
  );
}
