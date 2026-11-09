'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { StatusBadge } from '@/components/StatusBadge';
import {
  FileCheck2,
  Clock,
  AlertTriangle,
  XCircle,
  FileText,
  TrendingUp,
  ArrowUpRight,
  Send,
  Printer,
  ShieldCheck,
} from 'lucide-react';
import { Estudio } from '@/lib/types';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    total: 3,
    aprobados: 1,
    enRevision: 1,
    borrador: 0,
    porVencer: 1,
    vencidos: 0,
    indiceCumplimiento: 100,
  });
  const [estudios, setEstudios] = useState<Estudio[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [resStats, resEstudios] = await Promise.all([
          fetch('/api/alertas?empresaId=1'),
          fetch('/api/estudios?empresaId=1'),
        ]);
        const sData = await resStats.json();
        const eData = await resEstudios.json();
        setStats(sData);
        setEstudios(eData);
      } catch (err) {
        console.error('Error cargando datos:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <Navbar
          titulo="Tablero de Control de Cumplimiento NOM-STPS"
          subtitulo="Monitoreo normativo en tiempo real, vigencias y estatus de dictámenes"
        />

        <main className="page-body">
          {/* KPI Cards Grid */}
          <div className="grid-4" style={{ marginBottom: '2rem' }}>
            <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--primary-light)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FileText size={24} />
              </div>
              <div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Estudios</p>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{stats.total}</h3>
              </div>
            </div>

            <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--success-bg)',
                  color: 'var(--success)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FileCheck2 size={24} />
              </div>
              <div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Aprobados Vigentes</p>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--success)' }}>{stats.aprobados}</h3>
              </div>
            </div>

            <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--warning-bg)',
                  color: 'var(--warning)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Clock size={24} />
              </div>
              <div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>En Revisión</p>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--warning)' }}>{stats.enRevision}</h3>
              </div>
            </div>

            <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  backgroundColor: '#fff7ed',
                  color: '#ea580c',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AlertTriangle size={24} />
              </div>
              <div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Por Vencer (&lt;60d)</p>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ea580c' }}>{stats.porVencer}</h3>
              </div>
            </div>
          </div>

          {/* Compliance Meter & Information Banner */}
          <div
            className="card"
            style={{
              padding: '1.5rem',
              backgroundColor: 'white',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1.5rem',
              borderLeft: '5px solid var(--success)',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <ShieldCheck size={20} color="var(--success)" />
                <h4 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Índice de Conformidad Normativa Global</h4>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Basado en centros de trabajo auditados conforme al Catálogo Oficial de Normas de la STPS.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--primary-dark)' }}>
                  {stats.indiceCumplimiento}%
                </span>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Nivel de Cumplimiento</p>
              </div>
              <Link href="/estudios/nuevo" className="btn btn-primary">
                Programar Estudio
                <ArrowUpRight size={16} />
              </Link>
            </div>
          </div>

          {/* Critical Studies Table */}
          <div className="card">
            <div className="card-header">
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>Estudios Normativos Registrados</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                  Expedientes técnicos de medición y programas oficiales
                </p>
              </div>
              <Link href="/estudios" className="btn btn-secondary" style={{ fontSize: '0.8rem' }}>
                Ver Todos los Estudios
              </Link>
            </div>

            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Folio</th>
                    <th>Norma NOM-STPS</th>
                    <th>Fecha Realización</th>
                    <th>Vigencia Oficial</th>
                    <th>Estado</th>
                    <th style={{ textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {estudios.map((estudio) => (
                    <tr key={estudio.id}>
                      <td style={{ fontWeight: 600 }}>{estudio.folio}</td>
                      <td>
                        <span style={{ fontWeight: 600, color: 'var(--primary)' }}>
                          {estudio.tipoEstudioId === 1 && 'NOM-011-STPS-2001 (Ruido)'}
                          {estudio.tipoEstudioId === 2 && 'NOM-025-STPS-2008 (Iluminación)'}
                          {estudio.tipoEstudioId === 4 && 'NOM-022-STPS-2015 (Electricidad Estática)'}
                        </span>
                      </td>
                      <td>{estudio.fechaRealizacion}</td>
                      <td>
                        <span
                          style={{
                            fontWeight: 600,
                            color: estudio.estado === 'POR_VENCER' ? '#ea580c' : 'inherit',
                          }}
                        >
                          {estudio.fechaVigencia}
                        </span>
                      </td>
                      <td>
                        <StatusBadge estado={estudio.estado} />
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                          <Link
                            href={`/estudios/${estudio.id}`}
                            className="btn btn-secondary"
                            style={{ padding: '0.35rem 0.7rem', fontSize: '0.75rem' }}
                          >
                            Detalle
                          </Link>
                          <Link
                            href={`/estudios/${estudio.id}/imprimir`}
                            className="btn btn-secondary"
                            style={{ padding: '0.35rem 0.7rem', fontSize: '0.75rem' }}
                            title="Imprimir / PDF Oficial"
                          >
                            <Printer size={14} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
