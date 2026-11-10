import { NextResponse } from 'next/server';
import { store } from '@/lib/store';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const reporte = store.obtenerReporteReferencia(parseInt(params.id, 10));
    if (!reporte) {
      return NextResponse.json({ error: 'Reporte de referencia no encontrado.', codigo: 'REF-NO-ENCONTRADO' }, { status: 404 });
    }
    return NextResponse.json(reporte);
  } catch (error: any) {
    return NextResponse.json({ error: error.message, codigo: error.codigo || 'ERROR' }, { status: 500 });
  }
}
