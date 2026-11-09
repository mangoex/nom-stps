import React from 'react';
import { EstadoEstudio } from '@/lib/types';
import { CheckCircle2, Clock, AlertTriangle, XCircle, FileEdit } from 'lucide-react';

interface StatusBadgeProps {
  estado: EstadoEstudio;
}

export function StatusBadge({ estado }: StatusBadgeProps) {
  switch (estado) {
    case 'APROBADO':
      return (
        <span className="badge badge-aprobado">
          <CheckCircle2 size={12} /> Aprobado
        </span>
      );
    case 'EN_REVISION':
      return (
        <span className="badge badge-en_revision">
          <Clock size={12} /> En Revisión
        </span>
      );
    case 'POR_VENCER':
      return (
        <span className="badge badge-por_vencer">
          <AlertTriangle size={12} /> Por Vencer (&lt;60d)
        </span>
      );
    case 'VENCIDO':
      return (
        <span className="badge badge-vencido">
          <XCircle size={12} /> Vencido
        </span>
      );
    case 'BORRADOR':
    default:
      return (
        <span className="badge badge-borrador">
          <FileEdit size={12} /> Borrador
        </span>
      );
  }
}
