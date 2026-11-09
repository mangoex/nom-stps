'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { Modal } from '@/components/Modal';
import { CentroTrabajo } from '@/lib/types';
import { MapPin, Plus, Users, Briefcase, UserCheck } from 'lucide-react';

export default function CentrosPage() {
  const [centros, setCentros] = useState<CentroTrabajo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New center form
  const [nombre, setNombre] = useState('');
  const [domicilio, setDomicilio] = useState('');
  const [giro, setGiro] = useState('');
  const [numTrabajadores, setNumTrabajadores] = useState(50);
  const [responsable, setResponsable] = useState('');
  const [areasInput, setAreasInput] = useState('');

  useEffect(() => {
    async function loadCentros() {
      try {
        const res = await fetch('/api/centros?empresaId=1');
        const data = await res.json();
        setCentros(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadCentros()
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/centros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empresaId: 1,
          nombre,
          domicilio,
          giro,
          numTrabajadores: Number(numTrabajadores),
          responsable,
          areas: areasInput.split(',').map((a) => a.trim()).filter(Boolean),
        }),
      });

      const nuevo = await res.json();
      setCentros([...centros, nuevo]);
      setIsModalOpen(false);
      setNombre('');
      setDomicilio('');
      setGiro('');
      setResponsable('');
      setAreasInput('');
    } catch (err: any) {
      alert('Error al registrar el centro de trabajo');
    }
  };

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <Navbar
          titulo="Centros de Trabajo Registrados"
          subtitulo="Unidades operativas y áreas sujetas a inspección normativa STPS"
        />

        <main className="page-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: 0 }}>
              Cada centro de trabajo concentra sus estudios normativos, planos y responsables designados.
            </p>
            <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
              <Plus size={16} /> Dar de Alta Centro de Trabajo
            </button>
          </div>

          <div className="grid-2">
            {centros.map((centro) => (
              <div key={centro.id} className="card" style={{ marginBottom: 0 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
                  <div
                    style={{
                      padding: '0.75rem',
                      backgroundColor: 'var(--primary-light)',
                      color: 'var(--primary)',
                      borderRadius: '8px',
                    }}
                  >
                    <MapPin size={24} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>{centro.nombre}</h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.2rem 0' }}>
                      {centro.domicilio}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.85rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Giro / Actividad</span>
                    <strong>{centro.giro}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Trabajadores</span>
                    <strong>{centro.numTrabajadores} empleados</strong>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Responsable de Seguridad</span>
                    <strong>{centro.responsable}</strong>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Áreas Auditadas</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.25rem' }}>
                      {centro.areas.map((area, idx) => (
                        <span
                          key={idx}
                          style={{
                            fontSize: '0.75rem',
                            backgroundColor: '#f1f5f9',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '4px',
                            color: '#334155',
                          }}
                        >
                          {area}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Dar de Alta Centro de Trabajo">
        <form onSubmit={handleCreate}>
          <div className="form-group">
            <label className="form-label">Nombre del Centro / Planta / Sucursal *</label>
            <input
              type="text"
              className="form-control"
              required
              placeholder="Ej: Planta Tijuana - Nave 2"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Domicilio Completo *</label>
            <input
              type="text"
              className="form-control"
              required
              placeholder="Calle, número, colonia, municipio y estado"
              value={domicilio}
              onChange={(e) => setDomicilio(e.target.value)}
            />
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Giro o Actividad Económica *</label>
              <input
                type="text"
                className="form-control"
                required
                placeholder="Manufactura metalmecánica, logística..."
                value={giro}
                onChange={(e) => setGiro(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Número de Trabajadores *</label>
              <input
                type="number"
                className="form-control"
                required
                min={1}
                value={numTrabajadores}
                onChange={(e) => setNumTrabajadores(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Responsable de Seguridad y Salud *</label>
            <input
              type="text"
              className="form-control"
              required
              placeholder="Ing. Coordinador de Seguridad"
              value={responsable}
              onChange={(e) => setResponsable(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Áreas o Puestos (separados por coma)</label>
            <input
              type="text"
              className="form-control"
              placeholder="Ensamble, Prensas, Almacén, Pintura"
              value={areasInput}
              onChange={(e) => setAreasInput(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              Guardar Centro
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
