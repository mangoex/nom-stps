import { NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { validarRN03Logotipo } from '@/lib/rules';

export async function GET() {
  try {
    const empresas = store.getEmpresas();
    return NextResponse.json(empresas);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.razonSocial || !body.rfc) {
      return NextResponse.json({ error: 'Razón Social y RFC son obligatorios' }, { status: 400 });
    }

    if (body.logotipoTamano && body.tipoLogotipo) {
      validarRN03Logotipo({
        tamanoBytes: body.logotipoTamano,
        tipoMime: body.tipoLogotipo,
      });
    }

    const nuevaEmpresa = store.guardarEmpresa(body);
    return NextResponse.json(nuevaEmpresa, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message, codigo: error.codigo }, { status: 422 });
  }
}
