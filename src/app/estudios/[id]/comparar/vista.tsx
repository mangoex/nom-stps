'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { FilaComparacion, ResultadoComparacion, SituacionComparacion } from '@/lib/nom033-comparacion';
import { etiquetaCumple, etiquetaTipo, textoCriterioCumplimiento } from '@/lib/nom033-limites';
import { ReporteReferencia } from '@/lib/types';
import { ArrowLeft, Printer } from 'lucide-react';

interface RespuestaComparacion {
  estudio: { id: number; folio: string; fechaRealizacion: string };
  reporte: ReporteReferencia;
  comparacion: ResultadoComparacion;
}

const SITUACION: Record<SituacionComparacion, string> = {
  SIN_CAMBIO: 'Sin cambio',
  MODIFICADO: 'Modificado',
  NUEVO: 'Nuevo',
  ELIMINADO: 'Eliminado',
};

function celdaNumero(valor: number | null): string {
  return valor == null ? '—' : String(valor);
}

function celdaDelta(valor: number | null): string {
  if (valor == null) return '—';
  return valor > 0 ? `+${valor}` : String(valor);
}

function FilaVista({ fila }: { fila: FilaComparacion }) {
  const delta = (parametro: FilaComparacion['deltas'][number]['parametro']) =>
    fila.deltas.find((item) => item.parametro === parametro);

  return (
    <tr>
      <th scope="row">{fila.clave}</th>
      <td>{SITUACION[fila.situacion]}</td>
      <td>{fila.nuevo?.nombre || fila.anterior?.nombre}</td>
      <td>{celdaNumero(delta('lel')?.anterior ?? null)}</td>
      <td>{celdaNumero(delta('lel')?.nuevo ?? null)}</td>
      <td>{celdaDelta(delta('lel')?.delta ?? null)}</td>
      <td>{celdaNumero(delta('o2')?.anterior ?? null)}</td>
      <td>{celdaNumero(delta('o2')?.nuevo ?? null)}</td>
      <td>{celdaDelta(delta('o2')?.delta ?? null)}</td>
      <td>{celdaNumero(delta('h2s')?.anterior ?? null)}</td>
      <td>{celdaNumero(delta('h2s')?.nuevo ?? null)}</td>
      <td>{celdaDelta(delta('h2s')?.delta ?? null)}</td>
      <td>{celdaNumero(delta('co')?.anterior ?? null)}</td>
      <td>{celdaNumero(delta('co')?.nuevo ?? null)}</td>
      <td>{celdaDelta(delta('co')?.delta ?? null)}</td>
      <td>
        {etiquetaTipo(fila.anterior?.tipoDeclarado ?? null)} → {etiquetaTipo(fila.nuevo?.tipoDeclarado ?? null)}
        {fila.cambioTipoDeclarado ? ' (cambió)' : ''}
      </td>
      <td>
        {etiquetaTipo(fila.anterior?.tipoCalculado ?? null)} → {etiquetaTipo(fila.nuevo?.tipoCalculado ?? null)}
        {fila.cambioTipoCalculado ? ' (cambió)' : ''}
      </td>
      <td>
        {etiquetaCumple(fila.anterior?.cumple ?? null)} → {etiquetaCumple(fila.nuevo?.cumple ?? null)}
        {fila.cambioCumplimiento ? ' (cambió)' : ''}
      </td>
    </tr>
  );
}

export default function CompararEstudioPage() {
  const params = useParams();
  const search = useSearchParams();
  const id = params.id as string;
  const [datos, setDatos] = useState<RespuestaComparacion | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function cargar() {
      const consulta = new URLSearchParams({ empresaId: search.get('empresaId') || '1' });
      const reporteId = search.get('reporteId');
      if (reporteId) consulta.set('reporteId', reporteId);
      const respuesta = await fetch(`/api/estudios/${id}/comparar?${consulta.toString()}`);
      const body = await respuesta.json();
      if (!respuesta.ok) {
        setError(body.error || 'No se pudo comparar');
        return;
      }
      setDatos(body);
    }
    cargar();
  }, [id, search]);

  const resumen = datos?.comparacion.resumen;

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <Navbar titulo="Comparativo de referencia" subtitulo="No forma parte del dictamen oficial" />
        <main className="page-body comparacion-pagina">
          <style>{`@media print { @page { size: landscape; margin: 12mm; } }`}</style>
          <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '1rem' }}>
            <Link href={`/estudios/${id}`} className="btn btn-secondary">
              <ArrowLeft size={16} /> Volver al expediente
            </Link>
            <button type="button" className="btn btn-primary" onClick={() => window.print()}>
              <Printer size={16} /> Imprimir comparativo
            </button>
          </div>

          {error && (
            <div className="card" role="alert">
              <p>{error}</p>
              <Link href="/reportes-referencia/nuevo">Subir y confirmar un reporte de referencia</Link>
            </div>
          )}

          {datos && resumen && (
            <>
              <header className="card">
                <h2 style={{ marginTop: 0 }}>
                  {datos.estudio.folio} contra {datos.reporte.archivo.nombre}
                </h2>
                <p>
                  Estudio del {datos.estudio.fechaRealizacion}. Reporte de referencia del {datos.reporte.fecha}, estado{' '}
                  {datos.reporte.estadoExtraccion}. Esta vista no se incluye en el dictamen oficial.
                </p>
                <p>{textoCriterioCumplimiento(datos.comparacion.limites)}</p>
                <div className="grid-4">
                  <p>Sin cambio: {resumen.sinCambio}</p>
                  <p>Modificados: {resumen.modificados}</p>
                  <p>Nuevos: {resumen.nuevos}</p>
                  <p>Eliminados: {resumen.eliminados}</p>
                  <p>Cambios de tipo: {resumen.cambiosTipo}</p>
                  <p>Cambios de cumplimiento: {resumen.cambiosCumplimiento}</p>
                </div>
              </header>
              <div className="card table-responsive comparacion-scroll">
                <table className="data-table comparacion-table">
                  <caption>Comparación por clave de espacio confinado</caption>
                  <colgroup>
                    <col className="col-clave" />
                    <col className="col-situacion" />
                    <col className="col-nombre" />
                    <col span={12} className="col-numero" />
                    <col span={3} className="col-texto" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th scope="col">Clave</th>
                      <th scope="col">Situación</th>
                      <th scope="col">Nombre</th>
                      <th scope="col">LEL anterior</th>
                      <th scope="col">LEL nuevo</th>
                      <th scope="col">Δ LEL</th>
                      <th scope="col">O2 anterior</th>
                      <th scope="col">O2 nuevo</th>
                      <th scope="col">Δ O2</th>
                      <th scope="col">H2S anterior</th>
                      <th scope="col">H2S nuevo</th>
                      <th scope="col">Δ H2S</th>
                      <th scope="col">CO anterior</th>
                      <th scope="col">CO nuevo</th>
                      <th scope="col">Δ CO</th>
                      <th scope="col">Tipo del reporte</th>
                      <th scope="col">Tipo de la medición</th>
                      <th scope="col">Cumplimiento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {datos.comparacion.filas.map((fila) => (
                      <FilaVista key={fila.clave} fila={fila} />
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
