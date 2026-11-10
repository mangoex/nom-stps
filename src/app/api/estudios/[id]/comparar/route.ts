import { NextResponse } from 'next/server';
import { compararEstudioConReferencia } from '@/lib/reportes-referencia';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { searchParams } = new URL(request.url);
    const empresaIdParam = searchParams.get('empresaId');
    const reporteIdParam = searchParams.get('reporteId');
    const resultado = compararEstudioConReferencia(
      parseInt(params.id, 10),
      reporteIdParam ? parseInt(reporteIdParam, 10) : undefined,
      empresaIdParam ? parseInt(empresaIdParam, 10) : null
    );
    return NextResponse.json(resultado);
  } catch (error: any) {
    const status = error.codigo === 'REF-ESTUDIO' ? 404 : 422;
    return NextResponse.json({ error: error.message, codigo: error.codigo || 'VALIDATION_ERROR' }, { status });
  }
}
