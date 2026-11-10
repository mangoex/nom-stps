'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { parsearNom033 } from '@/lib/nom033-parser';
import { extraerPaginasPdfEnCliente, sha256Hex, textoDePaginas, validarPdfCliente } from '@/lib/pdf-cliente';
import { interpretarRespuesta } from '@/lib/respuesta-http';
import { CentroTrabajo, TipoEstudio } from '@/lib/types';
import { ArrowLeft } from 'lucide-react';

export default function NuevoReporteReferenciaPage() {
  const router = useRouter();
  const [centros, setCentros] = useState<CentroTrabajo[]>([]);
  const [tipos, setTipos] = useState<TipoEstudio[]>([]);
  const [centroTrabajoId, setCentroTrabajoId] = useState<number | ''>('');
  const [tipoEstudioId, setTipoEstudioId] = useState<number | ''>('');
  const [fecha, setFecha] = useState('2025-03-15');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    async function cargar() {
      const [resCentros, resTipos] = await Promise.all([fetch('/api/centros?empresaId=1'), fetch('/api/catalogos')]);
      const dataCentros: CentroTrabajo[] = await resCentros.json();
      const dataTipos: TipoEstudio[] = await resTipos.json();
      setCentros(dataCentros);
      setTipos(dataTipos);
      if (dataCentros[0]) setCentroTrabajoId(dataCentros[0].id);
      const nom033 = dataTipos.find((tipo) => tipo.claveNOM === 'NOM-033-STPS-2015');
      setTipoEstudioId((nom033 || dataTipos[0])?.id ?? '');
    }
    cargar();
  }, []);

  const enviar = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!archivo) {
      setError('Selecciona el PDF o el TXT del reporte.');
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      const buffer = await archivo.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const esPdf = archivo.name.toLowerCase().endsWith('.pdf');
      if (esPdf) {
        const motivo = validarPdfCliente(bytes, archivo.size);
        if (motivo) throw new Error(motivo);
      } else if (archivo.size > 50 * 1024 * 1024) {
        throw new Error('El archivo supera el máximo de 50 MB.');
      }
      const paginas = esPdf ? await extraerPaginasPdfEnCliente(buffer) : [];
      const texto = esPdf ? textoDePaginas(paginas) : new TextDecoder().decode(buffer).replace(/^\uFEFF/, '');
      const parseo = esPdf ? parsearNom033(paginas) : { espacios: [], advertencias: ['El TXT no trae columnas; sube el PDF del anexo.'] };
      const hashSha256 = await sha256Hex(buffer);
      const respuesta = await fetch('/api/reportes-referencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empresaId: 1,
          centroTrabajoId: Number(centroTrabajoId),
          tipoEstudioId: Number(tipoEstudioId),
          fecha,
          nombreArchivo: archivo.name,
          tamanoBytes: archivo.size,
          hashSha256,
          texto,
          espacios: parseo.espacios,
          advertencias: parseo.advertencias,
        }),
      });
      const crudo = await respuesta.text();
      const interpretada = interpretarRespuesta(respuesta.status, crudo);
      if (!interpretada.ok) throw new Error(interpretada.mensaje);
      const data = interpretada.datos as { id: number };
      router.push(`/reportes-referencia/${data.id}`);
    } catch (err: any) {
      setError(err.message || 'No se pudo leer el reporte.');
      setEnviando(false);
    }
  };

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <Navbar titulo="Subir reporte anterior" subtitulo="NOM-033-STPS-2015 · el texto del PDF se lee en este navegador" />
        <main className="page-body">
          <Link href="/reportes-referencia" className="btn btn-secondary" style={{ marginBottom: '1rem' }}>
            <ArrowLeft size={16} /> Volver
          </Link>
          <form className="card" onSubmit={enviar}>
            <p style={{ marginTop: 0 }}>
              El PDF se abre en este navegador. Al servidor solo se envían el texto y los datos del archivo
              (nombre, tamaño y SHA-256), para no rebasar el límite de la petición. Para probar en local, descarga el{' '}
              <a href="/fixtures/nom033-anexo-sintetico.pdf" download>
                PDF sintético
              </a>
              . Trae filas partidas y datos inventados. No subas expedientes reales a este repositorio.
            </p>
            {error && (
              <p role="alert" style={{ color: 'var(--danger)' }}>
                {error}
              </p>
            )}
            <div className="form-group">
              <label className="form-label" htmlFor="centro">
                Centro de trabajo
              </label>
              <select
                id="centro"
                className="form-control"
                value={centroTrabajoId}
                onChange={(event) => setCentroTrabajoId(Number(event.target.value))}
              >
                {centros.map((centro) => (
                  <option key={centro.id} value={centro.id}>
                    {centro.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="norma">
                Norma
              </label>
              <select
                id="norma"
                className="form-control"
                value={tipoEstudioId}
                onChange={(event) => setTipoEstudioId(Number(event.target.value))}
              >
                {tipos.map((tipo) => (
                  <option key={tipo.id} value={tipo.id}>
                    {tipo.claveNOM} — {tipo.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="fecha">
                Fecha del reporte
              </label>
              <input id="fecha" className="form-control" type="date" value={fecha} onChange={(event) => setFecha(event.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="archivo">
                Archivo PDF o TXT
              </label>
              <input
                id="archivo"
                className="form-control"
                type="file"
                accept=".pdf,.txt,application/pdf,text/plain"
                onChange={(event) => setArchivo(event.target.files?.[0] ?? null)}
                required
              />
            </div>
            <button className="btn btn-primary" type="submit" disabled={enviando}>
              {enviando ? 'Leyendo el PDF en el navegador…' : 'Subir y extraer'}
            </button>
          </form>
        </main>
      </div>
    </div>
  );
}
