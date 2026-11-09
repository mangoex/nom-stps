# Sistema de Gestión de Estudios NOM-STPS

Sistema web multiempresa institucional para la administración, dictaminación técnica, impresión oficial en PDF y seguimiento de los estudios y evaluaciones exigidos por las **Normas Oficiales Mexicanas de la Secretaría del Trabajo y Previsión Social (STPS)** en México.

---

## 🏛️ Alcance y Marco Regulatorio

El sistema cubre integralmente las obligaciones patronales contempladas en:
- **Constitución Política de los Estados Unidos Mexicanos:** Art. 123, Apartado A, Fracción XV.
- **Ley Federal del Trabajo (LFT):** Artículos 509 a 512-F.
- **Reglamento Federal de Seguridad y Salud en el Trabajo (RFSST).**
- **Ley de Infraestructura de la Calidad:** Acreditación de laboratorios y unidades de inspección ante la **EMA** (Entidad Mexicana de Acreditación) y aprobación de la **STPS**.

### Catálogo de Normas Incluido
- **NOM-011-STPS-2001:** Ruido y Nivel de Exposición a Ruido (NER).
- **NOM-025-STPS-2008:** Iluminación en centros de trabajo.
- **NOM-010-STPS-2014:** Agentes químicos y valores límite de exposición (VLE).
- **NOM-022-STPS-2015:** Electricidad estática y red de tierras / pararrayos.
- **NOM-035-STPS-2018:** Factores de riesgo psicosocial (Guías I, II y III).
- **NOM-036-1-STPS-2018:** Factores de riesgo ergonómico (Manejo manual de cargas).
- **NOM-002-STPS-2010:** Prevención y protección contra incendios.
- **NOM-017-STPS-2024:** Equipo de Protección Personal (en vigor sept-2025).
- **NOM-015-STPS-2001, NOM-024-STPS-2001, NOM-030-STPS-2009, NOM-019-STPS-2011**, etc.

El sistema **no codifica las normas en duro**: trata cada estudio como un tipo de estudio dinámico configurable con sus propios campos de captura (`CampoEstudio`) y reglas de periodicidad.

---

## 🚀 Arquitectura y Tecnologías

- **Frontend & Backend (Fullstack):** Next.js 14 (App Router) + React 18 + TypeScript.
- **Estilos & Diseño:** CSS Nativo con Design Tokens institucionales, responsivo, accesible (WCAG 2.1 AA) y estilizado para impresión formal (`@media print`).
- **Base de Datos & Multi-Tenancy:**
  - PostgreSQL con políticas **Row Level Security (RLS)** para segregación estricta entre empresas inquilinas (*tenants*).
  - Esquema híbrido Relacional + JSONB para campos dinámicos de cada NOM.
  - Almacén en memoria persistente / mock universal para ejecución inmediata out-of-the-box sin dependencias de infraestructura externa.
- **Seguridad & No Repudio:**
  - Sello digital criptográfico **SHA-256** estampado en cada dictamen oficial.
  - Marcas de agua diagonales automáticas en estados no aprobados (`BORRADOR - NO OFICIAL`).
  - Control de Acceso Basado en Roles (**RBAC**): `ADMIN`, `ELABORADOR`, `REVISOR`, `CONSULTA`.
  - Protección de **Retención Legal Obligatoria de 5 años** (impide eliminar estudios antes del plazo legal).
- **Pruebas Automatizadas:** Suite completa en Python con `pytest` validando las reglas de negocio RN-01 a RN-09.

---

## 📦 Módulos Funcionales (RF-01 a RF-09)

1. **Usuarios & RBAC (RF-01):** Autenticación, roles y recuperación de contraseñas.
2. **Empresas (RF-02):** Multi-tenant con razón social, RFC, representante y logotipo corporativo incrustado en reportes.
3. **Centros de Trabajo (RF-03):** Registro de plantas/sucursales con giro, número de trabajadores, responsable y áreas auditadas.
4. **Catálogo de Estudios (RF-04):** Motor parametrizable de normas con campos dinámicos, periodicidad y categorías.
5. **Padrón de Elaboradores (RF-05):** Registro de personas físicas, laboratorios y unidades de inspección con número de acreditación EMA/STPS, vigencia y firma digital.
6. **Expedientes de Estudios (RF-06):** Captura dinámica por norma, tablas de puntos de medición (dB, Lux, Ohms, etc.), evidencias y flujo de aprobación.
7. **Impresión Oficial en PDF (RF-07):** Generación de dictamen con logo, firmas, folio oficial y huella SHA-256.
8. **Envíos por Correo (RF-08):** Despacho asíncrono vía SMTP con reintentos automáticos y bitácora de entrega.
9. **Alertas & Tablero de Cumplimiento (RF-09):** Monitoreo preventivo a 60 días de vencimiento, cálculo de índice de cumplimiento y bitácora de auditoría legal inmutable.

---

## ⚙️ Reglas de Negocio Implementadas

- **RN-01:** Todo estudio debe pertenecer a un centro de trabajo, tipo de estudio y elaborador obligatoriamente.
- **RN-02:** Los usuarios solo tienen acceso a datos de su propia empresa (aislamiento por tenant).
- **RN-03:** Logotipo de empresa validado en formato y tamaño (máx. 2MB).
- **RN-04:** Cálculo automático de vigencia según periodicidad oficial de la norma (ej. 24 meses en ruido o escala VLE en químicos).
- **RN-05:** Solo estudios aprobados emiten versión oficial limpia; borradores llevan marca de agua.
- **RN-06:** Se bloquea la aprobación si la acreditación del elaborador está vencida a la fecha del estudio.
- **RN-07:** Todo reporte oficial calcula y almacena su hash SHA-256 para auditoría de integridad.
- **RN-08:** Política de reintentos con retroceso exponencial ante fallas SMTP.
- **RN-09:** Bloqueo estricto de eliminación física para estudios con menos de 5 años de antigüedad.

---

## 💻 Instalación y Ejecución Local

### Prerrequisitos
- Node.js v18+ (recomendado v20 o v24)
- npm v9+
- Python 3.10+ (opcional para ejecutar la suite de pruebas `pytest`)

### Pasos
```bash
# 1. Clonar el repositorio
git clone https://github.com/mangoex/nom-stps.git
cd nom-stps

# 2. Instalar dependencias
npm install

# 3. Iniciar el servidor de desarrollo
npm run dev

# 4. Abrir en el navegador
# http://localhost:3000
```

### Ejecución de Pruebas Unitarias de Reglas de Negocio (TDD)
```bash
py -m pytest tests/
```

---

## ☁️ Despliegue en Vercel

Este proyecto está 100% optimizado para desplegarse en **Vercel**:

1. Ingresa a [Vercel Dashboard](https://vercel.com/new).
2. Importa el repositorio `mangoex/nom-stps`.
3. Vercel detectará automáticamente **Next.js**.
4. Haz clic en **Deploy**. ¡La aplicación quedará publicada y operativa inmediatamente!

### Variables de Entorno Opcionales (para producción con PostgreSQL):
```env
DATABASE_URL="postgres://usuario:password@host:5432/nom_stps?sslmode=require"
JWT_SECRET="clave_secreta_jwt_produccion"
SMTP_HOST="smtp.proveedor.com"
SMTP_PORT="587"
SMTP_USER="notificaciones@empresa.com"
SMTP_PASS="password_smtp"
```
*Si no configuras `DATABASE_URL`, el sistema arranca automáticamente con su motor de datos persistente en memoria y catálogo oficial sembrado.*

---

## 👥 Credenciales de Prueba por Rol (RBAC)

Al ingresar en la pantalla de inicio de sesión (`/login`):

| Rol | Correo Electrónico | Contraseña | Capacidades |
|---|---|---|---|
| **Revisor Oficial** | `revisor@manufacturasnorte.mx` | `revisor123` | Inspección técnica, dictaminación, aprobación y emisión de PDF oficial |
| **Elaborador / Lab** | `elaborador@manufacturasnorte.mx` | `elaborador123` | Captura de estudios, mediciones de campo y envío a revisión |
| **Super Administrador** | `admin@nomstps.gob.mx` | `admin123` | Control global de empresas, usuarios, centros y catálogo de normas |
| **Consulta / Auditor** | `consulta@manufacturasnorte.mx` | `consulta123` | Visualización de tableros, expedientes y bitácora legal |

---

## 📄 Base de Datos DDL
El script oficial de PostgreSQL con RLS y triggers de retención de 5 años se encuentra en:
[`src/database/schema.sql`](src/database/schema.sql)
