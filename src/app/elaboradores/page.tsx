'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { Modal } from '@/components/Modal';
import { Elaborador } from '@/lib/types';
import { UserCheck, Plus, ShieldCheck, AlertTriangle, FileBadge2 } from 'lucide-react';

export default function ElaboradoresPage() {
  const [elaboradores, setElaboradores] = useState<Elaborador[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New elaborator state
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState<'Persona Física' | 'Laboratorio de Pruebas' | 'Unidad de Inspección / Verificación'>('Laboratorio de Pruebas');
  const [cedulaProfesional, setCedulaProfesional] = useState('');
  const [numAcreditacion, setNumAcreditacion] = useState('');
  const [vigenciaAcreditacion, setVigenciaAcreditacion] = useState('2028-12-31');
  const [correo, setCorreo] = useState('');
  const [telefono, setTelefono] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/elaboradores');
        const data = await res.json();
        setElaboradores(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/elaboradores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre,
          tipo,
          cedulaProfesional,
          numAcreditacion,
          vigenciaAcreditacion,
          correo,
          telefono,
        }),
      });

      const nuevo = await res.json();
      setElaboradores([...elaboradores, nuevo]);
      setIsModalOpen(false);
      setNombre('');
      setCedulaProfesional('');
      setNumAcreditacion('');
    } catch (e) {
      alert('Error al guardar elaborador');
    }
  };

  const hoy = new Date();

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <Navbar
          titulo="Padrón de Elaboradores, Laboratorios y Unidades de Inspección"
          subtitulo="Registro y control de acreditaciones ante la Entidad Mexicana de Acreditación (EMA) y STPS"
        />

        <main className="page-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: 0 }}>
              Garantiza que solo personal técnico o laboratorios con acreditación vigente avalen los dictámenes normativos.
            </p>
            <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
              <Plus size={16} /> Registrar Elaborador / Laboratorio
            </button>
          </div>

          <div className="grid-2">
            {elaboradores.map((elab) => {
              const vencida = new Date(elab.vigenciaAcreditacion) < hoy;

              return (
                <div key={elab.id} className="card" style={{ marginBottom: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div
                        style={{
                          padding: '0.75rem',
                          backgroundColor: vencida ? 'var(--danger-bg)' : 'var(--success-bg)',
                          color: vencida ? 'var(--danger)' : 'var(--success)',
                          borderRadius: '8px',
                        }}
                      >
                        <UserCheck size={24} />
                      </div>
                      <div>
                        <h4 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>{elab.nombre}</h4>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            color: 'var(--text-muted)',
                            display: 'inline-block',
                            marginTop: '0.15rem',
                          }}
                        >
                          {elab.tipo}
                        </span>
                      </div>
                    </div>

                    {vencida ? (
                      <span className="badge badge-vencido">Acreditación Vencida</span>
                    ) : (
                      <span className="badge badge-aprobado">Acreditado Vigente</span>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.85rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>No. Acreditación STPS / EMA</span>
                      <strong>{elab.numAcreditacion}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Vigencia Oficial</span>
                      <strong style={{ color: vencida ? 'var(--danger)' : 'inherit' }}>{elab.vigenciaAcreditacion}</strong>
                    </div>
                    {elab.cedulaProfesional && (
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Cédula Profesional</span>
                        <strong>{elab.cedulaProfesional}</strong>
                      </div>
                    )}
                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Contacto</span>
                      <span>{elab.correo}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Registrar Elaborador o Laboratorio de Ensayos">
        <form onSubmit={handleCreate}>
          <div className="form-group">
            <label className="form-label">Nombre o Razón Social *</label>
            <input
              type="text"
              className="form-control"
              required
              placeholder="Ej: Laboratorio de Análisis Ambiental del Norte S.C."
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Tipo de Entidad Evaluadora *</label>
            <select className="form-control" value={tipo} onChange={(e: any) => setTipo(e.target.value)}>
              <option value="Laboratorio de Pruebas">Laboratorio de Pruebas (Ensayos de campo y laboratorio)</option>
              <option value="Unidad de Inspección / Verificación">Unidad de Inspección / Verificación (Dictaminación)</option>
              <option value="Persona Física">Persona Física (Especialista con Cédula)</option>
            </select>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Número de Acreditación EMA / STPS *</label>
              <input
                type="text"
                className="form-control"
                required
                placeholder="EMA-LP-0123 / STPS-AP-2025"
                value={numAcreditacion}
                onChange={(e) => setNumAcreditacion(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Vigencia de Acreditación *</label>
              <input
                type="date"
                className="form-control"
                required
                value={vigenciaAcreditacion}
                onChange={(e) => setVigenciaAcreditacion(e.target.value)}
              />
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Cédula Profesional (si aplica)</label>
              <input
                type="text"
                className="form-control"
                placeholder="CED-PROF-1234567"
                value={cedulaProfesional}
                onChange={(e) => setCedulaProfesional(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Correo Electrónico Oficial *</label>
              <input
                type="email"
                className="form-control"
                required
                placeholder="laboratorio@acreditado.mx"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              Guardar Elaborador
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
