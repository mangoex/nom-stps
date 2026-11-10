'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { ReporteReferencia } from '@/lib/types';
import { Upload } from 'lucide-react';

export default function ReportesReferenciaPage() {
  const [reportes, setReportes] = useState<ReporteReferencia[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function cargar() {
      try {
        const respuesta = await fetch('/api/reportes-referencia?empresaId=1');
        if (!respuesta.ok) throw new Error('No se pudieron listar los reportes');
        setReportes(await respuesta.json());
      } catch (err: any) {
        setError(err.message);
      }
    }
    cargar();
  }, []);

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <Navbar
          titulo="Reportes de referencia"
          subtitulo="Archivos anteriores para comparar. Solo los confirmados entran a la comparación."
        />
        <main className="page-body">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              El archivo se guarda en el almacén local de desarrollo. Nadie eligió todavía Blob, S3 o R2.
            </p>
            <Link href="/reportes-referencia/nuevo" className="btn btn-primary">
              <Upload size={16} /> Subir reporte
            </Link>
          </div>

          {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}

          <div className="card">
            <div className="table-responsive">
              <table className="data-table">
                <caption>Reportes de referencia de la empresa activa</caption>
                <thead>
                  <tr>
                    <th scope="col">Fecha</th>
                    <th scope="col">Archivo</th>
                    <th scope="col">Estado</th>
                    <th scope="col">Espacios</th>
                    <th scope="col">Huella</th>
                  </tr>
                </thead>
                <tbody>
                  {reportes.length === 0 && (
                    <tr>
                      <td colSpan={5}>Todavía no hay reportes cargados.</td>
                    </tr>
                  )}
                  {reportes.map((reporte) => (
                    <tr key={reporte.id}>
                      <td>
                        <Link href={`/reportes-referencia/${reporte.id}`}>{reporte.fecha}</Link>
                      </td>
                      <td>{reporte.archivo.nombre}</td>
                      <td>{reporte.estadoExtraccion}</td>
                      <td>{reporte.espacios.length}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                        {reporte.archivo.hashSha256.slice(0, 12)}…
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
