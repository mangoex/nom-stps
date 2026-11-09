'use client';

import React, { useState } from 'react';
import { CampoEstudio } from '@/lib/types';
import { Plus, Trash2, HelpCircle } from 'lucide-react';

interface DynamicFormProps {
  campos: CampoEstudio[];
  valores: Record<string, any>;
  onChange: (nuevosValores: Record<string, any>) => void;
  disabled?: boolean;
}

export function DynamicForm({ campos, valores, onChange, disabled = false }: DynamicFormProps) {
  const handleFieldChange = (nombreCampo: string, valor: any) => {
    onChange({
      ...valores,
      [nombreCampo]: valor,
    });
  };

  // Manejo de tablas dinámicas de muestreo
  const handleAddTableRow = (nombreCampo: string, columnas: string[]) => {
    const filasActuales = Array.isArray(valores[nombreCampo]) ? [...valores[nombreCampo]] : [];
    const nuevaFila: Record<string, string> = {};
    columnas.forEach((col) => {
      nuevaFila[col] = '';
    });
    filasActuales.push(nuevaFila);
    handleFieldChange(nombreCampo, filasActuales);
  };

  const handleUpdateTableCell = (nombreCampo: string, rowIndex: number, columna: string, valor: string) => {
    const filas = Array.isArray(valores[nombreCampo]) ? [...valores[nombreCampo]] : [];
    if (filas[rowIndex]) {
      filas[rowIndex] = { ...filas[rowIndex], [columna]: valor };
      handleFieldChange(nombreCampo, filas);
    }
  };

  const handleDeleteTableRow = (nombreCampo: string, rowIndex: number) => {
    const filas = Array.isArray(valores[nombreCampo]) ? [...valores[nombreCampo]] : [];
    filas.splice(rowIndex, 1);
    handleFieldChange(nombreCampo, filas);
  };

  const sortedCampos = [...campos].sort((a, b) => a.orden - b.orden);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {sortedCampos.map((campo) => {
        const valorActual = valores[campo.nombreCampo] ?? '';

        return (
          <div key={campo.id} className="form-group">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
              <label className="form-label" style={{ margin: 0 }}>
                {campo.etiqueta} {campo.obligatorio && <span style={{ color: 'var(--danger)' }}>*</span>}
              </label>
              {campo.ayudaNormativa && (
                <span
                  title={campo.ayudaNormativa}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: 'var(--text-muted)', cursor: 'help' }}
                >
                  <HelpCircle size={14} /> Norma
                </span>
              )}
            </div>

            {/* Input tipo Text */}
            {campo.tipoDato === 'text' && (
              <input
                type="text"
                className="form-control"
                value={valorActual}
                onChange={(e) => handleFieldChange(campo.nombreCampo, e.target.value)}
                placeholder={`Ingrese ${campo.etiqueta.toLowerCase()}...`}
                disabled={disabled}
                required={campo.obligatorio}
              />
            )}

            {/* Input tipo Number */}
            {campo.tipoDato === 'number' && (
              <input
                type="number"
                className="form-control"
                value={valorActual}
                onChange={(e) => handleFieldChange(campo.nombreCampo, e.target.value)}
                placeholder="0"
                disabled={disabled}
                required={campo.obligatorio}
              />
            )}

            {/* Input tipo Textarea */}
            {campo.tipoDato === 'textarea' && (
              <textarea
                className="form-control"
                rows={3}
                value={valorActual}
                onChange={(e) => handleFieldChange(campo.nombreCampo, e.target.value)}
                placeholder={`Detalles de ${campo.etiqueta.toLowerCase()}...`}
                disabled={disabled}
                required={campo.obligatorio}
              />
            )}

            {/* Input tipo Select */}
            {campo.tipoDato === 'select' && (
              <select
                className="form-control"
                value={valorActual}
                onChange={(e) => handleFieldChange(campo.nombreCampo, e.target.value)}
                disabled={disabled}
                required={campo.obligatorio}
              >
                <option value="">-- Seleccione una opción --</option>
                {campo.opciones?.map((opt, idx) => (
                  <option key={idx} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            )}

            {/* Input tipo Tabla Dinámica de Puntos de Medición */}
            {campo.tipoDato === 'table' && (
              <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                <div style={{ padding: '0.75rem', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                    Puntos y Registros de Muestreo Oficial
                  </span>
                  {!disabled && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                      onClick={() => handleAddTableRow(campo.nombreCampo, campo.columnasTabla || ['Punto', 'Valor'])}
                    >
                      <Plus size={14} /> Agregar Punto
                    </button>
                  )}
                </div>

                <div className="table-responsive">
                  <table className="data-table" style={{ margin: 0 }}>
                    <thead>
                      <tr>
                        {campo.columnasTabla?.map((col, idx) => (
                          <th key={idx}>{col}</th>
                        ))}
                        {!disabled && <th style={{ width: '40px' }}>Acción</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {Array.isArray(valorActual) && valorActual.length > 0 ? (
                        valorActual.map((fila: any, rIdx: number) => (
                          <tr key={rIdx}>
                            {campo.columnasTabla?.map((col, cIdx) => (
                              <td key={cIdx} style={{ padding: '0.4rem 0.5rem' }}>
                                <input
                                  type="text"
                                  className="form-control"
                                  style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
                                  value={fila[col] ?? ''}
                                  onChange={(e) => handleUpdateTableCell(campo.nombreCampo, rIdx, col, e.target.value)}
                                  disabled={disabled}
                                  placeholder={col}
                                />
                              </td>
                            ))}
                            {!disabled && (
                              <td style={{ textAlign: 'center' }}>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTableRow(campo.nombreCampo, rIdx)}
                                  style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}
                                  title="Eliminar fila"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={(campo.columnasTabla?.length || 1) + (disabled ? 0 : 1)}
                            style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1rem' }}
                          >
                            No hay puntos registrados aún. Presione &quot;Agregar Punto&quot; para capturar mediciones.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
