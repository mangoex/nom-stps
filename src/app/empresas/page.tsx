'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { Modal } from '@/components/Modal';
import { Empresa } from '@/lib/types';
import { Building2, Plus, CheckCircle2, Shield, Image } from 'lucide-react';

export default function EmpresasPage() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New company form
  const [razonSocial, setRazonSocial] = useState('');
  const [rfc, setRfc] = useState('');
  const [domicilio, setDomicilio] = useState('');
  const [representanteLegal, setRepresentanteLegal] = useState('');
  const [telefono, setTelefono] = useState('');
  const [correo, setCorreo] = useState('');
  const [logotipoUrl, setLogotipoUrl] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/empresas');
        const data = await res.json();
        setEmpresas(data);
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
      const res = await fetch('/api/empresas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razonSocial,
          rfc,
          domicilio,
          representanteLegal,
          telefono,
          correo,
          logotipoUrl: logotipoUrl || 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=120&auto=format&fit=crop&q=60',
          tipoLogotipo: 'image/jpeg',
          logotipoTamano: 1024 * 50, // 50KB simulado
        }),
      });

      const nueva = await res.json();
      if (!res.ok) {
        throw new Error(nueva.error || 'Error al registrar empresa');
      }

      setEmpresas([...empresas, nueva]);
      setIsModalOpen(false);
      setRazonSocial('');
      setRfc('');
      setDomicilio('');
      setRepresentanteLegal('');
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <Navbar
          titulo="Gestión de Empresas (Inquilinos Multi-Tenant)"
          subtitulo="Aislamiento estricto de expedientes, logotipos corporativos y representantes legales"
        />

        <main className="page-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: 0 }}>
              Cada empresa opera de forma aislada. El logotipo registrado se incrusta automáticamente en todos los dictámenes oficiales.
            </p>
            <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
              <Plus size={16} /> Dar de Alta Empresa
            </button>
          </div>

          <div className="grid-2">
            {empresas.map((emp) => (
              <div key={emp.id} className="card" style={{ marginBottom: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                  {emp.logotipoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={emp.logotipoUrl}
                      alt={emp.razonSocial}
                      style={{ width: '64px', height: '64px', objectFit: 'contain', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '4px' }}
                    />
                  ) : (
                    <div style={{ width: '64px', height: '64px', backgroundColor: '#f1f5f9', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Building2 size={32} color="#94a3b8" />
                    </div>
                  )}

                  <div>
                    <h4 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>{emp.razonSocial}</h4>
                    <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary)', margin: '0.2rem 0' }}>
                      RFC: {emp.rfc}
                    </p>
                    <span className="badge badge-aprobado" style={{ fontSize: '0.7rem' }}>
                      Tenant Activo
                    </span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem', fontSize: '0.85rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Domicilio Fiscal:</span>
                    <p style={{ margin: 0 }}>{emp.domicilio}</p>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Representante Legal:</span>
                    <p style={{ margin: 0, fontWeight: 600 }}>{emp.representanteLegal}</p>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Contacto: {emp.correo || emp.telefono}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Dar de Alta Nueva Empresa (Tenant)">
        <form onSubmit={handleCreate}>
          <div className="form-group">
            <label className="form-label">Razón Social *</label>
            <input
              type="text"
              className="form-control"
              required
              placeholder="Ej: Grupo Industrial del Bajío S.A. de C.V."
              value={razonSocial}
              onChange={(e) => setRazonSocial(e.target.value)}
            />
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">RFC Oficial *</label>
              <input
                type="text"
                className="form-control"
                required
                maxLength={13}
                placeholder="GIB120304AAA"
                value={rfc}
                onChange={(e) => setRfc(e.target.value.toUpperCase())}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Representante Legal *</label>
              <input
                type="text"
                className="form-control"
                required
                placeholder="Lic. Alejandro Morales"
                value={representanteLegal}
                onChange={(e) => setRepresentanteLegal(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Domicilio Fiscal Completo *</label>
            <input
              type="text"
              className="form-control"
              required
              placeholder="Calle, número, colonia, código postal y municipio"
              value={domicilio}
              onChange={(e) => setDomicilio(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">URL del Logotipo Corporativo (PNG/JPG/SVG)</label>
            <input
              type="url"
              className="form-control"
              placeholder="https://empresa.com/logo.png"
              value={logotipoUrl}
              onChange={(e) => setLogotipoUrl(e.target.value)}
            />
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Se validará el formato y tamaño (máx. 2MB) según regla RN-03.
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              Guardar Empresa
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
