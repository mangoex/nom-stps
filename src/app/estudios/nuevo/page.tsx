'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { DynamicForm } from '@/components/DynamicForm';
import { CentroTrabajo, Elaborador, TipoEstudio } from '@/lib/types';
import { ArrowLeft, Save, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

export default function NuevoEstudioPage() {
  const router = useRouter();

  const [centros, setCentros] = useState<CentroTrabajo[]>([]);
  const [tiposEstudio, setTiposEstudio] = useState<TipoEstudio[]>([]);
  const [elaboradores, setElaboradores] = useState<Elaborador[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [centroTrabajoId, setCentroTrabajoId] = useState<number | ''>('');
  const [tipoEstudioId, setTipoEstudioId] = useState<number | ''>('');
  const [elaboradorId, setElaboradorId] = useState<number | ''>('');
  const [fechaRealizacion, setFechaRealizacion] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [datosDinamicos, setDatosDinamicos] = useState<Record<string, any>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadCatalogs() {
      try {
        const [resCentros, resTipos, resElaboradores] = await Promise.all([
          fetch('/api/centros?empresaId=1'),
          fetch('/api/catalogos'),
          fetch('/api/elaboradores'),
        ]);

        const [dataCentros, dataTipos, dataElaboradores] = await Promise.all([
          resCentros.json(),
          resTipos.json(),
          resElaboradores.json(),
        ]);

        setCentros(dataCentros);
        setTiposEstudio(dataTipos);
        setElaboradores(dataElaboradores);

        if (dataCentros.length > 0) setCentroTrabajoId(dataCentros[0].id);
        if (dataTipos.length > 0) setTipoEstudioId(dataTipos[0].id);
        if (dataElaboradores.length > 0) setElaboradorId(dataElaboradores[0].id);
      } catch (e: any) {
        setError('Error cargando catálogos de centros y normas');
      } finally {
        setLoading(false);
      }
    }
    loadCatalogs();
  }, []);

  const tipoSeleccionado = tiposEstudio.find((t) => t.id === Number(tipoEstudioId));
  const elaboradorSeleccionado = elaboradores.find((e) => e.id === Number(elaboradorId));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/estudios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empresaId: 1,
          centroTrabajoId: Number(centroTrabajoId),
          tipoEstudioId: Number(tipoEstudioId),
          elaboradorId: Number(elaboradorId),
          fechaRealizacion,
          datos: datosDinamicos,
          estado: 'BORRADOR',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al guardar el estudio');
      }

      router.push(`/estudios/${data.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <Navbar titulo="Registro de Nuevo Estudio NOM-STPS" subtitulo="Captura parametrizada conforme a la norma oficial aplicable" />

        <main className="page-body">
          <div style={{ marginBottom: '1.5rem' }}>
            <Link href="/estudios" className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
              <ArrowLeft size={16} /> Volver al listado
            </Link>
          </div>

          {error && (
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
                gap: '0.5rem',
              }}
            >
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Step 1: Encabezado y Datos de Control (RN-01) */}
            <div className="card">
              <div className="card-header">
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
                  1. Datos de Control y Clasificación del Estudio (RN-01)
                </h3>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Centro de Trabajo *</label>
                  <select
                    className="form-control"
                    value={centroTrabajoId}
                    onChange={(e) => setCentroTrabajoId(Number(e.target.value))}
                    required
                  >
                    {centros.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre} ({c.giro})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Norma Oficial Mexicana (Tipo de Estudio) *</label>
                  <select
                    className="form-control"
                    value={tipoEstudioId}
                    onChange={(e) => {
                      setTipoEstudioId(Number(e.target.value));
                      setDatosDinamicos({}); // Limpiar datos dinámicos al cambiar de norma
                    }}
                    required
                  >
                    {tiposEstudio.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.claveNOM} - {t.nombre} ({t.periodicidadMeses ? `${t.periodicidadMeses} meses` : 'Variable por VLE'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Laboratorio o Elaborador Técnico Acreditado *</label>
                  <select
                    className="form-control"
                    value={elaboradorId}
                    onChange={(e) => setElaboradorId(Number(e.target.value))}
                    required
                  >
                    {elaboradores.map((elab) => (
                      <option key={elab.id} value={elab.id}>
                        {elab.nombre} [{elab.numAcreditacion}] (Vigencia: {elab.vigenciaAcreditacion})
                      </option>
                    ))}
                  </select>
                  {elaboradorSeleccionado && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      Acreditación: <strong>{elaboradorSeleccionado.numAcreditacion}</strong> · Tipo: {elaboradorSeleccionado.tipo}
                    </p>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Fecha de Realización del Estudio / Muestreo *</label>
                  <input
                    type="date"
                    className="form-control"
                    value={fechaRealizacion}
                    onChange={(e) => setFechaRealizacion(e.target.value)}
                    required
                  />
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    La fecha de vigencia se calculará automáticamente según la periodicidad oficial (RN-04).
                  </p>
                </div>
              </div>
            </div>

            {/* Step 2: Formulario Dinámico de la Norma Seleccionada */}
            <div className="card">
              <div className="card-header">
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
                    2. Requerimientos Técnicos y Mediciones: {tipoSeleccionado?.claveNOM}
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                    {tipoSeleccionado?.descripcion}
                  </p>
                </div>
              </div>

              {tipoSeleccionado && (
                <DynamicForm
                  campos={tipoSeleccionado.campos}
                  valores={datosDinamicos}
                  onChange={setDatosDinamicos}
                />
              )}
            </div>

            {/* Step 3: Botones de Acción */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginBottom: '3rem' }}>
              <Link href="/estudios" className="btn btn-secondary">
                Cancelar
              </Link>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                <Save size={16} /> {submitting ? 'Guardando...' : 'Guardar Estudio (Borrador)'}
              </button>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}
