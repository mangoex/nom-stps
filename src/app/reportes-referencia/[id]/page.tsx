'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import {
  EntradaEspacioNom033,
  etiquetaCumple,
  etiquetaTipo,
  evaluarEspacioNom033,
  textoCriterioCumplimiento,
} from '@/lib/nom033-limites';
import { EspacioNom033, Estudio, ReporteReferencia, TipoEspacioConfinado } from '@/lib/types';
import { ArrowLeft } from 'lucide-react';

function aEntrada(espacio: EspacioNom033): EntradaEspacioNom033 {
  return {
    clave: espacio.clave,
    nombre: espacio.nombre,
    area: espacio.area,
    lel: espacio.lel,
    o2: espacio.o2,
    h2s: espacio.h2s,
    co: espacio.co,
    fecha: espacio.fecha,
    tipoDeclarado: espacio.tipoDeclarado,
  };
}

export default function RevisarReportePage() {
  const params = useParams();
  const id = params.id as string;
  const [reporte, setReporte] = useState<ReporteReferencia | null>(null);
  const [filas, setFilas] = useState<EntradaEspacioNom033[]>([]);
  const [estudios, setEstudios] = useState<Estudio[]>([]);
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    async function cargar() {
      const respuesta = await fetch(`/api/reportes-referencia/${id}`);
      if (!respuesta.ok) {
        setError('Reporte no encontrado');
        return;
      }
      const data: ReporteReferencia = await respuesta.json();
      setReporte(data);
      setFilas(data.espacios.map(aEntrada));
      const estudiosRes = await fetch(`/api/estudios?empresaId=${data.empresaId}`);
      const lista: Estudio[] = await estudiosRes.json();
      setEstudios(lista.filter((estudio) => estudio.tipoEstudioId === data.tipoEstudioId && estudio.centroTrabajoId === data.centroTrabajoId));
    }
    cargar();
  }, [id]);

  const evaluadas = useMemo(() => filas.map((fila) => evaluarEspacioNom033(fila)), [filas]);

  const actualizar = (indice: number, parcial: Partial<EntradaEspacioNom033>) => {
    setFilas((actuales) => actuales.map((fila, i) => (i === indice ? { ...fila, ...parcial } : fila)));
  };

  const numero = (indice: number, campo: 'lel' | 'o2' | 'h2s' | 'co', valor: string) => {
    const parsed = Number(valor.trim().replace(',', '.'));
    actualizar(indice, { [campo]: valor.trim() === '' || !Number.isFinite(parsed) ? null : parsed });
  };

  const confirmar = async (accion: 'CONFIRMAR' | 'RECHAZAR') => {
    setGuardando(true);
    setError(null);
    try {
      const respuesta = await fetch(`/api/reportes-referencia/${id}/confirmar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion, espacios: filas, motivo }),
      });
      const data = await respuesta.json();
      if (!respuesta.ok) throw new Error(data.error || 'No se pudo guardar la revisión');
      setReporte(data);
      setAviso(accion === 'CONFIRMAR' ? 'Reporte confirmado. Ya se puede comparar.' : 'Reporte rechazado. No entra a la comparación.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  if (!reporte) {
    return (
      <div className="app-container">
        <Sidebar />
        <div className="main-content">
          <main className="page-body">{error || 'Cargando extracción…'}</main>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <Navbar titulo={`Revisar ${reporte.archivo.nombre}`} subtitulo={`Estado ${reporte.estadoExtraccion} · ${reporte.fecha}`} />
        <main className="page-body">
          <Link href="/reportes-referencia" className="btn btn-secondary" style={{ marginBottom: '1rem' }}>
            <ArrowLeft size={16} /> Volver al listado
          </Link>
          <p>{textoCriterioCumplimiento()}</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            SHA-256 {reporte.archivo.hashSha256} · {reporte.archivo.tamanoBytes} bytes. La confirmación humana es obligatoria.
          </p>
          {reporte.advertencias.length > 0 && (
            <ul>
              {reporte.advertencias.map((advertencia) => (
                <li key={advertencia}>{advertencia}</li>
              ))}
            </ul>
          )}
          {error && (
            <p role="alert" style={{ color: 'var(--danger)' }}>
              {error}
            </p>
          )}
          {aviso && <p role="status">{aviso}</p>}

          <div className="card table-responsive">
            <table className="data-table">
              <caption>Valores extraídos. Edítalos antes de confirmar.</caption>
              <thead>
                <tr>
                  <th scope="col">Clave</th>
                  <th scope="col">Nombre</th>
                  <th scope="col">Área</th>
                  <th scope="col">LEL %</th>
                  <th scope="col">O2 %</th>
                  <th scope="col">H2S ppm</th>
                  <th scope="col">CO ppm</th>
                  <th scope="col">Fecha</th>
                  <th scope="col">Tipo del reporte</th>
                  <th scope="col">Tipo de la medición</th>
                  <th scope="col">Cumple</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((fila, indice) => {
                  const evaluada = evaluadas[indice];
                  return (
                    <tr key={`${fila.clave}-${indice}`}>
                      <td>
                        <input className="form-control" aria-label={`Clave ${indice + 1}`} value={fila.clave} onChange={(event) => actualizar(indice, { clave: event.target.value })} />
                      </td>
                      <td>
                        <input className="form-control" aria-label={`Nombre ${fila.clave}`} value={fila.nombre} onChange={(event) => actualizar(indice, { nombre: event.target.value })} />
                      </td>
                      <td>
                        <input className="form-control" aria-label={`Área ${fila.clave}`} value={fila.area} onChange={(event) => actualizar(indice, { area: event.target.value })} />
                      </td>
                      {(['lel', 'o2', 'h2s', 'co'] as const).map((campo) => (
                        <td key={campo}>
                          <input
                            className="form-control"
                            aria-label={`${campo} ${fila.clave}`}
                            value={fila[campo] ?? ''}
                            onChange={(event) => numero(indice, campo, event.target.value)}
                          />
                        </td>
                      ))}
                      <td>
                        <input className="form-control" aria-label={`Fecha ${fila.clave}`} value={fila.fecha} onChange={(event) => actualizar(indice, { fecha: event.target.value })} />
                      </td>
                      <td>
                        <select
                          className="form-control"
                          aria-label={`Tipo del reporte ${fila.clave}`}
                          value={fila.tipoDeclarado ?? ''}
                          onChange={(event) =>
                            actualizar(indice, {
                              tipoDeclarado: (event.target.value || null) as TipoEspacioConfinado | null,
                            })
                          }
                        >
                          <option value="">Sin dato</option>
                          <option value="I">Tipo I</option>
                          <option value="II">Tipo II</option>
                        </select>
                      </td>
                      <td>{etiquetaTipo(evaluada.tipoCalculado)}</td>
                      <td>{etiquetaCumple(evaluada.cumple)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap' }}>
            <button className="btn btn-success" type="button" disabled={guardando} onClick={() => confirmar('CONFIRMAR')}>
              Marcar CONFIRMADO
            </button>
            <input
              className="form-control"
              style={{ maxWidth: '360px' }}
              aria-label="Motivo de rechazo"
              placeholder="Motivo si vas a rechazarlo"
              value={motivo}
              onChange={(event) => setMotivo(event.target.value)}
            />
            <button className="btn btn-danger" type="button" disabled={guardando} onClick={() => confirmar('RECHAZAR')}>
              Rechazar
            </button>
          </div>

          {reporte.estadoExtraccion === 'CONFIRMADO' && (
            <div className="card" style={{ marginTop: '1rem' }}>
              <h3 style={{ marginTop: 0 }}>Comparar contra un estudio de este centro</h3>
              {estudios.length === 0 && <p>No hay un estudio NOM-033 de este centro.</p>}
              <ul>
                {estudios.map((estudio) => (
                  <li key={estudio.id}>
                    <Link href={`/estudios/${estudio.id}/comparar?reporteId=${reporte.id}&empresaId=${reporte.empresaId}`}>
                      {estudio.folio} ({estudio.fechaRealizacion})
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
