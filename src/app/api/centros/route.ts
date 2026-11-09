import { NextResponse } from 'next/server';
import { store } from '@/lib/store';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const empresaIdParam = searchParams.get('empresaId');
    const empresaId = empresaIdParam ? parseInt(empresaIdParam, 10) : null;

    const centros = store.getCentros(empresaId);
    return NextResponse.json(centros);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.nombre || !body.empresaId || !body.responsable) {
      return NextResponse.json({ error: 'Nombre, empresa y responsable son obligatorios' }, { status: 400 });
    }

    const nuevoCentro = store.guardarCentro(body);
    return NextResponse.json(nuevoCentro, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 422 });
  }
}
