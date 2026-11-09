import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sistema de Gestión de Estudios NOM-STPS',
  description: 'Sistema web multiempresa para la administración y dictaminación de estudios de Normas Oficiales Mexicanas de la STPS.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
