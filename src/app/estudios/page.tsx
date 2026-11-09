'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { StatusBadge } from '@/components/StatusBadge';
import { Modal } from '@/components/Modal';
import { Estudio, TipoEstudio } from '@/lib/types';
import { Plus, Search, Filter, Printer, Mail, Trash2, Eye, CheckCircle2, AlertCircle } from 'lucide-react';

export default function EstudiosPage() {
  const [estudios, setEstudios] = useState<Estudio[]>([]);
  const [tipos, setTipos] = useState<TipoEstudio[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<string>('TODOS');
  const [busqueda, setBusqueda] = useState('');
  
  // Modal de Envío por Correo
  const [isMailOpen, setIsMailOpen] = useState(false);
  const [selectedEstudio, setSelectedEstudio] = useState<Estudio | null>(null);
  const [destinatarioEmail, setDestinatarioEmail] = useState('');
  const [destinatarioNombre, setDestinatarioNombre] = useState('');
  const [asunto, setAsunto] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [mailStatus, setMailStatus] = useState<{ tipo: 'ok' | 'error'; msg: string } | null>(null);

  // Alerta de eliminación (RN-09)
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [resEstudios, resTipos] = await Promise.all([
          fetch('/api/estudios?empresaId=1'),
          fetch('/api/catalogos'),
        ]);
        const dataE = await resEstudios.json();
        const dataT = await resTipos.json();
        setEstudios(dataE);
        setTipos(dataT);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const getTipoNombre = (tipoId: number) => {
    const t = tipos.find((x) => x.id === tipoId);
    return t ? `${t.claveNOM} - ${t.nombre}` : `NOM Tipo ${tipoId}`;
  };

  const openMailModal = (estudio: Estudio) => {
    setSelectedEstudio(estudio);
    setAsunto(`Dictamen Oficial Folio ${estudio.folio} - STPS`);
    setMensaje(`Estimado responsable,\n\nSe adjunta el dictamen oficial del estudio ${getTipoNombre(estudio.tipoEstudioId)} con vigencia oficial hasta el ${estudio.fechaVigencia}.\n\nAtentamente,\nDepartamento de Seguridad e Higiene`);
    setDestinatarioEmail('');
    setDestinatarioNombre('');
    setMailStatus(null);
    setIsMailOpen(true);
  };

  const handleSendMail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEstudio) return;

    try {
      const res = await fetch(`/api/estudios/${selectedEstudio.id}/envios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destinatarios: [{ correo: destinatarioEmail, nombre: destinatarioNombre || destinatarioEmail }],
          asunto,
          mensaje,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error en el despacho del correo');
      }

      setMailStatus({
        tipo: 'ok',
        msg: `Correo encolado con éxito (Envío ID #${data.id}). La cola procesará la entrega vía SMTP con reintentos automáticos.`,
      });
    } catch (err: any) {
      setMailStatus({ tipo: 'error', msg: err.message });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Está seguro de que desea eliminar este estudio?')) return;
    setDeleteError(null);

    try {
      const res = await fetch(`/api/estudios/${id}?empresaId=1`, { method: 'DELETE' });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'No se pudo eliminar el estudio');
      }

      setEstudios(estudios.filter((e) => e.id !== id));
    } catch (err: any) {
      setDeleteError(err.message);
    }
  };

  const filteredEstudios = estudios.filter((e) => {
    const matchEstado = filtroEstado === 'TODOS' || e.estado === filtroEstado;
    const matchBusqueda =
      e.folio.toLowerCase().includes(busqueda.toLowerCase()) ||
      getTipoNombre(e.tipoEstudioId).toLowerCase().includes(busqueda.toLowerCase());
    return matchEstado && matchBusqueda;
  });

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <Navbar titulo="Expedientes de Estudios NOM-STPS" subtitulo="Gestión, dictaminación y registro histórico de cumplimiento" />

        <main className="page-body">
          {deleteError && (
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
              <AlertCircle size={20} />
              <div>
                <strong>Restricción de Retención Legal (RN-09):</strong>
                <p style={{ margin: 0, fontSize: '0.85rem' }}>{deleteError}</p>
              </div>
            </div>
          )}

          {/* Controls Bar */}
          <div className="card" style={{ padding: '1rem 1.25rem' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', flex: 1, minWidth: '280px', gap: '0.5rem' }}>
                <div style={{ position: 'relative', width: '100%' }}>
                  <input
                    type="text"
                    className="form-control"
                    style={{ paddingLeft: '2.5rem' }}
                    placeholder="Buscar por folio o norma..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                  />
                  <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)' }} />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Filter size={16} color="var(--text-muted)" />
                  <select
                    className="form-control"
                    style={{ width: 'auto', padding: '0.5rem 0.75rem' }}
                    value={filtroEstado}
                    onChange={(e) => setFiltroEstado(e.target.value)}
                  >
                    <option value="TODOS">Todos los Estados</option>
                    <option value="APROBADO">Aprobados</option>
                    <option value="EN_REVISION">En Revisión</option>
                    <option value="POR_VENCER">Por Vencer (&lt;60d)</option>
                    <option value="BORRADOR">Borrador</option>
                  </select>
                </div>

                <Link href="/estudios/nuevo" className="btn btn-primary">
                  <Plus size={16} /> Nuevo Estudio
                </Link>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="card">
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Folio</th>
                    <th>Norma NOM-STPS</th>
                    <th>Fecha Estudio</th>
                    <th>Vigencia Oficial</th>
                    <th>Estado</th>
                    <th style={{ textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEstudios.length > 0 ? (
                    filteredEstudios.map((estudio) => (
                      <tr key={estudio.id}>
                        <td style={{ fontWeight: 700 }}>
                          <Link href={`/estudios/${estudio.id}`} style={{ color: 'var(--primary)', textDecoration: 'underline' }}>
                            {estudio.folio}
                          </Link>
                        </td>
                        <td>{getTipoNombre(estudio.tipoEstudioId)}</td>
                        <td>{estudio.fechaRealizacion}</td>
                        <td style={{ fontWeight: 600 }}>{estudio.fechaVigencia}</td>
                        <td>
                          <StatusBadge estado={estudio.estado} />
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                            <Link
                              href={`/estudios/${estudio.id}`}
                              className="btn btn-secondary"
                              style={{ padding: '0.35rem 0.6rem' }}
                              title="Ver detalle de captura"
                            >
                              <Eye size={15} />
                            </Link>

                            <Link
                              href={`/estudios/${estudio.id}/imprimir`}
                              className="btn btn-secondary"
                              style={{ padding: '0.35rem 0.6rem' }}
                              title="Imprimir / Guardar en PDF"
                            >
                              <Printer size={15} />
                            </Link>

                            <button
                              type="button"
                              className="btn btn-secondary"
                              style={{ padding: '0.35rem 0.6rem' }}
                              title="Enviar por correo con adjunto"
                              onClick={() => openMailModal(estudio)}
                            >
                              <Mail size={15} />
                            </button>

                            <button
                              type="button"
                              className="btn btn-secondary"
                              style={{ padding: '0.35rem 0.6rem', color: 'var(--danger)' }}
                              title="Eliminar estudio"
                              onClick={() => handleDelete(estudio.id)}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                        No se encontraron estudios con los criterios seleccionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* Modal Envío Correo */}
      <Modal isOpen={isMailOpen} onClose={() => setIsMailOpen(false)} title="Enviar Dictamen Oficial por Correo">
        <form onSubmit={handleSendMail}>
          {mailStatus && (
            <div
              style={{
                padding: '0.75rem',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '1rem',
                fontSize: '0.85rem',
                backgroundColor: mailStatus.tipo === 'ok' ? 'var(--success-bg)' : 'var(--danger-bg)',
                color: mailStatus.tipo === 'ok' ? 'var(--success)' : 'var(--danger)',
                border: `1px solid ${mailStatus.tipo === 'ok' ? '#a7f3d0' : '#fecaca'}`,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              {mailStatus.tipo === 'ok' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              {mailStatus.msg}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Correo del Destinatario *</label>
            <input
              type="email"
              className="form-control"
              required
              placeholder="responsable.seguridad@empresa.com"
              value={destinatarioEmail}
              onChange={(e) => setDestinatarioEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Nombre del Destinatario</label>
            <input
              type="text"
              className="form-control"
              placeholder="Ing. Laura Sánchez"
              value={destinatarioNombre}
              onChange={(e) => setDestinatarioNombre(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Asunto *</label>
            <input
              type="text"
              className="form-control"
              required
              value={asunto}
              onChange={(e) => setAsunto(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Mensaje</label>
            <textarea
              className="form-control"
              rows={4}
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsMailOpen(false)}>
              Cerrar
            </button>
            <button type="submit" className="btn btn-primary">
              <Mail size={16} /> Encolar Envío SMTP
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
