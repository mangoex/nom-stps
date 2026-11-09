'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { StatusBadge } from '@/components/StatusBadge';
import { Modal } from '@/components/Modal';
import { CentroTrabajo, Elaborador, Estudio, TipoEstudio } from '@/lib/types';
import {
  ArrowLeft,
  Printer,
  Mail,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Building,
  Calendar,
  AlertTriangle,
  UserCheck,
  FileText,
} from 'lucide-react';

export default function EstudioDetallePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [estudio, setEstudio] = useState<Estudio | null>(null);
  const [tipo, setTipo] = useState<TipoEstudio | null>(null);
  const [centro, setCentro] = useState<CentroTrabajo | null>(null);
  const [elaborador, setElaborador] = useState<Elaborador | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Approval Modal
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [observacionesRevision, setObservacionesRevision] = useState('');
  const [approveError, setApproveError] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    async function loadEstudio() {
      try {
        const res = await fetch(`/api/estudios/${id}?empresaId=1`);
        if (!res.ok) throw new Error('Estudio no encontrado');
        const dataE: Estudio = await res.json();
        setEstudio(dataE);

        const [resTipo, resCentro, resElab] = await Promise.all([
          fetch(`/api/catalogos`),
          fetch(`/api/centros?empresaId=1`),
          fetch(`/api/elaboradores`),
        ]);

        const [tipos, centros, elabs] = await Promise.all([
          resTipo.json(),
          resCentro.json(),
          resElab.json(),
        ]);

        setTipo(tipos.find((t: TipoEstudio) => t.id === dataE.tipoEstudioId) || null);
        setCentro(centros.find((c: CentroTrabajo) => c.id === dataE.centroTrabajoId) || null);
        setElaborador(elabs.find((el: Elaborador) => el.id === dataE.elaboradorId) || null);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadEstudio();
  }, [id]);

  const handleEnviarRevision = async () => {
    if (!estudio) return;
    try {
      const res = await fetch('/api/estudios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...estudio, estado: 'EN_REVISION' }),
      });
      const updated = await res.json();
      setEstudio(updated);
    } catch (e: any) {
      alert('Error al enviar a revisión');
    }
  };

  const handleAprobar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!estudio) return;
    setApproveError(null);
    setApproving(true);

    try {
      const res = await fetch(`/api/estudios/${estudio.id}/aprobar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuarioRevisorId: 2,
          observaciones: observacionesRevision,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al aprobar el estudio');
      }

      setEstudio(data);
      setIsApproveOpen(false);
    } catch (err: any) {
      setApproveError(err.message);
    } finally {
      setApproving(false);
    }
  };

  if (loading) {
    return (
      <div className="app-container">
        <Sidebar />
        <div className="main-content">
          <main className="page-body">Cargando expediente técnico...</main>
        </div>
      </div>
    );
  }

  if (error || !estudio) {
    return (
      <div className="app-container">
        <Sidebar />
        <div className="main-content">
          <main className="page-body">
            <p style={{ color: 'var(--danger)' }}>{error || 'Estudio no disponible'}</p>
            <Link href="/estudios" className="btn btn-secondary">
              Volver
            </Link>
          </main>
        </div>
      </div>
    );
  }

  const isAcreditacionVencida =
    elaborador && new Date(elaborador.vigenciaAcreditacion) < new Date(estudio.fechaRealizacion);

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <Navbar
          titulo={`Expediente Oficial: ${estudio.folio}`}
          subtitulo={`${tipo?.claveNOM || 'NOM'} · ${tipo?.nombre || ''}`}
        />

        <main className="page-body">
          {/* Header Action Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <Link href="/estudios" className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
              <ArrowLeft size={16} /> Volver a expedientes
            </Link>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {estudio.estado === 'BORRADOR' && (
                <button type="button" className="btn btn-secondary" onClick={handleEnviarRevision}>
                  <Clock size={16} /> Enviar a Revisión Oficial
                </button>
              )}

              {estudio.estado === 'EN_REVISION' && (
                <button type="button" className="btn btn-success" onClick={() => setIsApproveOpen(true)}>
                  <CheckCircle2 size={16} /> Dictaminar y Aprobar
                </button>
              )}

              <Link href={`/estudios/${estudio.id}/imprimir`} className="btn btn-primary">
                <Printer size={16} /> Imprimir / Generar PDF Oficial
              </Link>
            </div>
          </div>

          {/* Warning banner if elaborator accreditation is expired */}
          {isAcreditacionVencida && (
            <div
              style={{
                padding: '1rem',
                backgroundColor: 'var(--danger-bg)',
                color: 'var(--danger)',
                border: '1px solid #fecaca',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
              }}
            >
              <AlertTriangle size={24} />
              <div>
                <strong>Advertencia de Invalidez Técnica (Regla RN-06):</strong>
                <p style={{ margin: 0, fontSize: '0.85rem' }}>
                  La acreditación de este elaborador ({elaborador?.nombre}) venció el {elaborador?.vigenciaAcreditacion},
                  siendo anterior a la fecha de muestreo ({estudio.fechaRealizacion}). El sistema bloqueará la aprobación oficial.
                </p>
              </div>
            </div>
          )}

          {/* Info Card Grid */}
          <div className="grid-3" style={{ marginBottom: '1.5rem' }}>
            {/* Status & Validity */}
            <div className="card" style={{ margin: 0 }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                Estatus &amp; Vigencia Oficial
              </p>
              <div style={{ margin: '0.75rem 0' }}>
                <StatusBadge estado={estudio.estado} />
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginTop: '0.5rem' }}>
                <p style={{ margin: '0.2rem 0' }}>
                  Fecha Realización: <strong>{estudio.fechaRealizacion}</strong>
                </p>
                <p style={{ margin: '0.2rem 0' }}>
                  Vigencia STPS: <strong style={{ color: 'var(--primary)' }}>{estudio.fechaVigencia}</strong>
                </p>
              </div>
            </div>

            {/* Centro de Trabajo */}
            <div className="card" style={{ margin: 0 }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                Centro de Trabajo Evaluado
              </p>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: '0.5rem 0 0.25rem' }}>{centro?.nombre}</h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>{centro?.domicilio}</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-main)', marginTop: '0.5rem' }}>
                Responsable: <strong>{centro?.responsable}</strong>
              </p>
            </div>

            {/* Elaborador / Laboratorio */}
            <div className="card" style={{ margin: 0 }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                Laboratorio / Unidad de Inspección
              </p>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: '0.5rem 0 0.25rem' }}>{elaborador?.nombre}</h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                Acreditación: <strong>{elaborador?.numAcreditacion}</strong>
              </p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-main)', marginTop: '0.25rem' }}>
                Vigencia Acreditación: <strong>{elaborador?.vigenciaAcreditacion}</strong>
              </p>
            </div>
          </div>

          {/* Captured Data Section */}
          <div className="card">
            <div className="card-header">
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
                Resultados y Mediciones Capturadas ({tipo?.claveNOM})
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {tipo?.campos.map((campo) => {
                const valor = estudio.datos[campo.nombreCampo];

                if (campo.tipoDato === 'table' && Array.isArray(valor)) {
                  return (
                    <div key={campo.id}>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-main)' }}>
                        {campo.etiqueta}
                      </h4>
                      <div className="table-responsive">
                        <table className="data-table">
                          <thead>
                            <tr>
                              {campo.columnasTabla?.map((c, i) => (
                                <th key={i}>{c}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {valor.map((row: any, rIdx: number) => (
                              <tr key={rIdx}>
                                {campo.columnasTabla?.map((c, cIdx) => (
                                  <td key={cIdx}>{row[c] || '-'}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={campo.id} style={{ paddingBottom: '0.75rem', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                      {campo.etiqueta}:
                    </span>
                    <p style={{ fontSize: '0.95rem', color: 'var(--text-main)', margin: '0.25rem 0 0' }}>
                      {valor || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin captura</span>}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Observations and Revision History */}
          {estudio.observaciones && (
            <div className="card" style={{ borderLeft: '4px solid var(--primary)' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                Observaciones del Dictaminador
              </h4>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', margin: 0 }}>
                {estudio.observaciones}
              </p>
            </div>
          )}
        </main>
      </div>

      {/* Approval Modal */}
      <Modal isOpen={isApproveOpen} onClose={() => setIsApproveOpen(false)} title="Aprobar y Emitir Dictamen Oficial">
        <form onSubmit={handleAprobar}>
          {approveError && (
            <div
              style={{
                padding: '0.75rem',
                backgroundColor: 'var(--danger-bg)',
                color: 'var(--danger)',
                border: '1px solid #fecaca',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '1rem',
                fontSize: '0.85rem',
              }}
            >
              {approveError}
            </div>
          )}

          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Al aprobar el estudio, se emitirá el dictamen oficial con fecha de vigencia inmutable calculada por el sistema.
            Se registrará un evento firmado en la bitácora legal.
          </p>

          <div className="form-group">
            <label className="form-label">Observaciones o Dictamen del Revisor</label>
            <textarea
              className="form-control"
              rows={3}
              placeholder="Estudio cumple a satisfacción con los requerimientos técnicos y límites permisibles de la NOM..."
              value={observacionesRevision}
              onChange={(e) => setObservacionesRevision(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsApproveOpen(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-success" disabled={approving}>
              <CheckCircle2 size={16} /> {approving ? 'Validando...' : 'Confirmar Aprobación'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
