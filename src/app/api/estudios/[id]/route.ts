import { NextResponse } from 'next/server';
import { store } from '@/lib/store';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id, 10);
    const { searchParams } = new URL(request.url);
    const empresaIdParam = searchParams.get('empresaId');
    const empresaId = empresaIdParam ? parseInt(empresaIdParam, 10) : null;

    const estudio = store.getEstudioById(id, empresaId);
    if (!estudio) {
      return NextResponse.json({ error: 'Estudio no encontrado o acceso restringido por tenant' }, { status: 404 });
    }

    return NextResponse.json(estudio);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id, 10);
    const { searchParams } = new URL(request.url);
    const empresaIdParam = searchParams.get('empresaId');
    const empresaId = empresaIdParam ? parseInt(empresaIdParam, 10) : null;

    store.eliminarEstudio(id, empresaId);
    return NextResponse.json({ success: true, message: 'Estudio eliminado correctamente' });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message, codigo: error.codigo || 'DELETE_ERROR' },
      { status: 400 }
    );
  }
}
