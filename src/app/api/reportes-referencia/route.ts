import { NextResponse } from 'next/server';
import { resolverUsuarioId, subirReporteReferencia } from '@/lib/reportes-referencia';
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
    const body = await request.json();
    if (typeof body.texto !== 'string') {
      return NextResponse.json({ error: 'Falta el texto extraído del reporte.', codigo: 'REF-TEXTO' }, { status: 422 });
    }
    const reporte = await subirReporteReferencia({
      empresaId: Number(body.empresaId || 1),
      centroTrabajoId: Number(body.centroTrabajoId),
      tipoEstudioId: Number(body.tipoEstudioId),
      fecha: String(body.fecha || ''),
      nombreArchivo: String(body.nombreArchivo || ''),
      tamanoBytes: Number(body.tamanoBytes),
      hashSha256: String(body.hashSha256 || ''),
      texto: body.texto,
      espacios: Array.isArray(body.espacios) ? body.espacios : [],
      advertencias: Array.isArray(body.advertencias) ? body.advertencias.map(String) : [],
      usuarioId: resolverUsuarioId(request, body.usuarioId),
    });

    return NextResponse.json(reporte, { status: 201 });
  } catch (error: any) {
    const mensaje = error instanceof SyntaxError ? 'El cuerpo debe ser JSON con el texto extraído, no el PDF.' : error.message;
    return NextResponse.json(
      { error: mensaje, codigo: error.codigo || 'VALIDATION_ERROR' },
      { status: 422 }
    );
  }
}
