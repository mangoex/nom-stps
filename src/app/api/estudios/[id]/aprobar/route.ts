import { NextResponse } from 'next/server';
import { store } from '@/lib/store';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id, 10);
    const body = await request.json().catch(() => ({}));
    const usuarioRevisorId = body.usuarioRevisorId || 2; // Default revisor

    const estudioAprobado = store.aprobarEstudio(id, usuarioRevisorId, body.observaciones);
    return NextResponse.json(estudioAprobado);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message, codigo: error.codigo || 'APPROVAL_ERROR' },
      { status: 400 }
    );
  }
}
