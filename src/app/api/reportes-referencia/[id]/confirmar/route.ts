import { NextResponse } from 'next/server';
import { confirmarReporteReferencia, rechazarReporteReferencia, resolverUsuarioId } from '@/lib/reportes-referencia';
import { EntradaEspacioNom033 } from '@/lib/nom033-limites';

type AccionConfirmacion = 'CONFIRMAR' | 'RECHAZAR';

function esAccion(valor: unknown): valor is AccionConfirmacion {
  return valor === 'CONFIRMAR' || valor === 'RECHAZAR';
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const id = parseInt(params.id, 10);
    const usuarioId = resolverUsuarioId(request, body.usuarioId);
    const accion: unknown = body.accion;

    if (!esAccion(accion)) {
      return NextResponse.json({ error: 'La acción debe ser CONFIRMAR o RECHAZAR.', codigo: 'REF-ACCION' }, { status: 422 });
    }

    switch (accion) {
      case 'CONFIRMAR': {
        const espacios = Array.isArray(body.espacios) ? (body.espacios as EntradaEspacioNom033[]) : [];
        return NextResponse.json(confirmarReporteReferencia(id, espacios, usuarioId));
      }
      case 'RECHAZAR':
        return NextResponse.json(rechazarReporteReferencia(id, String(body.motivo || ''), usuarioId));
      default: {
        const desconocida: never = accion;
        return NextResponse.json(
          { error: `Acción no contemplada: ${String(desconocida)}`, codigo: 'REF-ACCION' },
          { status: 422 }
        );
      }
    }
  } catch (error: any) {
    const status = error.codigo === 'REF-NO-ENCONTRADO' ? 404 : 422;
    return NextResponse.json({ error: error.message, codigo: error.codigo || 'VALIDATION_ERROR' }, { status });
  }
}
