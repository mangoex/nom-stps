import { NextResponse } from 'next/server';
import { store } from '@/lib/store';

export async function POST(request: Request) {
  try {
    const { correo } = await request.json();
    if (!correo) {
      return NextResponse.json({ error: 'Correo electrónico requerido' }, { status: 400 });
    }

    const usuarios = store.getUsuarios(null);
    const usuario = usuarios.find((u) => u.correo.toLowerCase() === correo.toLowerCase());

    if (!usuario) {
      return NextResponse.json({
        message: 'Si el correo está registrado en el sistema, recibirá las instrucciones de recuperación.',
      });
    }

    store.registrarBitacora({
      empresaId: usuario.empresaId,
      usuarioId: usuario.id,
      usuarioNombre: usuario.nombre,
      ip: '127.0.0.1',
      accion: 'SOLICITUD_RECUPERACION_CONTRASENA',
      entidad: 'USUARIO',
      entidadId: usuario.id,
    });

    return NextResponse.json({
      success: true,
      message: 'Se ha enviado un enlace seguro de restablecimiento de contraseña a su correo.',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
