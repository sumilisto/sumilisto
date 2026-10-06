# REGISTRO DE PENDIENTES Y MODO MOCK: SUMILISTO

Este documento registra las tareas pendientes, datos en modo MOCK activos y credenciales de servicios que el propietario del negocio deberá suministrar a medida que avancen las fases.

---

## 1. MODO MOCK ACTIVO (Fase 1)
- [x] **Catálogo MOCK inicial**: 30 productos representativos de suministros para restaurantes en Venezuela divididos en las 4 categorías insignia:
  - **Envases**: Contenedores térmicos de anime/icopor, envases de aluminio con tapa cartón, salseros con tapa hermética, envases plásticos para microondas, ensaladeras transparentes PET.
  - **Bolsas**: Bolsas kraft con asa y sin asa para delivery, bolsas plásticas tipo camiseta de alta densidad, bolsas transparentes de polietileno, bolsas para hielo y granos.
  - **Cubiertos**: Tenedores, cucharas y cuchillos plásticos pesados, kits individuales envueltos (cubiertos + servilleta + palillo), cubiertos biodegradables de madera.
  - **Papel**: Servilletas cuadradas para dispensador, papel para envolver hamburguesas encerado/antigrasa, papel aluminio profesional en rollo, papel film stretch.
- [x] **Tasa BCV Mock**: Tasa referencial temporal inicial fijada para visualización y pruebas hasta la conexión con la API en Fase 2.

---

## 2. CREDENCIALES Y CUENTAS PENDIENTES (Para Fase 2 y posteriores)
*Se generarán guías paso a paso en `docs/SETUP.md` para cada una de estas:*

- [ ] **Google Sheets & Google Cloud**:
  - Crear proyecto en Google Cloud Console.
  - Activar Google Sheets API.
  - Crear cuenta de servicio con rol de sólo lectura y descargar credenciales JSON.
  - Compartir la hoja de Google Sheets con el correo de la cuenta de servicio (`...iam.gserviceaccount.com`).
  - Proporcionar el ID de la hoja de Google Sheets.
- [ ] **Supabase**:
  - Crear proyecto en Supabase (región Este de EE.UU. o São Paulo).
  - Copiar URL del proyecto, `anon key` y `service_role key`.
  - Crear usuario administrador con el correo del propietario en el panel de Supabase.
  - Habilitar autenticación de 2 factores (TOTP/Authenticator app).
- [ ] **Cloudinary**:
  - Crear cuenta gratuita en Cloudinary.
  - Copiar `Cloud Name`, `API Key` y `API Secret`.
  - Activar "Strict Transformations" en la configuración de seguridad.
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
