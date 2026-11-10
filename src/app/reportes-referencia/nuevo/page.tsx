'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
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
      const form = new FormData();
      form.set('empresaId', '1');
      form.set('centroTrabajoId', String(centroTrabajoId));
      form.set('tipoEstudioId', String(tipoEstudioId));
      form.set('fecha', fecha);
      form.set('archivo', archivo);
      const respuesta = await fetch('/api/reportes-referencia', { method: 'POST', body: form });
      const data = await respuesta.json();
      if (!respuesta.ok) throw new Error(data.error || 'No se pudo subir el archivo');
      router.push(`/reportes-referencia/${data.id}`);
    } catch (err: any) {
      setError(err.message);
      setEnviando(false);
    }
  };

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <Navbar titulo="Subir reporte anterior" subtitulo="NOM-033-STPS-2015 · el texto se lee en el servidor, sin modelo de lenguaje" />
        <main className="page-body">
          <Link href="/reportes-referencia" className="btn btn-secondary" style={{ marginBottom: '1rem' }}>
            <ArrowLeft size={16} /> Volver
          </Link>
          <form className="card" onSubmit={enviar}>
            <p style={{ marginTop: 0 }}>
              Para probar en local, descarga el{' '}
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
              {enviando ? 'Leyendo archivo…' : 'Subir y extraer'}
            </button>
          </form>
        </main>
      </div>
    </div>
  );
}
