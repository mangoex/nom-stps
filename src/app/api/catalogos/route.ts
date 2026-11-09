import { NextResponse } from 'next/server';
import { store } from '@/lib/store';

export async function GET() {
  try {
    const tipos = store.getTiposEstudio();
    return NextResponse.json(tipos);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.claveNOM || !body.nombre) {
      return NextResponse.json({ error: 'Clave de la NOM y nombre son obligatorios' }, { status: 400 });
    }

    const nuevoTipo = store.guardarTipoEstudio(body);
    return NextResponse.json(nuevoTipo, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 422 });
  }
}
