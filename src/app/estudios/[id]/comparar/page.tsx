import { Suspense } from 'react';
import CompararEstudioPage from './vista';

export default function PageComparar() {
  return (
    <Suspense fallback={<main className="page-body">Cargando comparativo…</main>}>
      <CompararEstudioPage />
    </Suspense>
  );
}
