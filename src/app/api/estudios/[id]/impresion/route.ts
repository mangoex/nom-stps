import { NextResponse } from 'next/server';
import { store } from '@/lib/store';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id, 10);
    const body = await request.json();
    const usuarioId = body.usuarioId || 2;
    const contenidoHtml = body.contenidoHtml || `REPORT_CONTENT_${id}_${Date.now()}`;

    const impresion = store.registrarImpresion(id, usuarioId, contenidoHtml);
    return NextResponse.json(impresion, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id, 10);
    const impresiones = store.getImpresionesByEstudio(id);
    return NextResponse.json(impresiones);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
