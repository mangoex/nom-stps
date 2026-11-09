import { NextResponse } from 'next/server';
import { store } from '@/lib/store';

export async function GET() {
  try {
    const elaboradores = store.getElaboradores();
    return NextResponse.json(elaboradores);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.nombre || !body.numAcreditacion || !body.vigenciaAcreditacion) {
      return NextResponse.json(
        { error: 'Nombre, número de acreditación y vigencia son obligatorios' },
        { status: 400 }
      );
    }

    const nuevo = store.guardarElaborador(body);
    return NextResponse.json(nuevo, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 422 });
  }
}
