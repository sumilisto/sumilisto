# REGLAS TÉCNICAS PERMANENTES: SUMILISTO

> **IMPORTANTE**: Este archivo recopila las reglas fijas de arquitectura, seguridad y rendimiento. Estas reglas deben releerse y cumplirse obligatoriamente en todas las fases de desarrollo.
> **DECISIÓN DE ARQUITECTURA**: Se eliminó Google Sheets y Cloudinary. Supabase gestiona la Base de Datos (PostgreSQL con RLS) y el Almacenamiento de Fotos (Supabase Storage).

---

## 1. NEGOCIO, ALCANCE Y MARCA (Sección 1)
- **Negocio**: Sumilisto, suministros para restaurantes y servicios de alimentos en Venezuela.
- **Enfoque v1**: Mayor y Gran Mayor. Productos sin precio en el catálogo se muestran como "NO DISPONIBLE".
- **Alcance v1**: Catálogo, buscador, carrito y pedido por WhatsApp.
- **Fuera de alcance v1**: Pagos en línea, cuentas de clientes, pasarelas de pago y reseñas.
- **Identidad de Marca**:
  - Color primario: Verde Bosque (`#166534`) y Canela/Ámbar (`#d97706`).
  - Tokens de diseño definidos centralizadamente en variables CSS en `src/styles/globals.css`.
  - Contrastes accesibles WCAG 2.2 AA.
- **Pie de página**: Zonas de entrega (Caracas, Guarenas, Guatire y envíos nacionales), horario de atención, datos legales y WhatsApp oficial `+58 422 7894547`.

---

## 2. STACK Y ARQUITECTURA EN LA NUBE (Sección 2)
- **Framework**: Next.js (App Router) en versión estable, TypeScript estricto, Tailwind CSS. Componentes ligeros y accesibles. Sin dependencias innecesarias o pesadas.
- **Hosting y Despliegue**: Vercel (plan Pro), conectado a GitHub, con previews automáticos por rama y CI. Región US East o la más próxima a Venezuela.
- **Inventario y Base de Datos**: Supabase (PostgreSQL con RLS estricto + Auth con 2FA TOTP nivel AAL2). Tablas: `productos`, `variantes`, `producto_fotos` y `configuracion`.
- **Fotos**: Supabase Storage (bucket público `productos`), con gestión y eliminación mediante endpoints protegidos en el servidor (`/api/upload`).
- **Antiabuso y Rate Limiting**: Upstash Redis y Cloudflare Turnstile en login administrativo.
- **Caché y Resiliencia**: ISR (revalidación cada ~5 min y on-demand) + CDN de Vercel + Service Worker PWA (stale-while-revalidate / stale-if-error). Si falla la conexión externa, la tienda sirve el último estado válido y nunca muestra una pantalla de error.
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
- Imágenes servidas optimizadas con Next/Image, placeholders y dimensiones explícitas `width` y `height`.
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
  - Rutas públicas estáticas: Lista blanca restrictiva (`'self'`, `*.supabase.co`, `challenges.cloudflare.com`, scripts aprobados).
  - Rutas `/admin`: CSP dinámica con `nonce` criptográfico por petición y protección contra CSRF.
- **Secretos y Credenciales**:
  - Exclusivamente en variables de entorno del servidor.
  - `service_role` de Supabase nunca llega al cliente.
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
  - Prohibido el uso de `dangerouslySetInnerHTML` con contenido externo.
  - Enlaces de WhatsApp construidos únicamente con `https://wa.me/` y número validado E.164.
