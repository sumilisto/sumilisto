# BRIEF ORIGINAL DEL PROYECTO: SUMILISTO

## 0. CÓMO QUIERO QUE TRABAJES
- Actúa como un equipo senior: arquitecto de software, desarrollador full-stack, especialista en seguridad web (OWASP), SEO técnico y rendimiento web.
- Trabaja en modo Planning. PRIMER ENTREGABLE: solo un plan de implementación (arquitectura, estructura de carpetas, modelo de datos, variables de entorno, riesgos, supuestos y máximo 5 preguntas bloqueantes). No escribas código hasta que yo apruebe el plan.
- Si algo de este brief es inviable o se contradice, dímelo en el plan con alternativas.
- Después construye por fases (sección 14). Al cerrar cada fase: ejecuta las pruebas, verifica en el navegador integrado (móvil 390 px y escritorio 1280 px), muéstrame evidencias (capturas, resultados de tests y de Lighthouse) y ESPERA mi aprobación antes de continuar.
- Con el plan aprobado, guarda este brief íntegro en docs/BRIEF.md y las reglas permanentes (secciones 1, 2, 11 y 12) en docs/RULES.md; relee ambos antes de cada fase.
- No inventes datos, credenciales ni cifras. Si falta algo, usa datos de ejemplo claramente marcados (modo MOCK) y anótalo en docs/PENDIENTES.md.
- Soy el dueño del negocio. No asumas conocimientos de programación: explícame en español sencillo y dame guías paso a paso para todo lo que deba hacer yo (crear cuentas, claves, dominio, despliegue). Todo debe poder operarse desde el navegador, sin servidores ni programas locales.
- Interfaz y contenido en español de Venezuela (es-VE). Código, variables y commits en inglés. Documentación en español.
- No instales paquetes dudosos ni ejecutes comandos destructivos; ante la duda, pregunta.

## 1. NEGOCIO Y ALCANCE
- Negocio: Sumilisto, tienda en línea de suministros para restaurantes y servicio de alimentos en Venezuela. Público: negocios de comida que compran de forma recurrente (al mayor y gran mayor) y compradores al detal. *(Nota de ajuste aprobado: enfoque prioritario v1 exclusivo en Mayor y Gran Mayor).*
- Alcance v1: catálogo, buscador, carrito y envío del pedido por WhatsApp. Fuera de alcance: pagos en línea, cuentas de clientes y reseñas (menos riesgo y menos complejidad).
- Marca: color primario tomado del logo (#590317 y color blanco) con complementarios de buen contraste. Define los tokens de diseño (variables CSS) en un solo archivo para cambiar la paleta fácilmente.
- Pie de página con datos del negocio (razón social y RIF si aplica), zonas de entrega [ZONAS_DE_ENTREGA], horario [HORARIO] y contacto.

## 2. STACK Y ARQUITECTURA (todo en la nube)
- Next.js (App Router) en su última versión estable y parcheada, TypeScript estricto y Tailwind CSS. Componentes accesibles y ligeros; ninguna librería pesada sin justificarla en el plan.
- Hosting: Vercel (plan Pro, por ser uso comercial) conectado a GitHub, con previews por rama y CI. Región de las funciones y de la base de datos lo más cercana posible a Venezuela (p. ej. costa este de EE. UU. o São Paulo).
- Inventario: Google Sheets (libro INVENTARIO), leído SOLO desde el servidor con la API de Google Sheets y una cuenta de servicio con permiso de SOLO LECTURA.
- Fotos: Cloudinary. Solo el administrador sube o vincula fotos.
- Administración y datos propios: Supabase (Postgres con RLS + Auth con 2FA). Allí viven la configuración (número de WhatsApp, etc.), los vínculos de fotos por SKU, los campos SEO, los banners, los pedidos iniciados y la auditoría. Si ves una alternativa más simple con la misma seguridad, preséntala en el plan como "Opción B", pero implementa la A salvo que yo apruebe el cambio.
- Antiabuso: rate limiting con Upstash Redis (o el Firewall de Vercel) y Cloudflare Turnstile en el login del admin.
- Caché: ISR/caché de Next.js + CDN de Vercel + Service Worker (sección 11).
- Entornos dev / preview / producción. Todas las claves en variables de entorno de Vercel; entrega un .env.example sin valores.

## 3. FUENTE DE DATOS: GOOGLE SHEETS (libro INVENTARIO)
- Lee SIEMPRE por NOMBRE de encabezado (no por posición) usando un archivo de mapeo (sheet-mapping.ts), para poder renombrar o reordenar columnas sin romper la tienda.
- Columnas PROPUESTAS de la pestaña `Productos` (AJUSTAR A MI HOJA REAL; si mis columnas son otras, esta lista se reemplaza): sku, nombre, categoria, subcategoria, marca, presentacion, unidad_venta, precio_detal_usd, precio_mayor_usd, min_mayor, precio_gran_mayor_usd, min_gran_mayor, stock, activo, destacado, etiquetas.
- `sku` es la clave única y estable. `activo = NO` oculta el producto. Las fotos NO están en la hoja: se vinculan desde el administrador (sección 8).
- Pestaña `Tasa`: contiene mi fórmula IMPORTXML de la tasa BCV (sección 4).
- Lista blanca de columnas públicas: cualquier otra columna (costos, proveedores, márgenes, notas internas) NUNCA llega al navegador ni a los logs.
- Valida cada fila con Zod. Trata el contenido de la hoja como NO CONFIABLE (escapar/sanitizar; jamás HTML crudo). Las filas inválidas se omiten y se reportan en el admin; no rompen la tienda.
- Protección contra hoja vacía o dañada: si una sincronización trae menos del 50 % de los productos anteriores o faltan columnas obligatorias, CONSERVA el último catálogo válido y avísame en el admin.
- Nunca consultes Sheets durante la visita de un cliente: el catálogo se genera con ISR/caché (revalidar cada ~5 min) y se actualiza al instante con el botón "Sincronizar ahora" del admin (revalidación on-demand).
- Si Google falla, sirve el último catálogo válido (stale-if-error); jamás una tienda vacía.
- Stock: mostrar "Disponible / Últimas unidades / Agotado" (umbral configurable en el admin) y opción de mostrar o no la cantidad exacta. Los agotados se ven pero no se pueden agregar. Texto visible: "Disponibilidad y precios sujetos a confirmación por WhatsApp".

## 4. PRECIOS EN USD + TASA BCV
- Moneda base: USD. Cada precio se muestra en $ y, más pequeño, su equivalente en Bs. con la tasa BCV vigente. Formato es-VE: coma decimal y punto de miles ("$ 12,50" y "Bs. 1.234,56"). Calcula en centavos enteros o con Decimal, nunca con float; convierte el TOTAL a Bs. (no sumes líneas ya redondeadas) y redondea a 2 decimales.
- Muestra siempre en el encabezado y en el carrito: "Tasa BCV: Bs. X,XX · actualizada DD/MM/AAAA HH:MM", y aclara que el monto en Bs. es referencial a esa tasa.
- Obtención de la tasa, por orden de prioridad:
  1) Leer la celda de la pestaña `Tasa`, donde ya tengo `=IMPORTXML(A1;"//*[@id='dolar']/div/div/div[2]/strong")` con la URL del BCV en A1 ([URL_BCV]).
  2) Si esa celda está vacía, con error o vieja: leer la página del BCV desde el SERVIDOR con un parser HTML (cheerio) y el selector equivalente al XPath: `#dolar > div > div > div:nth-of-type(2) > strong` (verifícalo contra la página real y déjalo configurable). Timeout corto, 2 reintentos, User-Agent identificable. NUNCA desactives la verificación TLS; si el certificado falla, pasa al siguiente nivel.
  3) Último valor bueno guardado, con su fecha ("tasa del DD/MM").
  4) Override manual en el admin (interruptor ON/OFF, con fecha y registro de quién lo cambió).
- Convierte el texto venezolano (p. ej. "123,45678900") a número con un parser robusto y pruebas unitarias.
- Validación: rechaza valores ≤ 0, NaN o con variación mayor al 15 % (configurable) respecto a la tasa anterior; el valor sospechoso queda "pendiente de aprobación" en el admin y mientras tanto se usa el último bueno.
- Las páginas estáticas NO llevan la tasa incrustada (para no regenerar el catálogo cada vez que cambie). Expón GET /api/tasa (respuesta mínima, cacheada en el CDN con stale-while-revalidate) y calcula los Bs. en el cliente; guarda la última tasa en localStorage/Service Worker para pintar al instante y evitar saltos de diseño (CLS).

## 5. NIVELES DE PRECIO: DETAL, MAYOR Y GRAN MAYOR
- Regla por defecto (por producto), según la cantidad de ESE producto en el carrito: si cantidad ≥ min_gran_mayor → precio_gran_mayor; si ≥ min_mayor → precio_mayor; si no → precio_detal. Si falta el precio de un nivel, aplica el nivel inmediatamente inferior. *(Ajustado a negocio: exclusivo Mayor y Gran Mayor. Sin precio = NO DISPONIBLE).*
- Aísla la lógica en un módulo `pricing` con pruebas unitarias, para poder cambiarla luego a "por total del pedido" sin tocar la interfaz.
- Valida coherencia (gran mayor ≤ mayor) y avísame en el admin cuando no se cumpla.
- UX: en la ficha del producto, tabla "Escala de precios" (X+ u · Y+ u). En el carrito, el nivel aplicado en cada línea y un aviso de ahorro ("Agrega 4 más y paga $X c/u").
- Pedido mínimo global opcional (monto en USD) configurable en el admin, con aviso amable en el carrito.

## 6. DISEÑO Y EXPERIENCIA (sensación de app moderna)
Inspírate en los PATRONES de UX de Uber/Uber Eats, Amazon y Yummy. No copies sus marcas, logos, textos ni imágenes.
- Mobile-first: la mayoría del tráfico será celular. Barra superior fija con buscador; categorías como chips con ícono en scroll horizontal; carruseles ("Más pedidos", "Ofertas al mayor", "Nuevos"); tarjetas grandes con foto, nombre, presentación, precio en $ y Bs., y un botón "+" que se convierte en selector de cantidad.
- En móvil: navegación inferior fija (Inicio · Categorías · Buscar · Carrito · WhatsApp), barra flotante de carrito ("Ver pedido · 3 productos · $24,50") y carrito/filtros como bottom sheets. En escritorio: rejilla de 4 a 5 columnas, filtros laterales, mega-menú y carrito en panel lateral.
- Esqueletos de carga, microinteracciones sutiles hechas con CSS, estados vacíos amigables y página 404 útil.
- Buscador instantáneo, tolerante a errores y a tildes, con un índice liviano cargado bajo demanda.
- Ficha de producto: galería, escala de precios, disponibilidad, botón "Consultar este producto por WhatsApp", relacionados y compartir.
- Accesibilidad WCAG 2.2 AA: contraste, foco visible, teclado, alt en imágenes, áreas táctiles de al menos 44 px, respeto de prefers-reduced-motion.

## 7. CARRITO Y PEDIDO POR WHATSAPP
- Carrito tradicional: agregar, cambiar cantidad, quitar y vaciar. En localStorage se guarda SOLO {sku, cantidad} y fechas, NUNCA precios. Precios y disponibilidad se recalculan siempre con datos vigentes (POST /api/carrito/validar, con Zod y rate limit) y se avisa si algo cambió o se agotó.
- Persistencia de 48 horas: vigencia = 48 h desde la última modificación o desde el envío por WhatsApp (lo que ocurra último). Al enviar el pedido por WhatsApp el carrito NO se vacía: pasa a estado "enviado_whatsapp" y se conserva. Si el cliente vuelve dentro del lapso, muestra "Tienes un pedido pendiente (hace X horas)" con las opciones Retomar · Reenviar por WhatsApp · Vaciar. Pasadas las 48 h se vacía solo, con un mensaje amable. Botón visible "Ya hice mi pedido / Vaciar carrito". Sincroniza entre pestañas y tolera localStorage no disponible (modo privado) sin romper la página.
- Formulario mínimo antes de enviar: nombre, entrega o retiro, zona, método de pago preferido (Pago móvil/Transferencia, Binance, efectivo USD, configurables en el admin) y notas. Estos datos NO se guardan en el servidor: solo viajan en el mensaje de WhatsApp (pueden recordarse en localStorage dentro de las 48 h).
- Al abrir el resumen, el cliente llama a POST /api/pedido/resumen con solo {sku, cantidad}. El SERVIDOR devuelve las líneas con el nivel de precio aplicado, totales en $ y Bs. (con la tasa y su fecha), un código corto (SUM-AAMMDD-XXXX) y el texto del mensaje. El cliente nunca envía precios.
- Con esa respuesta se arma, ANTES del clic, un enlace `https://wa.me/<NUMERO>?text=<mensaje codificado>` (un <a href> real, para evitar bloqueos en iOS/Safari). El NÚMERO sale de la configuración del admin (formato internacional, solo dígitos, validado), jamás del código. Al hacer clic se registra el "pedido iniciado" con navigator.sendBeacon, sin retrasar la apertura de WhatsApp. Si el servidor no responde en ~3 s, usa un cálculo local con el último catálogo en caché y marca "(precios por confirmar)".
- Formato del mensaje estable y estructurado (legible para mí y fácil de procesar luego): encabezado con el código, lista numerada "cantidad × producto (presentación) — precio unitario = subtotal", totales en $ y Bs. con la tasa usada, datos del formulario y una línea final con el enlace de la tienda. Si supera ~1.500 caracteres, abrevia líneas y ofrece el botón "Copiar pedido" como respaldo.
- Registra cada "pedido iniciado" en la base de datos (código, SKUs y cantidades, totales, tasa, fecha, UTM) SIN datos personales, con vista y exportación a CSV en el admin.

## 8. ADMINISTRADOR (/admin), TODO DESDE EL NAVEGADOR
- Acceso solo con mi correo [TU_CORREO_ADMIN]: registro público DESACTIVADO (creo mi usuario manualmente desde el panel de Supabase), lista blanca ADMIN_EMAILS verificada en el SERVIDOR en cada petición y acción (no solo en la interfaz), Supabase Auth con enlace o código al correo y 2FA TOTP OBLIGATORIO (exigir nivel aal2 también en las políticas RLS). Sesión corta con cierre por inactividad, cookies httpOnly + Secure + SameSite, protección CSRF (Server Actions con verificación de Origin), límite de intentos y Turnstile en el login. /admin con noindex y sin enlaces públicos.
- Acciones sensibles (cambiar el número de WhatsApp o los correos admin, activar el override de tasa) exigen reautenticación reciente con 2FA y quedan en un LOG DE AUDITORÍA (quién, qué, antes/después, cuándo, IP). Muestra de forma visible en el panel la fecha del último cambio del número de WhatsApp: es el objetivo más valioso para un atacante.
- Configuración: número de WhatsApp de ventas, nombre, logo, colores, horario, zonas de entrega, métodos de pago, pedido mínimo, umbral de "últimas unidades", mostrar u ocultar cantidad de stock, textos legales, redes sociales, IDs públicos (Meta Pixel, códigos de verificación de Search Console y Meta) y banners del inicio.
- Fotos (Cloudinary): lista de productos (leídos del Sheet) con buscador y filtro "sin foto". Por producto puedo (a) vincular fotos ya existentes pegando su enlace o public_id (guarda solo el public_id), (b) elegirlas desde mi biblioteca con el Media Library Widget o la Search API desde el servidor, o (c) subir nuevas con subidas FIRMADAS desde el servidor (solo JPG, PNG o WebP, máx. 5 MB). Reordenar, foto principal y texto alternativo. Carga masiva: arrastrar muchas fotos nombradas con el SKU (ABC123.jpg, ABC123_2.jpg) y vincularlas solas, con un reporte de las que no coincidieron.
- SEO por producto y categoría: título, meta descripción, descripción larga y slug, con valores automáticos por defecto.
- Operación: botón "Sincronizar inventario ahora"; estado de la última sincronización (hora, nº de productos, filas con error); estado de la tasa (fuente, hora, override); lista de pedidos iniciados; visor de auditoría; botón "Exportar respaldo" (JSON/CSV) de todo lo que vive en Supabase.
- Si Supabase no responde, la tienda pública sigue funcionando con la última configuración guardada (incluido el número de WhatsApp) y nunca muestra un error.

## 9. PUBLICIDAD CON META (Facebook e Instagram Ads)
- Meta Pixel (ID configurable en el admin, cargado de forma diferida) + API de Conversiones (CAPI) desde el servidor, con deduplicación por event_id. Eventos: PageView, ViewContent, Search, AddToCart, InitiateCheckout (al abrir el resumen del pedido) y Contact (clic en "Enviar por WhatsApp"; opcionalmente Lead). La compra real ocurre en WhatsApp, así que NO habrá Purchase automático: documéntalo. Envía value + currency=USD y contents con el SKU.
- El token de CAPI vive solo en variables de entorno. El endpoint de eventos no acepta cualquier carga: lista blanca de eventos, validación, rate limit, hash SHA-256 de cualquier dato personal y nada de PII innecesaria.
- Conserva fbclid, UTM y las cookies _fbp/_fbc (con consentimiento) para atribución.
- Feed de catálogo para Commerce Manager en /feeds/meta.csv (y .xml): id = sku, title, description, availability, condition, price (formato "12.50 USD"), link, image_link (Cloudinary, mínimo 500×500), brand (usa el nombre de la tienda si el producto no tiene marca). Debe reflejar el catálogo vigente.
- Páginas de aterrizaje de campaña /promo/[slug], configurables desde el admin, ultralivianas, con botón directo a WhatsApp y mensaje prellenado que incluya un código de campaña.
- Open Graph y Twitter Cards para compartir bien en WhatsApp, Facebook e Instagram (imagen 1200×630 dinámica).
- Aviso de privacidad y cookies con opción de rechazar marketing: Pixel y CAPI respetan la elección. Páginas de Privacidad, Términos, Pedidos y devoluciones, y Contacto. Verificación de dominio de Meta mediante meta tag configurable en el admin.

## 10. SEO Y VISIBILIDAD EN IA (GEO)
Objetivo: el mayor posicionamiento posible. No prometas posiciones: entrega la mejor base técnica y de contenido.
- TODAS las páginas públicas se renderizan en servidor o estáticas (HTML completo sin depender de JS). URLs limpias en español: /categoria/[slug], /producto/[slug]. Slugs estables; 301 si cambian; producto desactivado → redirección a su categoría o 410. Redirige el dominio *.vercel.app y la variante con/sin www al dominio canónico.
- Metadatos únicos por página (title ≤ 60 caracteres, description ≤ 155), canonical, Open Graph, lang="es-VE", robots correctos. sitemap.xml dinámico (productos, categorías y páginas) con lastmod. robots.txt que bloquee /admin, /api y /carrito y permita rastreadores de buscadores y de IA.
- Datos estructurados JSON-LD, validados: Organization/LocalBusiness (nombre, logo, WhatsApp, zona de servicio, horario), WebSite con SearchAction, BreadcrumbList, Product + Offer (precio detal, priceCurrency USD, availability) y FAQPage. Marca solo lo que se ve en la página.
- Contenido que posiciona: texto propio y útil en cada categoría (sin duplicar), guía "Cómo comprar al mayor y gran mayor", FAQ (entregas, mínimos, formas de pago, cómo funciona el pedido por WhatsApp), "Sobre nosotros" y una sección de guías para compradores de restaurantes (deja la estructura lista; los textos los redactamos después). Enlazado interno: migas de pan, relacionados y categorías destacadas. Propón una lista inicial de palabras clave del sector y de Venezuela para validarla.
- Para IA (GEO): contenido factual y bien estructurado (listas, tablas de presentaciones y precios, preguntas y respuestas), datos del negocio idénticos en todo el sitio, y /llms.txt como extra de bajo costo (su efecto no está garantizado). No bloquear rastreadores de IA.
- Imágenes con alt descriptivo, nombres de archivo con slug o SKU, dimensiones explícitas y formatos WebP/AVIF.
- Entrega docs/SEO-CHECKLIST.md con lo que debo hacer fuera del código: Google Search Console y Bing Webmaster (enviar el sitemap), perfil de empresa en Google, los mismos datos en redes, conseguir menciones y enlaces, y medir y mejorar cada mes.

## 11. RENDIMIENTO Y CACHÉ (meta: cargar en menos de 2 s)
Presupuestos que son CRITERIO DE ACEPTACIÓN (mide con Lighthouse móvil, red 4G lenta y CPU 4× más lenta):
- LCP ≤ 2,0 s · CLS ≤ 0,05 · INP ≤ 200 ms · TTFB ≤ 400 ms servido desde el CDN · Lighthouse móvil: Rendimiento ≥ 90 (meta 95) y SEO, Accesibilidad y Buenas prácticas ≥ 95.
- JS inicial ≤ 150 KB gzip en rutas públicas (incluido el framework) · imagen LCP ≤ 80 KB · miniaturas ≤ 25 KB.
- En 3G lenta: contenido útil visible (texto y primera fila de productos) en ≤ 3 s. Segunda visita: casi instantánea.

Técnicas obligatorias:
- Páginas estáticas/ISR servidas desde el CDN (s-maxage + stale-while-revalidate). Archivos con hash y Cache-Control immutable. Brotli y HTTP/2-3.
- Server Components por defecto; JS solo donde hay interacción (carrito, buscador); división de código; sin librerías pesadas de animación o UI; íconos SVG con tree-shaking.
- Imágenes: Cloudinary con f_auto y q_auto, anchos responsivos (srcset/sizes), loader de Cloudinary (no el optimizador de Vercel), lazy-load bajo el pliegue, prioridad a la imagen LCP, placeholder borroso y dimensiones fijas. Activa "strict transformations" en Cloudinary y documenta las transformaciones permitidas.
- Fuentes autoalojadas, subconjunto latino, font-display: swap, máximo 2 familias.
- Scripts de terceros (Meta Pixel, analítica) diferidos o tras la primera interacción; jamás bloquean el render. Analítica ligera sin cookies (Vercel Web Analytics o Plausible) y Speed Insights para medir usuarios reales.
- PWA instalable (manifest e íconos) con Service Worker (Workbox o Serwist): precache del shell; imágenes cache-first con expiración (máx. 200 entradas / 30 días); catálogo y búsqueda en stale-while-revalidate; /api/tasa y la validación del carrito en network-first con respaldo en caché; página offline amable ("sin conexión, mostrando datos guardados"). El SW no cachea /admin ni rutas sensibles y se actualiza sin dejar a nadie con una versión vieja.
- Preconnect solo a res.cloudinary.com. Evita cascadas de peticiones.
- Lighthouse CI en cada PR con estos presupuestos: si falla, no se despliega.

## 12. SEGURIDAD (REQUISITO PRINCIPAL)
Principio: mínima superficie de ataque y mínimo dato guardado. No hay pagos ni cuentas de clientes y NO se guardan datos personales de clientes.
- Transporte y cabeceras: HTTPS obligatorio + HSTS con preload; X-Content-Type-Options, Referrer-Policy, Permissions-Policy restrictiva, frame-ancestors 'none', COOP/CORP; poweredByHeader desactivado y sourcemaps de navegador NO públicos en producción; Cache-Control: no-store en /admin y APIs sensibles; /.well-known/security.txt.
- CSP lo más estricta posible SIN sacrificar el caché estático: en /admin (dinámico) usa nonce estricto; en las páginas públicas prefiere hashes/SRI (la opción de SRI de Next.js, si está disponible en la versión instalada) y, si no es viable, una lista blanca mínima de orígenes (self, res.cloudinary.com, Meta Pixel, Turnstile). Si necesitas 'unsafe-inline', justifícalo por escrito en el plan. No uses nonces si obligan a renderizar todo el sitio de forma dinámica.
- Secretos: SOLO en variables de entorno del servidor; nada en el cliente salvo valores públicos explícitos; .env* en .gitignore; escaneo de secretos en CI (gitleaks); claves con mínimo privilegio y procedimiento de rotación documentado. La clave secreta/service_role de Supabase, el API secret de Cloudinary, la cuenta de servicio de Google y el token de CAPI jamás llegan al navegador.
- Admin: lo definido en la sección 8 (lista blanca en servidor, 2FA obligatorio, reautenticación en acciones sensibles, auditoría).
- Base de datos: RLS activado en TODAS las tablas con denegación por defecto y políticas mínimas; migraciones versionadas; consultas parametrizadas.
- API: validación estricta con Zod (tipos, longitudes, listas permitidas), límites de tamaño, rate limiting por IP en todas las rutas /api, CORS cerrado al propio dominio, errores genéricos (sin stack traces) y logs sin datos personales.
- XSS e inyección: nada de dangerouslySetInnerHTML con contenido externo; trata Sheets, admin y parámetros de URL como no confiables; acepta imágenes solo de res.cloudinary.com; construye la URL de WhatsApp únicamente con wa.me y un número validado.
- Datos internos: las columnas privadas del Sheet (costos, proveedores, márgenes) jamás se exponen. El libro INVENTARIO se comparte solo con la cuenta de servicio y nunca es público.
- Cloudinary: subidas firmadas desde el servidor y solo por el admin; sin upload presets sin firma; tipos y tamaño limitados.
- Dependencias: lockfile, versiones fijas, mínimo de paquetes; Dependabot/Renovate y npm audit en CI; revisa el mantenimiento de cada paquete antes de añadirlo; mantén Next.js y React al día y aplica de inmediato los parches de seguridad críticos.
- Resiliencia: respaldos y plan de recuperación, monitoreo de errores sin PII (Sentry) y alertas de caída.
- Antes de cerrar: autoauditoría contra OWASP Top 10 y OWASP ASVS nivel 1, prueba de cabeceras y reporte en docs/SECURITY_AUDIT.md con hallazgos, correcciones y riesgos residuales. Escribe docs/SECURITY.md con lo que debo hacer yo: 2FA/passkeys en TODAS mis cuentas (Google, Vercel, GitHub, Supabase, Cloudinary, Meta, dominio), no compartir claves y bloquear el dominio.

## 13. CALIDAD, PRUEBAS Y ENTREGABLES
- Pruebas unitarias (Vitest): niveles de precio, conversión USD→Bs., parser de la tasa, vigencia del carrito de 48 h (con reloj simulado) y generación del mensaje de WhatsApp.
- Pruebas E2E (Playwright, viewport móvil): buscar → agregar → cambiar cantidad → ver nivel mayor y gran mayor → enviar a WhatsApp (verificar la URL) → recargar y comprobar persistencia → simular 48 h y comprobar vencimiento.
- CI en GitHub Actions: lint, tipos, pruebas, auditoría de dependencias, gitleaks y Lighthouse CI.
- Documentación en español para una persona no técnica: README; docs/SETUP.md (paso a paso: Vercel, Supabase, Cloudinary, Google Cloud con cuenta de servicio, Meta, Turnstile, Upstash, dominio y variables de entorno); docs/OPERACION.md (actualizar el Sheet, cargar fotos, ajustar la tasa, qué hacer si algo falla, volver a una versión anterior); docs/ARQUITECTURA.md; docs/SECURITY.md; docs/SEO-CHECKLIST.md; .env.example.
- Modo MOCK (USE_MOCK_DATA=true) con unos 30 productos ficticios de suministros para restaurantes, para ver y probar todo antes de conectar el Sheets real.

## 14. FASES (espera mi aprobación entre fases)
0. Plan, sin código.
1. Base: proyecto, sistema de diseño, catálogo con datos MOCK, inicio, categorías, ficha de producto, búsqueda y PWA básica.
2. Datos reales: lector de Google Sheets con caché/ISR, tasa BCV con sus respaldos y niveles de precio.
3. Carrito persistente de 48 h y pedido por WhatsApp.
4. Administrador: login con 2FA, configuración, fotos con Cloudinary, SEO por producto, auditoría, sincronización manual y respaldo.
5. SEO técnico y GEO, más Meta (Pixel, CAPI, feed, landings y consentimiento).
6. Rendimiento y seguridad: optimizar hasta cumplir los presupuestos, auditoría OWASP e informe.
7. Despliegue en Vercel (previews y producción), dominio, verificación en Search Console y Meta, y checklist de salida a producción.

## 15. CRITERIOS DE ACEPTACIÓN
- Todo funciona en móvil y escritorio, sin errores en consola.
- Presupuestos de rendimiento cumplidos, con evidencia.
- Ninguna clave en el código ni en el navegador; RLS en todas las tablas; admin con 2FA; cabeceras de seguridad verificadas.
- El carrito persiste 48 h y vence correctamente; el mensaje de WhatsApp sale con totales correctos en $ y Bs.
- Si fallan Google Sheets, la tasa o Supabase, la tienda sigue funcionando con la última información válida.
- Documentación completa y comprensible para una persona no técnica.

## 16. PARA DESPUÉS DE LA V1 (NO implementar ahora)
Botón "Repetir mi último pedido", listas de compra guardadas, cuentas de clientes, reseñas, varios números de WhatsApp por horario y panel de métricas.
