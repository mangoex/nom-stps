import crypto from 'crypto';

/**
 * Calcula el hash SHA-256 de un texto o buffer para sello digital de no repudio (RN-07)
 */
export function calcularHashSha256(contenido: string | Buffer): string {
  const hash = crypto.createHash('sha256');
  hash.update(contenido);
  return hash.digest('hex');
}

/**
 * Genera un sello criptográfico formateado para incluir en reportes oficiales
 */
export function generarSelloDigital(folio: string, rfcEmpresa: string, fecha: string, datosString: string): string {
  const payload = `${folio}|${rfcEmpresa}|${fecha}|${datosString}|SECRET_SALT_NOM_STPS`;
  return calcularHashSha256(payload);
}
