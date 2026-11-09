import { NextResponse } from 'next/server';
import { store } from '@/lib/store';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const empresaIdParam = searchParams.get('empresaId');
    const empresaId = empresaIdParam ? parseInt(empresaIdParam, 10) : null;

    const stats = store.getEstadisticas(empresaId);
    return NextResponse.json(stats);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
