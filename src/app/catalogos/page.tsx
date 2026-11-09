'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { Modal } from '@/components/Modal';
import { TipoEstudio } from '@/lib/types';
import { BookOpen, Plus, CheckCircle2, Sliders, Shield } from 'lucide-react';

export default function CatalogosPage() {
  const [tipos, setTipos] = useState<TipoEstudio[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New NOM form
  const [claveNOM, setClaveNOM] = useState('');
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [periodicidadMeses, setPeriodicidadMeses] = useState<number | ''>(24);
  const [categoria, setCategoria] = useState<'Salud' | 'Seguridad' | 'Organización' | 'Específicas'>('Salud');

  useEffect(() => {
    async function loadCatalog() {
      try {
        const res = await fetch('/api/catalogos');
        const data = await res.json();
        setTipos(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadCatalog();
  }, []);

  const handleCreateNOM = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/catalogos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claveNOM,
          nombre,
          descripcion,
          periodicidadMeses: periodicidadMeses === '' ? null : Number(periodicidadMeses),
          categoria,
          campos: [
            {
              id: Date.now(),
              nombreCampo: 'evaluacion_general',
              etiqueta: 'Evaluación y Diagnóstico Inicial',
              tipoDato: 'textarea',
              obligatorio: true,
              orden: 1,
            },
          ],
        }),
      });

      const nuevo = await res.json();
      setTipos([...tipos, nuevo]);
      setIsModalOpen(false);
      setClaveNOM('');
      setNombre('');
      setDescripcion('');
    } catch (err: any) {
      alert('Error al dar de alta la norma');
    }
  };

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <Navbar
          titulo="Catálogo Configurable de Normas Oficiales Mexicanas (NOM-STPS)"
          subtitulo="Parámetros, periodicidad oficial y definición de campos de captura sin alterar el código"
        />

        <main className="page-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: 0 }}>
              El sistema trata cada norma como un tipo de estudio dinámico parametrizable con su propio formulario.
            </p>
            <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
              <Plus size={16} /> Agregar Norma al Catálogo
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {tipos.map((tipo) => (
              <div key={tipo.id} className="card" style={{ marginBottom: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                    <div
                      style={{
                        padding: '0.75rem',
                        backgroundColor: tipo.categoria === 'Salud' ? '#ecfdf5' : '#eff6ff',
                        color: tipo.categoria === 'Salud' ? '#059669' : '#2563eb',
                        borderRadius: '8px',
                      }}
                    >
                      <BookOpen size={24} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <h4 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>{tipo.claveNOM}</h4>
                        <span
                          style={{
                            fontSize: '0.7rem',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '4px',
                            backgroundColor: '#f1f5f9',
                            fontWeight: 600,
                            color: '#475569',
                          }}
                        >
                          {tipo.categoria}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', marginTop: '0.2rem' }}>
                        {tipo.nombre}
                      </p>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                        {tipo.descripcion}
                      </p>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>
                      Periodicidad Típica
                    </span>
                    <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary)' }}>
                      {tipo.periodicidadMeses ? `${tipo.periodicidadMeses} meses` : 'Variable por VLE'}
                    </span>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
                      {tipo.campos.length} campos configurados
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Agregar Norma Oficial Mexicana al Catálogo">
        <form onSubmit={handleCreateNOM}>
          <div className="form-group">
            <label className="form-label">Clave Oficial de la NOM *</label>
            <input
              type="text"
              className="form-control"
              required
              placeholder="Ej: NOM-006-STPS-2023"
              value={claveNOM}
              onChange={(e) => setClaveNOM(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Nombre del Estudio / Materia *</label>
            <input
              type="text"
              className="form-control"
              required
              placeholder="Almacenamiento y manejo de materiales"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Descripción</label>
            <textarea
              className="form-control"
              rows={2}
              placeholder="Objetivo y alcance de la norma..."
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Categoría *</label>
              <select className="form-control" value={categoria} onChange={(e: any) => setCategoria(e.target.value)}>
                <option value="Salud">Salud</option>
                <option value="Seguridad">Seguridad</option>
                <option value="Organización">Organización</option>
                <option value="Específicas">Específicas</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Periodicidad (Meses)</label>
              <input
                type="number"
                className="form-control"
                placeholder="12, 24 (dejar vacío si variable)"
                value={periodicidadMeses}
                onChange={(e) => setPeriodicidadMeses(e.target.value === '' ? '' : Number(e.target.value))}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              Guardar Tipo de Estudio
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
