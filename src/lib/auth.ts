import { User, UserRole } from './types';
import { store } from './store';

export interface AuthSession {
  user: User;
  token: string;
}

export function getCurrentUser(requestOrHeader?: any): User {
  // En modo cliente o demostración, retorna usuario con rol REVISOR de la Empresa 1 por defecto
  // o busca en localStorage si estamos en el navegador
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('nom_session_user');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        // fallback
      }
    }
  }

  // Usuario de respaldo predeterminado: Revisor de la Empresa 1
  const defaultUser = store.getUsuarios(1).find((u) => u.rol === 'REVISOR');
  return defaultUser || {
    id: 2,
    empresaId: 1,
    nombre: 'Ing. Carlos Mendoza (Revisor)',
    correo: 'revisor@manufacturasnorte.mx',
    rol: 'REVISOR',
    activo: true,
  };
}

export function canAccessRole(userRole: UserRole, allowedRoles: UserRole[]): boolean {
  if (userRole === 'ADMIN') return true;
  return allowedRoles.includes(userRole);
}
