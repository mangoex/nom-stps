import { NextResponse } from 'next/server';
import { subirReporteReferencia } from '@/lib/reportes-referencia';
import { store } from '@/lib/store';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const empresaIdParam = searchParams.get('empresaId');
    const centroParam = searchParams.get('centroTrabajoId');
    const tipoParam = searchParams.get('tipoEstudioId');
    const estado = searchParams.get('estadoExtraccion');

    const reportes = store.listarReportesReferencia({
      empresaId: empresaIdParam ? parseInt(empresaIdParam, 10) : null,
      centroTrabajoId: centroParam ? parseInt(centroParam, 10) : null,
      tipoEstudioId: tipoParam ? parseInt(tipoParam, 10) : null,
      estadoExtraccion:
        estado === 'PENDIENTE' || estado === 'EXTRAIDO' || estado === 'CONFIRMADO' || estado === 'RECHAZADO'
          ? estado
          : null,
    });

    return NextResponse.json(reportes);
  } catch (error: any) {
    return NextResponse.json({ error: error.message, codigo: error.codigo || 'ERROR' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const archivo = form.get('archivo');
    if (!(archivo instanceof File)) {
      return NextResponse.json({ error: 'Falta el archivo.', codigo: 'REF-ARCHIVO' }, { status: 422 });
    }

    const reporte = await subirReporteReferencia({
      empresaId: Number(form.get('empresaId') || 1),
      centroTrabajoId: Number(form.get('centroTrabajoId')),
      tipoEstudioId: Number(form.get('tipoEstudioId')),
      fecha: String(form.get('fecha') || ''),
      nombreArchivo: archivo.name,
      contenido: Buffer.from(await archivo.arrayBuffer()),
      usuarioId: Number(form.get('usuarioId') || 2),
    });

    return NextResponse.json(reporte, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message, codigo: error.codigo || 'VALIDATION_ERROR' },
      { status: 422 }
    );
  }
}
