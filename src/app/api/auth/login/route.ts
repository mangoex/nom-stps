import { NextResponse } from 'next/server';
import { store } from '@/lib/store';

export async function POST(request: Request) {
  try {
    const { correo, contrasena } = await request.json();
    if (!correo || !contrasena) {
      return NextResponse.json({ error: 'Correo y contraseña requeridos' }, { status: 400 });
    }

    const usuario = store.autenticar(correo, contrasena);
    if (!usuario) {
      return NextResponse.json({ error: 'Credenciales inválidas o usuario inactivo' }, { status: 401 });
    }

    store.registrarBitacora({
      empresaId: usuario.empresaId,
      usuarioId: usuario.id,
      usuarioNombre: usuario.nombre,
      ip: '127.0.0.1',
      accion: 'INICIO_SESION',
      entidad: 'USUARIO',
      entidadId: usuario.id,
    });

    return NextResponse.json({
      success: true,
      user: usuario,
      token: `jwt_token_sample_${usuario.id}_${Date.now()}`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
