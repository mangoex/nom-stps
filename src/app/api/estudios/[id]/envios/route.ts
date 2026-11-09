import { NextResponse } from 'next/server';
import { store } from '@/lib/store';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id, 10);
    const body = await request.json();
    const usuarioId = body.usuarioId || 2;

    if (!body.destinatarios || !Array.isArray(body.destinatarios) || body.destinatarios.length === 0) {
      return NextResponse.json({ error: 'Se requiere al menos un destinatario' }, { status: 400 });
    }

    const asunto = body.asunto || 'Dictamen de Estudio NOM-STPS';
    const mensaje = body.mensaje || 'Se adjunta el reporte oficial del estudio para su conocimiento y control.';

    const envio = store.solicitarEnvio(id, usuarioId, body.destinatarios, asunto, mensaje);
    return NextResponse.json(envio, { status: 202 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id, 10);
    const envios = store.getEnviosByEstudio(id);
    return NextResponse.json(envios);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
