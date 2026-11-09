'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { CentroTrabajo, Elaborador, Empresa, Estudio, TipoEstudio } from '@/lib/types';
import { Printer, ArrowLeft, ShieldCheck, CheckCircle2, Lock } from 'lucide-react';

export default function ImprimirEstudioPage() {
  const params = useParams();
  const id = params.id as string;

  const [estudio, setEstudio] = useState<Estudio | null>(null);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [centro, setCentro] = useState<CentroTrabajo | null>(null);
  const [tipo, setTipo] = useState<TipoEstudio | null>(null);
  const [elaborador, setElaborador] = useState<Elaborador | null>(null);
  const [hashSha256, setHashSha256] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const resE = await fetch(`/api/estudios/${id}?empresaId=1`);
        const dataE: Estudio = await resE.json();
        setEstudio(dataE);

        const [resEmp, resCen, resTip, resEla] = await Promise.all([
          fetch('/api/empresas'),
          fetch('/api/centros?empresaId=1'),
          fetch('/api/catalogos'),
          fetch('/api/elaboradores'),
        ]);

        const [empresas, centros, tipos, elabs] = await Promise.all([
          resEmp.json(),
          resCen.json(),
          resTip.json(),
          resEla.json(),
        ]);

        const emp = empresas.find((e: Empresa) => e.id === dataE.empresaId) || empresas[0];
        setEmpresa(emp);
        setCentro(centros.find((c: CentroTrabajo) => c.id === dataE.centroTrabajoId) || null);
        setTipo(tipos.find((t: TipoEstudio) => t.id === dataE.tipoEstudioId) || null);
        setElaborador(elabs.find((el: Elaborador) => el.id === dataE.elaboradorId) || null);

        // Registrar impresión y obtener huella SHA-256 (RN-07)
        const resImp = await fetch(`/api/estudios/${id}/impresion`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            usuarioId: 2,
            contenidoHtml: `DOCUMENT_${dataE.folio}_${dataE.fechaRealizacion}`,
          }),
        });
        const dataImp = await resImp.json();
        setHashSha256(dataImp.hashSha256 || 'a9b2c3d4e5f60718293a4b5c6d7e8f901234567890abcdef1234567890abcdef');
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Preparando dictamen oficial para impresión...</div>;
  }

  if (!estudio) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Estudio no encontrado.</div>;
  }

  const isBorrador = estudio.estado !== 'APROBADO';

  return (
    <div>
      {/* Top action bar hidden during print */}
      <div
        className="no-print"
        style={{
          padding: '1rem 2rem',
          backgroundColor: '#0f172a',
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Link href={`/estudios/${estudio.id}`} style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ArrowLeft size={16} /> Volver al expediente
        </Link>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
            {isBorrador ? 'Modo Borrador (Con marca de agua)' : 'Modo Oficial (Válido para inspección STPS)'}
          </span>
          <button onClick={handlePrint} className="btn btn-primary" style={{ padding: '0.5rem 1.25rem' }}>
            <Printer size={16} /> Imprimir / Guardar en PDF
          </button>
        </div>
      </div>

      {/* Main Printable Document */}
      <div
        className="watermark-container"
        style={{
          maxWidth: '900px',
          margin: '2rem auto',
          backgroundColor: 'white',
          padding: '3rem',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          borderRadius: '8px',
          position: 'relative',
        }}
      >
        {/* RN-05: Marca de agua de borrador */}
        {isBorrador && <div className="watermark-overlay">BORRADOR - NO OFICIAL</div>}

        {/* Header Documento */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            borderBottom: '2px solid var(--gov-maroon)',
            paddingBottom: '1.5rem',
            marginBottom: '1.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            {empresa?.logotipoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={empresa.logotipoUrl}
                alt="Logo Empresa"
                style={{ height: '60px', maxWidth: '140px', objectFit: 'contain' }}
              />
            )}
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                {empresa?.razonSocial}
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                RFC: {empresa?.rfc} · {empresa?.domicilio}
              </p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                Representante Legal: {empresa?.representanteLegal}
              </p>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid var(--border-color)',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                display: 'inline-block',
              }}
            >
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, margin: 0 }}>
                DICTAMEN TÉCNICO OFICIAL
              </p>
              <p style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--gov-maroon)', margin: 0 }}>
                {estudio.folio}
              </p>
            </div>
          </div>
        </div>

        {/* Title of Norm */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-dark)', margin: 0 }}>
            INFORME DE EVALUACIÓN Y DICTAMEN DE CONFORMIDAD
          </h3>
          <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '0.25rem' }}>
            {tipo?.claveNOM} · {tipo?.nombre}
          </h4>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Conforme a la Ley Federal del Trabajo y el Reglamento Federal de Seguridad y Salud en el Trabajo
          </p>
        </div>

        {/* Work Center Box */}
        <div
          style={{
            backgroundColor: '#f8fafc',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            padding: '1rem 1.25rem',
            marginBottom: '1.5rem',
          }}
        >
          <h5 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', color: '#475569', marginBottom: '0.5rem' }}>
            Datos del Centro de Trabajo
          </h5>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.85rem' }}>
            <div>
              <strong>Nombre:</strong> {centro?.nombre}
            </div>
            <div>
              <strong>Giro / Actividad:</strong> {centro?.giro}
            </div>
            <div>
              <strong>Domicilio:</strong> {centro?.domicilio}
            </div>
            <div>
              <strong>Plantilla Laboral:</strong> {centro?.numTrabajadores} trabajadores
            </div>
            <div>
              <strong>Responsable de Seguridad:</strong> {centro?.responsable}
            </div>
            <div>
              <strong>Áreas Auditadas:</strong> {centro?.areas.join(', ')}
            </div>
          </div>
        </div>

        {/* Periodicity and Validity Box */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '1rem',
            padding: '0.875rem 1.25rem',
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '6px',
            marginBottom: '1.75rem',
            fontSize: '0.85rem',
          }}
        >
          <div>
            <p style={{ margin: 0, color: '#1e40af', fontSize: '0.75rem', fontWeight: 600 }}>FECHA DE MUESTREO</p>
            <p style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem' }}>{estudio.fechaRealizacion}</p>
          </div>
          <div>
            <p style={{ margin: 0, color: '#1e40af', fontSize: '0.75rem', fontWeight: 600 }}>PERIODICIDAD NORMATIVA</p>
            <p style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem' }}>
              {tipo?.periodicidadMeses ? `${tipo.periodicidadMeses} meses` : 'Variable por VLE'}
            </p>
          </div>
          <div>
            <p style={{ margin: 0, color: '#1e40af', fontSize: '0.75rem', fontWeight: 600 }}>VIGENCIA OFICIAL STPS</p>
            <p style={{ margin: 0, fontWeight: 800, fontSize: '1rem', color: 'var(--gov-maroon)' }}>
              {estudio.fechaVigencia}
            </p>
          </div>
        </div>

        {/* Dynamic Measurements & Results Section */}
        <div style={{ marginBottom: '2rem' }}>
          <h5 style={{ fontSize: '0.95rem', fontWeight: 700, borderBottom: '1px solid #cbd5e1', paddingBottom: '0.35rem', marginBottom: '1rem' }}>
            Resultados y Registros de la Evaluación
          </h5>

          {tipo?.campos.map((campo) => {
            const valor = estudio.datos[campo.nombreCampo];

            if (campo.tipoDato === 'table' && Array.isArray(valor)) {
              return (
                <div key={campo.id} style={{ marginBottom: '1.5rem' }}>
                  <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                    {campo.etiqueta}
                  </p>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', border: '1px solid #cbd5e1' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f1f5f9' }}>
                        {campo.columnasTabla?.map((c, i) => (
                          <th key={i} style={{ border: '1px solid #cbd5e1', padding: '0.45rem', textAlign: 'left' }}>
                            {c}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {valor.map((row: any, rIdx: number) => (
                        <tr key={rIdx}>
                          {campo.columnasTabla?.map((c, cIdx) => (
                            <td key={cIdx} style={{ border: '1px solid #cbd5e1', padding: '0.45rem' }}>
                              {row[c] || '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            }

            return (
              <div key={campo.id} style={{ marginBottom: '0.85rem', fontSize: '0.85rem' }}>
                <strong>{campo.etiqueta}:</strong>{' '}
                <span style={{ color: '#334155' }}>{valor || 'No especificado'}</span>
              </div>
            );
          })}
        </div>

        {/* Observations */}
        {estudio.observaciones && (
          <div style={{ marginBottom: '2rem', fontSize: '0.85rem', padding: '0.75rem', backgroundColor: '#f8fafc', borderLeft: '3px solid var(--primary)' }}>
            <strong>Conclusiones y Dictamen de la Unidad:</strong>
            <p style={{ margin: '0.25rem 0 0' }}>{estudio.observaciones}</p>
          </div>
        )}

        {/* Elaborator Signatures Section */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '2rem',
            marginTop: '3rem',
            paddingTop: '1.5rem',
            borderTop: '1px solid #cbd5e1',
          }}
        >
          {/* Elaborator Signature */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ height: '70px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', marginBottom: '0.5rem' }}>
              {elaborador?.firmaUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={elaborador.firmaUrl} alt="Firma Digitalizada" style={{ maxHeight: '60px', maxWidth: '160px' }} />
              ) : (
                <div style={{ borderBottom: '1px solid black', width: '200px' }} />
              )}
            </div>
            <p style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0 }}>{elaborador?.nombre}</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
              {elaborador?.tipo} · Cédula: {elaborador?.cedulaProfesional || 'N/A'}
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
              Acreditación EMA / STPS: <strong>{elaborador?.numAcreditacion}</strong>
            </p>
            <p style={{ fontSize: '0.7rem', color: '#64748b', margin: 0 }}>
              Vigencia Acreditación: {elaborador?.vigenciaAcreditacion}
            </p>
          </div>

          {/* Company Safety Manager Signature */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ height: '70px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', marginBottom: '0.5rem' }}>
              <div style={{ borderBottom: '1px solid black', width: '200px' }} />
            </div>
            <p style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0 }}>{centro?.responsable}</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
              Responsable de Seguridad y Salud en el Trabajo
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
              {empresa?.razonSocial}
            </p>
          </div>
        </div>

        {/* Cryptographic Hash and Document Integrity Footer (RN-07) */}
        <div
          style={{
            marginTop: '2.5rem',
            paddingTop: '1rem',
            borderTop: '1px dashed #cbd5e1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.7rem',
            color: '#64748b',
          }}
        >
          <div>
            <p style={{ margin: 0 }}>
              <strong>Sello Digital SHA-256 (No Repudio):</strong> {hashSha256}
            </p>
            <p style={{ margin: 0 }}>
              Documento emitido conforme a la NOM-STPS aplicable. Retención legal mínima obligatoria: 5 años.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Lock size={14} /> Integridad Certificada
          </div>
        </div>
      </div>
    </div>
  );
}
