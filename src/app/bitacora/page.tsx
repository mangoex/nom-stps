'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { BitacoraEvento } from '@/lib/types';
import { ClipboardList, Shield, Search, Lock, User, Terminal } from 'lucide-react';

export default function BitacoraPage() {
  const [eventos, setEventos] = useState<BitacoraEvento[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    async function loadBitacora() {
      try {
        const res = await fetch('/api/bitacora?empresaId=1');
        const data = await res.json();
        setEventos(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadBitacora();
  }, []);

  const filtered = eventos.filter((ev) => {
    return (
      ev.accion.toLowerCase().includes(busqueda.toLowerCase()) ||
      ev.entidad.toLowerCase().includes(busqueda.toLowerCase()) ||
      (ev.usuarioNombre && ev.usuarioNombre.toLowerCase().includes(busqueda.toLowerCase()))
    );
  });

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <Navbar
          titulo="Bitácora Legal de Auditoría Inmutable"
          subtitulo="Registro cronológico forense de operaciones, dictámenes y accesos al sistema"
        />

        <main className="page-body">
          <div
            className="card"
            style={{
              padding: '1rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  padding: '0.5rem',
                  backgroundColor: '#f1f5f9',
                  borderRadius: '6px',
                  color: 'var(--text-main)',
                }}
              >
                <Lock size={20} />
              </div>
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>Registro de Trazabilidad No Editable</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                  Cumple con los requerimientos de auditoría de la LFT y la Ley de Infraestructura de la Calidad.
                </p>
              </div>
            </div>

            <div style={{ position: 'relative', width: '280px' }}>
              <input
                type="text"
                className="form-control"
                style={{ paddingLeft: '2.25rem' }}
                placeholder="Filtrar por acción o usuario..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
              <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
            </div>
          </div>

          <div className="card">
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Fecha y Hora (UTC)</th>
                    <th>Acción Realizada</th>
                    <th>Entidad</th>
                    <th>Usuario Responsable</th>
                    <th>IP Origen</th>
                    <th>Detalles Técnicos</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length > 0 ? (
                    filtered.map((ev) => (
                      <tr key={ev.id}>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {new Date(ev.fecha).toLocaleString('es-MX')}
                        </td>
                        <td>
                          <span
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              padding: '0.2rem 0.5rem',
                              borderRadius: '4px',
                              backgroundColor: ev.accion.includes('APROB') ? 'var(--success-bg)' : '#f1f5f9',
                              color: ev.accion.includes('APROB') ? 'var(--success)' : 'var(--text-main)',
                              display: 'inline-block',
                            }}
                          >
                            {ev.accion}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600 }}>{ev.entidad}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem' }}>
                            <User size={14} color="var(--text-muted)" />
                            <span>{ev.usuarioNombre || 'Sistema Automático'}</span>
                          </div>
                        </td>
                        <td style={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>{ev.ip}</td>
                        <td>
                          <pre
                            style={{
                              fontSize: '0.75rem',
                              background: '#f8fafc',
                              padding: '0.3rem 0.5rem',
                              borderRadius: '4px',
                              border: '1px solid #e2e8f0',
                              maxWidth: '300px',
                              overflowX: 'auto',
                              margin: 0,
                            }}
                          >
                            {JSON.stringify(ev.detalles || {}, null, 1)}
                          </pre>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                        No se registraron eventos de auditoría coincidentes.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
