# REGISTRO DE PENDIENTES: SUMILISTO

Este documento registra las tareas pendientes, estado de servicios y credenciales requeridas.
*Nota de arquitectura aprobada: Se eliminó Google Sheets y Cloudinary. Supabase gestiona la Base de Datos (PostgreSQL con RLS) y el Almacenamiento de Fotos (Supabase Storage).*

---

## 1. ESTADO DE SERVICIOS Y DATOS
- [x] **Base de Datos y Catálogo en Supabase**: Tablas `productos`, `variantes`, `producto_fotos` y `configuracion` creadas y activas en Supabase con RLS habilitado.
- [x] **Almacenamiento de Fotos (Supabase Storage)**: Bucket público `productos` creado en Supabase con endpoints de subida (`/api/upload`) y eliminación directa.
- [x] **Tasa Oficial BCV**: Sincronización en vivo directamente desde `bcv.org.ve` con respaldo en la base de datos de Supabase.
- [x] **Carrito Persistente y Pedidos por WhatsApp**: Carrito de 48h con selección de zonas de entrega, selector de mapa interactivo y generación de enlace directo.

---

## 2. CREDENCIALES Y CUENTAS PENDIENTES
*Guías y pasos para el propietario:*

- [x] **Supabase**:
  - Proyecto en Supabase configurado en `.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).
  - Habilitar autenticación de 2 factores (TOTP/Authenticator app) para la cuenta administradora.
- [ ] **Upstash Redis**:
  - Crear base de datos Serverless Redis gratuita en Upstash (región US East).
  - Copiar `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN`.
- [ ] **Cloudflare Turnstile**:
  - Crear widget gratuito de Turnstile para protección del formulario `/admin/login`.
  - Copiar `Site Key` y `Secret Key`.
- [ ] **Meta (Facebook/Instagram Ads)**:
  - ID del Pixel de Meta.
  - Token de acceso de la API de Conversiones (CAPI) desde Meta Events Manager.
- [ ] **Vercel Pro**:
  - Conectar repositorio de GitHub a Vercel.
  - Cargar las variables de entorno en la configuración del proyecto.
  - Vincular dominio definitivo (ej. `sumilisto.com`).

---

## 3. DECISIONES DE CONTENIDO PENDIENTES
- [ ] RIF y Razón Social exacta de la empresa para pie de página y términos legales.
- [ ] Horario de atención comercial para despachos y respuesta en WhatsApp.
- [ ] Texto final para las páginas legales: Términos y Condiciones, Políticas de Privacidad y Política de Envíos.
