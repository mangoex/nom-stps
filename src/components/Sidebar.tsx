'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FileText,
  Building2,
  MapPin,
  BookOpen,
  UserCheck,
  ShieldAlert,
  ClipboardList,
  LayoutDashboard,
  PlusCircle,
  LogOut,
} from 'lucide-react';

interface SidebarProps {
  empresaNombre?: string;
  usuarioNombre?: string;
  usuarioRol?: string;
}

export function Sidebar({
  empresaNombre = 'Manufacturas del Norte S.A.',
  usuarioNombre = 'Ing. Carlos Mendoza',
  usuarioRol = 'REVISOR',
}: SidebarProps) {
  const pathname = usePathname();

  const navItems = [
    { label: 'Tablero de Control', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Estudios NOM-STPS', href: '/estudios', icon: FileText },
    { label: 'Registrar Estudio', href: '/estudios/nuevo', icon: PlusCircle },
    { label: 'Catálogo de Normas', href: '/catalogos', icon: BookOpen },
    { label: 'Centros de Trabajo', href: '/centros', icon: MapPin },
    { label: 'Elaboradores & Labs', href: '/elaboradores', icon: UserCheck },
    { label: 'Empresas (Tenants)', href: '/empresas', icon: Building2 },
    { label: 'Bitácora Legal', href: '/bitacora', icon: ClipboardList },
  ];

  return (
    <aside
      style={{
        width: '260px',
        backgroundColor: 'var(--bg-sidebar)',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
      }}
      className="sidebar no-print"
    >
      {/* Header Institucional */}
      <div
        style={{
          padding: '1.5rem',
          borderBottom: '1px solid #1e293b',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
        }}
      >
        <div
          style={{
            backgroundColor: 'var(--gov-maroon)',
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            color: 'white',
          }}
        >
          NOM
        </div>
        <div>
          <h1 style={{ fontSize: '0.95rem', fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
            STPS · Estudios
          </h1>
          <p style={{ fontSize: '0.7rem', color: '#94a3b8', margin: 0 }}>Gestión Normativa Multi-Tenant</p>
        </div>
      </div>

      {/* Tenant Indicator */}
      <div
        style={{
          padding: '0.875rem 1.25rem',
          backgroundColor: '#1e293b',
          margin: '1rem',
          borderRadius: '8px',
          border: '1px solid #334155',
        }}
      >
        <p style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>
          Empresa Activa
        </p>
        <p
          style={{
            fontSize: '0.85rem',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            color: '#f8fafc',
          }}
        >
          {empresaNombre}
        </p>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '0 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.625rem 0.875rem',
                borderRadius: '6px',
                fontSize: '0.85rem',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#ffffff' : '#94a3b8',
                backgroundColor: isActive ? 'var(--primary)' : 'transparent',
                transition: 'all 0.15s ease',
              }}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Footer */}
      <div
        style={{
          padding: '1.25rem',
          borderTop: '1px solid #1e293b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ overflow: 'hidden' }}>
          <p
            style={{
              fontSize: '0.8rem',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              color: '#f8fafc',
            }}
          >
            {usuarioNombre}
          </p>
          <span
            style={{
              fontSize: '0.7rem',
              backgroundColor: '#334155',
              padding: '0.1rem 0.5rem',
              borderRadius: '4px',
              color: '#38bdf8',
              fontWeight: 600,
            }}
          >
            {usuarioRol}
          </span>
        </div>
        <Link
          href="/login"
          title="Cerrar sesión"
          style={{
            color: '#94a3b8',
            padding: '0.4rem',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <LogOut size={18} />
        </Link>
      </div>
    </aside>
  );
}
