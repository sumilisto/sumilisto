# REGLAS TÉCNICAS PERMANENTES: SUMILISTO

> **IMPORTANTE**: Este archivo recopila las reglas fijas de las secciones 1, 2, 11 y 12 del brief original. Estas reglas deben releerse y cumplirse obligatoriamente en todas y cada una de las fases de desarrollo.

---

## 1. NEGOCIO, ALCANCE Y MARCA (Sección 1)
- **Negocio**: Sumilisto, suministros para restaurantes y servicios de alimentos en Venezuela.
- **Enfoque v1**: Mayor y Gran Mayor. Productos sin precio en Google Sheets se muestran como "NO DISPONIBLE".
- **Alcance v1**: Catálogo, buscador, carrito y pedido por WhatsApp.
- **Fuera de alcance v1**: Pagos en línea, cuentas de clientes, pasarelas de pago y reseñas.
- **Identidad de Marca**:
  - Color primario: `#590317` (rojo vino/borgoña del logo) y blanco (`#FFFFFF`).
  - Tokens de diseño definidos centralizadamente en variables CSS en `src/styles/globals.css`.
  - Contrastes accesibles WCAG 2.2 AA.
- **Pie de página**: Zonas de entrega (Caracas, Guarenas, Guatire y envíos nacionales), horario de atención, datos legales y WhatsApp oficial `+58 422 7894547`.

---

## 2. STACK Y ARQUITECTURA EN LA NUBE (Sección 2)
- **Framework**: Next.js (App Router) en versión estable, TypeScript estricto, Tailwind CSS. Componentes ligeros y accesibles. Sin dependencias innecesarias o pesadas.
- **Hosting y Despliegue**: Vercel (plan Pro), conectado a GitHub, con previews automáticos por rama y CI. Región US East o la más próxima a Venezuela.
- **Inventario**: Google Sheets (hoja INVENTARIO), leído ÚNICAMENTE desde el servidor mediante la API de Google Sheets y cuenta de servicio con permisos de SOLO LECTURA.
- **Fotos**: Cloudinary CDN. Optimización automática `f_auto`, `q_auto`, transformaciones estrictas y carga responsiva.
- **Base de Datos y Admin**: Supabase (PostgreSQL con RLS estricto + Auth con 2FA TOTP nivel AAL2).
- **Antiabuso y Rate Limiting**: Upstash Redis y Cloudflare Turnstile en login administrativo.
- **Caché y Resiliencia**: ISR (revalidación cada ~5 min y on-demand) + CDN de Vercel + Service Worker PWA (stale-while-revalidate / stale-if-error). Si falla Google Sheets, la tasa o Supabase, la tienda sirve el último estado válido y nunca muestra una pantalla de error.
- **Variables de Entorno**: Ninguna clave en el código ni en el navegador. Archivo `.env.example` completo sin valores reales.

---

## 3. RENDIMIENTO Y CACHÉ (Sección 11)
### Presupuestos de Rendimiento (Criterios de Aceptación con Lighthouse Móvil 4G lenta y CPU 4x lenta):
- **LCP** ≤ 2,0 s
- **CLS** ≤ 0,05
- **INP** ≤ 200 ms
- **TTFB** ≤ 400 ms servido desde CDN
- **Puntuaciones Lighthouse Móvil**: Rendimiento ≥ 90 (meta 95); SEO, Accesibilidad y Buenas Prácticas ≥ 95.
- **Presupuestos de Peso**:
  - JS inicial en rutas públicas ≤ 150 KB gzip (incluyendo el framework).
  - Imagen LCP principal ≤ 80 KB.
  - Miniaturas de catálogo ≤ 25 KB.
- **3G Lenta**: Contenido útil visible (texto y primera fila de productos) en ≤ 3 s. Segunda visita instantánea.

### Técnicas Obligatorias:
- Server Components por defecto; `"use client"` únicamente en componentes estrictamente interactivos (carrito, selector de cantidad, buscador).
- Sin librerías pesadas de animación o iconos inflados (solo iconos SVG optimizados con tree-shaking).
- Imágenes servidas con loader de Cloudinary (`f_auto,q_auto`), placeholders borrosos y dimensiones explícitas `width` y `height`.
- Fuentes autoalojadas con `next/font`, subconjunto latino y `font-display: swap`.
- Scripts de terceros (Meta Pixel) diferidos tras interacción; jamás bloquean el renderizado inicial.
- PWA instalable con Service Worker: precaching del shell, catálogo en `stale-while-revalidate`, network-first para validación de carrito y tasa, y exclusión total de rutas `/admin`.

---

## 4. SEGURIDAD DE PRIMER ORDEN (Sección 12)
- **Superficie Mínima de Ataque**: Cero almacenamiento de datos personales (PII) de clientes en la base de datos. Los datos del pedido viajan únicamente en el mensaje de WhatsApp.
- **Cabeceras HTTP**:
  - HTTPS forzado + HSTS con `preload`.
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy` restrictiva.
  - `X-Frame-Options: DENY` y `frame-ancestors 'none'`.
  - `poweredByHeader: false` en `next.config.ts`.
  - Sourcemaps deshabilitados en producción.
  - `Cache-Control: no-store` para `/admin` y APIs sensibles.
  - Archivo `/.well-known/security.txt` configurado.
- **Content Security Policy (CSP)**:
  - Rutas públicas estáticas: Lista blanca restrictiva (`'self'`, `res.cloudinary.com`, `challenges.cloudflare.com`, scripts aprobados).
  - Rutas `/admin`: CSP dinámica con `nonce` criptográfico por petición y protección contra CSRF.
- **Secretos y Credenciales**:
  - Exclusivamente en variables de entorno del servidor.
  - `service_role` de Supabase, API Secret de Cloudinary, credenciales de Google y Token CAPI nunca llegan al cliente.
  - `.env*` estrictamente ignorado en `.gitignore`.
- **Panel Administrativo**:
  - Registro de usuarios desactivado.
  - Verificación en servidor de lista blanca `ADMIN_EMAILS`.
  - 2FA TOTP obligatorio (exigir nivel `aal2` en RLS y Server Actions).
  - Reautenticación con 2FA para acciones críticas (cambio de número de WhatsApp, emails o tasa manual).
  - Bitácora inmutable en `audit_logs` con IP, fecha, agente y valores anteriores/nuevos.
  - Indicador visible permanente en el panel con la fecha de última modificación del número de WhatsApp.
- **Base de Datos Supabase**:
  - Row Level Security (RLS) habilitado en TODAS las tablas con denegación por defecto.
- **Validación y Sanitización**:
  - Toda entrada de API validada con esquemas Zod (tipos, límites y listas blancas).
  - Datos de Google Sheets tratados como no confiables (sanitizados antes de pintar).
  - Prohibido el uso de `dangerouslySetInnerHTML` con contenido externo.
  - Enlaces de WhatsApp construidos únicamente con `https://wa.me/` y número validado E.164.
