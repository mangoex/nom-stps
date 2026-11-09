import { NextResponse } from 'next/server';
import { store } from '@/lib/store';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const empresaIdParam = searchParams.get('empresaId');
    const empresaId = empresaIdParam ? parseInt(empresaIdParam, 10) : null;

    const estudios = store.getEstudios(empresaId);
    return NextResponse.json(estudios);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const usuarioId = body.usuarioId || 2; // Por defecto usuario actual

    const nuevoEstudio = store.guardarEstudio(body, usuarioId);
    return NextResponse.json(nuevoEstudio, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message, codigo: error.codigo || 'VALIDATION_ERROR' },
      { status: 422 }
    );
  }
}
