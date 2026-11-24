import { Product } from "@/types/product";
import { GrillaCanal, FormatoContenido, NeuromarketingContent } from "@/types/grilla";

/**
 * Motor de Neuromarketing y Ventas para Suministros y Empaques (Sumilisto.com)
 * Genera ganchos virales, desarrollo dinámico de video/carrusel, copies y CTAs de alta conversión.
 */

// Helper para formatear precios con 2 decimales
function formatUsd(amount?: number): string {
  if (amount == null || isNaN(amount)) return "0.00";
  return amount.toFixed(2);
}

// Extrae medidas o características clave del nombre del producto
function extractFeatures(nombre: string): { medidas: string; capacidad: string } {
  const matchMedidas = nombre.match(/(\d+([.,]\d+)?\s*(x|X)\s*\d+([.,]\d+)?(\s*(x|X)\s*\d+([.,]\d+)?)?\s*(cm|mm)?)/);
  const matchCapacidad = nombre.match(/(\d+\s*(oz|kg|g|gr|ml|litro|litros))/i);
  return {
    medidas: matchMedidas ? matchMedidas[0] : "",
    capacidad: matchCapacidad ? matchCapacidad[0] : "",
  };
}

// Clasifica la categoría / tipo de producto para personalizar los ángulos de neuromarketing
function classifyProductNiche(product: Product): {
  tipo: "caja" | "molde" | "tina" | "bolsa" | "papel" | "envase" | "vaso" | "bandeja" | "viruta" | "cubierto" | "general";
  sectorCliente: string;
  dolorPrincipal: string;
} {
  const name = (product.nombre || "").toLowerCase();
  const cat = (product.categoria || "").toLowerCase();
  const all = `${name} ${cat}`;

  if (/molde|panettone|torta|capacillo|reposteria/.test(all)) {
    return {
      tipo: "molde",
      sectorCliente: "reposterías, panaderías y amantes del horneado",
      dolorPrincipal: "moldes que se deforman o se queman y arruinan la presentación de la torta",
    };
  }
  if (/caja|lonchera|visor|feliz/.test(all)) {
    return {
      tipo: "caja",
      sectorCliente: "pastelerías, delivery de desayunos sorpresa y combos",
      dolorPrincipal: "cajas endebles que se aplastan con la humedad o el peso",
    };
  }
  if (/tina|salsera|porcion|bisagra/.test(all)) {
    return {
      tipo: "tina",
      sectorCliente: "hamburgueserías, sushi, pizzerías y comida rápida",
      dolorPrincipal: "salsas que se botan en la bolsa del delivery y generan quejas de clientes",
    };
  }
  if (/bolsa|kraft/.test(all)) {
    return {
      tipo: "bolsa",
      sectorCliente: "tiendas, panaderías, cafeterías y negocios de entrega",
      dolorPrincipal: "bolsas plásticas genéricas que hacen que el negocio parezca informal",
    };
  }
  if (/papel|antigrasa|termico|aluminizado/.test(all)) {
    return {
      tipo: "papel",
      sectorCliente: "hamburgueserías, food trucks y comida rápida",
      dolorPrincipal: "papeles comunes que se empapan de grasa y se rompen en las manos del cliente",
    };
  }
  if (/vaso|domo|smoothie/.test(all)) {
    return {
      tipo: "vaso",
      sectorCliente: "cafeterías, heladerías y bares de batidos",
      dolorPrincipal: "vasos con tapas que no ajustan y derraman las bebidas",
    };
  }
  if (/viruta|relleno/.test(all)) {
    return {
      tipo: "viruta",
      sectorCliente: "tiendas de regalos, cotillones y anchetas navideñas",
      dolorPrincipal: "empaques que lucen vacíos o productos que se mueven y dañan adentro de la caja",
    };
  }
  if (/bandeja|charola/.test(all)) {
    return {
      tipo: "bandeja",
      sectorCliente: "charcuterías, carnicerías, panaderías y catering",
      dolorPrincipal: "bandejas frágiles que se doblan o no aíslan bien los alimentos",
    };
  }
  if (/cubierto|tenedor|cuchillo|cuchara/.test(all)) {
    return {
      tipo: "cubierto",
      sectorCliente: "delivery de almuerzos, comida corporativa y eventos",
      dolorPrincipal: "cubiertos que se doblan con el primer bocado de comida caliente",
    };
  }
  if (/envase|contenedor|aluminio|anime/.test(all)) {
    return {
      tipo: "envase",
      sectorCliente: "restaurantes de comida para llevar y dark kitchens",
      dolorPrincipal: "comida que llega fría o envases que se abren durante el transporte",
    };
  }

  return {
    tipo: "general",
    sectorCliente: "negocios gastronómicos y comercios mayoristas",
    dolorPrincipal: "pagar de más por suministros sueltos en vez de comprar al mayor",
  };
}

/**
 * Generador principal de contenido con Neuromarketing
 */
export function generateNeuromarketingContent(
  product: Product,
  slot: {
    canal: GrillaCanal;
    formatoTipo?: FormatoContenido;
    slotNumber: number;
    tipo: string;
    hora: string;
  },
  seedIndex: number = 0
): NeuromarketingContent {
  const isMercadoLibre = slot.canal === "mercadolibre";
  const isMarketplace = slot.canal === "facebook";
  const isHistoria = slot.formatoTipo === "historia" || slot.tipo.toLowerCase().includes("historia");
  const niche = classifyProductNiche(product);
  const { medidas, capacidad } = extractFeatures(product.nombre);

  const precioMayor = product.precioMayorUsd || 0;
  const minMayor = product.minMayor || 1;
  const precioGranMayor = product.precioGranMayorUsd || 0;
  const minGranMayor = product.minGranMayor || 5;

  const unitMayor = minMayor > 0 ? precioMayor / minMayor : precioMayor;
  const unitGranMayor = minGranMayor > 0 ? precioGranMayor / minGranMayor : precioGranMayor;
  const ahorroUnitario = unitMayor > unitGranMayor ? unitMayor - unitGranMayor : 0;
  const porcentajeAhorro = unitMayor > 0 && ahorroUnitario > 0 ? Math.round((ahorroUnitario / unitMayor) * 100) : 18;

  // ─────────────────────────────────────────────────────────────
  // 1. GENERACIÓN PARA MERCADOLIBRE (Ficha técnica y Copy SEO)
  // ─────────────────────────────────────────────────────────────
  if (isMercadoLibre) {
    // Título SEO limpio optimizado para el algoritmo de ML (máximo 60 caracteres)
    let rawTitle = `${product.nombre} Mayor`;
    if (rawTitle.length > 60) {
      rawTitle = rawTitle.slice(0, 57) + "...";
    }

    const copyML = `📦 ${product.nombre.toUpperCase()} - VENTA AL MAYOR Y GRAN MAYOR

Solución profesional de empaque y embalaje directo de SUMILISTO. Diseñado especialmente para ${niche.sectorCliente} que buscan rentabilidad, calidad certificada y excelente presentación.

━━━━━━━━━━━━━━━━━━━━━━━━━━
📐 ESPECIFICACIONES TÉCNICAS:
• Producto: ${product.nombre}
• Categoría: ${product.categoria}
${medidas ? `• Dimensiones: ${medidas}\n` : ""}${capacidad ? `• Capacidad: ${capacidad}\n` : ""}• Grado alimenticio / Resistente y seguro para despacho.
• Presentación base: Paquete cerrado de ${minMayor} ${product.unidadVenta || "unidades"}.

━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 ESCALA DE PRECIOS MAYORISTAS:
• AL MAYOR (Desde ${minMayor} unds): $${formatUsd(precioMayor)} ($${formatUsd(unitMayor)} por unidad)
• AL GRAN MAYOR (Desde ${minGranMayor} unds): $${formatUsd(precioGranMayor)} ($${formatUsd(unitGranMayor)} por unidad)
👉 ¡Ahorras un ${porcentajeAhorro}% comprando por bulto cerrado!

━━━━━━━━━━━━━━━━━━━━━━━━━━
🛵 MÉTODOS DE DESPACHO Y ENTREGA:
• DELIVERY GRATIS en Caracas, Guarenas y Guatire en compras mayores a $50.
• Envíos rápidos y asegurados a todo el país vía: MRW, ZOOM, TEALCA y DOMESA.
• Retiro personal coordinado en nuestra sede Guarenas.

━━━━━━━━━━━━━━━━━━━━━━━━━━
💳 MÉTODOS DE PAGO:
• Pago Móvil y Transferencias Bancarias (Banesco / Mercantil a tasa oficial BCV).
• Divisas en efectivo (para entregas personales y delivery).
• USDT vía Binance Pay y Zinli.

━━━━━━━━━━━━━━━━━━━━━━━━━━
❓ PREGUNTAS FRECUENTES:
• ¿Tienen disponibilidad inmediata? Sí, somos distribuidores con inventario activo.
• ¿Emiten nota de entrega y comprobante? Sí, con todos los detalles de su pedido.

⚠️ IMPORTANTE: Aclare cualquier duda en la sección de preguntas antes de presionar comprar. ¡Atención rápida y personalizada!`;

    return {
      mlTitulo: rawTitle,
      hookViral: "Título optimizado para primeros lugares de búsqueda en MercadoLibre con palabras clave transaccionales.",
      problemaEnganche: "Compradores buscando bultos cerrados al mayor con despacho confiable en Venezuela.",
      desarrolloAccion: "Publicación con ficha técnica impecable, escala de precios transparente y garantía de delivery.",
      llamadaAccion: "Ofertá hoy mismo y recibe en la puerta de tu negocio con Delivery Gratis en compras mayores a $50.",
      copyCompleto: copyML,
      formatoRecomendado: "Publicación MercadoLibre (Catálogo)",
      tipoEnfoque: "Ficha Técnica Mayorista SEO",
    };
  }

  // ─────────────────────────────────────────────────────────────
  // 2. GENERACIÓN PARA FACEBOOK MARKETPLACE (Venta Local Directa)
  // ─────────────────────────────────────────────────────────────
  if (isMarketplace) {
    const copyFB = `🔥 ${product.nombre} (PRECIO AL MAYOR Y GRAN MAYOR) 🔥

¿Tienes negocio de comida, repostería o delivery en Caracas / Miranda? Deja de comprar empaques caros al detal.

Precios directos de distribuidora:
✅ Paquete de ${minMayor} unds: $${formatUsd(precioMayor)} ($${formatUsd(unitMayor)} c/u)
✅ Bulto Gran Mayor (${minGranMayor} unds): $${formatUsd(precioGranMayor)} ($${formatUsd(unitGranMayor)} c/u) - ¡Ahorro del ${porcentajeAhorro}%!

🛵 DELIVERY GRATIS en Caracas, Guarenas y Guatire en compras desde $50.
💳 Pagas al recibir en efectivo divisas, Pago Móvil tasa BCV o USDT.

Escríbeme al inbox o al WhatsApp para enviarte el catálogo completo con más de 70 modelos disponibles. ¡Despachos hoy mismo!`;

    return {
      hookViral: `FOTO EN ALTA DEFINICIÓN del producto empacado con texto en rojo/amarillo: "DESDE $${formatUsd(unitGranMayor)} POR UNIDAD AL MAYOR"`,
      problemaEnganche: "Dueños de negocios locales en Caracas y Miranda buscando suministro confiable sin pagar precios inflados.",
      desarrolloAccion: "Publicación en grupos de emprendedores y Marketplace de Caracas / Guarenas con precios claros y fotos reales.",
      llamadaAccion: "Envía un mensaje privado para coordinar tu entrega hoy mismo con delivery gratis.",
      copyCompleto: copyFB,
      formatoRecomendado: "Publicación Marketplace",
      tipoEnfoque: "Venta Mayorista Local",
    };
  }

  // ─────────────────────────────────────────────────────────────
  // 3. GENERACIÓN PARA INSTAGRAM HISTORIAS (4 al día)
  // ─────────────────────────────────────────────────────────────
  if (isHistoria) {
    const storyThemes = [
      {
        nombre: "Apertura & Disponibilidad Inmediata",
        hook: `¡Buenos días emprendedores! Arrancamos el día surtiendo ${product.nombre}. Tasa oficial BCV activa hoy.`,
        visual: `Video en primer plano de 5 segundos abriendo el paquete de ${product.nombre} con buena luz natural.`,
        sticker: `Sticker de Encuesta: "¿Ya tienes tu inventario de empaques listo para la semana? (¡Sí, listo! / Me falta surtir)"`,
        cta: `Sticker con Enlace directo a sumilisto.com/producto/${product.slug || ""}`,
        copy: `🔥 Suministro activo: ${product.nombre}\nDesde $${formatUsd(unitGranMayor)} la unidad al Gran Mayor.\n\nToca el sticker de enlace para ver todas las medidas o responder esta historia para apartar tu pedido con delivery en Caracas y Guarenas-Guatire.`,
      },
      {
        nombre: "Prueba Social / Pedido en Ruta",
        hook: `Otro pedido de ${product.nombre} saliendo hoy para cliente en Caracas 🛵📦`,
        visual: `Tomas de 3 segundos etiquetando la caja del pedido y cargando el transporte de despacho. Sonido real de embalaje.`,
        sticker: `Caja de preguntas o botón interactivo: "¿A qué zona de Caracas necesitas que te llevemos tus empaques?"`,
        cta: `Responde a esta historia con la palabra "QUIERO" y un asesor te atiende al instante.`,
        copy: `Despachando pedidos sin parar. Recuerda que en pedidos de más de $50 el delivery es GRATIS.\n\nEscríbenos al DM para incluirte en la ruta de despacho de hoy.`,
      },
      {
        nombre: "Comparativa Rápida / Trivia de Negocio",
        hook: `¿Cuánto te cuesta empacar con ${product.nombre}? Te sorprendería lo barato que sale al Gran Mayor 👇`,
        visual: `Gráfico en sticker o texto gigante sobre la foto: "$${formatUsd(unitGranMayor)} por unidad. Menos de lo que imaginas."`,
        sticker: `Sticker de escala de reacciones con fuego 🔥 o votación interactiva.`,
        cta: `Desliza arriba o escribe al DM para pedir la escala de precios completa.`,
        copy: `El secreto de los negocios rentables no es vender más caro, es comprar suministros con mejor margen.\n\nEnlace al catálogo completo en nuestra biografía.`,
      },
      {
        nombre: "Cierre de Pedidos & Delivery GRATIS",
        hook: `Último llamado para despachos de hoy: ${product.nombre} con stock para entrega inmediata.`,
        visual: `Foto nítida del producto terminado listo para entregar con sello verde de "Delivery GRATIS en compras +$50".`,
        sticker: `Sticker de cuenta regresiva: "Ruta de hoy cierra a las 02:00 PM"`,
        cta: `Haz click en el enlace del sticker y asegura tus paquetes antes de que se agote la zafra de hoy.`,
        copy: `¡No te quedes sin stock para tu negocio! Escríbenos directamente al WhatsApp para apartar tus bultos hoy mismo.`,
      },
    ];

    const chosenStory = storyThemes[seedIndex % storyThemes.length];

    return {
      hookViral: `[0-3 seg] ${chosenStory.visual}\nTexto en pantalla: "${chosenStory.hook}"`,
      problemaEnganche: `Neuromarketing de inmediatez y prueba social: ver pedidos saliendo en vivo activa el deseo de comprar y no quedarse sin stock.`,
      desarrolloAccion: `Historia vertical 9:16 dinámica. ${chosenStory.visual}\nIncluye ${chosenStory.sticker}.`,
      llamadaAccion: chosenStory.cta,
      copyCompleto: chosenStory.copy,
      formatoRecomendado: "Historia Interactiva 24h",
      tipoEnfoque: chosenStory.nombre,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // 4. GENERACIÓN PARA INSTAGRAM REELS & POSTS (6 al día)
  // Reglas: Directo, Simple, Universal de interés común, Hook 3s
  // ─────────────────────────────────────────────────────────────
  const reelsAngles = [
    // Ángulo A: Desglose de Costo Real & Rentabilidad (Neuro: Miedo a perder dinero)
    {
      tipoEnfoque: "Desglose de Costo Real (Rentabilidad)",
      hook: `¿Cuánto te cuesta realmente empacar tu comida? Estás perdiendo dinero sin darte cuenta.`,
      visualHook: `Sostienes ${product.nombre} en una mano. En la otra una libreta o calculadora. Texto gigante en pantalla: "EL ERROR DE $40/MES EN TU EMPAQUE".`,
      enganche: `El 80% de los emprendedores calculan mal el costo del empaque porque compran al detal en la calle a sobreprecio, en vez de asegurar el bulto al Gran Mayor.`,
      desarrollo: `1. (0-3s) Hook visual con calculadora y el empaque en mesa.\n2. (3-8s) Muestra el producto: "${product.nombre}". Explicas: "Si compras por unidad te cobran carísimo. Pero al Gran Mayor con Sumilisto cada uno te sale en tan solo $${formatUsd(unitGranMayor)}".\n3. (8-15s) Tomas rápidas de 1.5s mostrando la resistencia, el cierre perfecto y lo profesional que se ve tu comida adentro.\n4. (15-20s) Edición rápida con sonido crujiente al abrir o cerrar. Cero relleno.`,
      cta: `Comenta "COSTO" y te enviamos por DM la escala de precios mayoristas con delivery gratis. ¡Síguenos para más consejos de rentabilidad para tu negocio!`,
      copy: `¿Cuánto estás pagando por tus empaques actualmente? 👇\n\nSi tienes un negocio gastronómico o de repostería, cada centavo que ahorras en suministros se convierte en ganancia neta en tu bolsillo.\n\nCon ${product.nombre}:\n✅ Al Mayor (desde ${minMayor} und): $${formatUsd(precioMayor)} ($${formatUsd(unitMayor)} c/u)\n🔥 Al Gran Mayor (desde ${minGranMayor} und): $${formatUsd(precioGranMayor)} ($${formatUsd(unitGranMayor)} c/u)\n\n🛵 DELIVERY GRATIS en Caracas, Guarenas y Guatire en compras mayores a $50.\n\n👉 Comenta "PRECIOS" o escríbenos al link del perfil para pedir tu pedido hoy.\n\n#empaquesvenezuela #sumilisto #reposteriacaracas #comidarapidacaracas #emprendedoresvenezuela #deliverycaracas`,
    },

    // Ángulo B: Test de Resistencia Extremo (Neuro: Seguridad y Cero Reclamos en Delivery)
    {
      tipoEnfoque: "Test de Resistencia Extremo en Vivo",
      hook: `Si tu empaque no aguanta esta prueba, tus clientes no van a volver a pedir delivery.`,
      visualHook: `Llenas ${product.nombre} con producto real o agua/peso, lo cierras con un 'CLAC' sonoro y lo volteas boca abajo o le pones peso encima. Texto: "PRUEBA DE FUEGO: ¿SE ABRE O NO?".`,
      enganche: `El cliente perdona un delivery demorado, pero NUNCA perdona que su pedido llegue chorreado, aplastado o frío. Un mal empaque destruye la reputación de tu marca.`,
      desarrollo: `1. (0-3s) Impacto visual: agitar o presionar el empaque cerrado. Cero fugas.\n2. (3-10s) Diálogo directo: "Mira la rigidez de ${product.nombre}. Tapa hermética y material de grado alimenticio que protege tu producto en el traslado en moto".\n3. (10-18s) Tomas en macro mostrando las esquinas, la terminación y cómo luce presentado listo para un cliente.\n4. (18-25s) Demostración de apertura fácil y limpia sin romperse.`,
      cta: `Guarda este video para tu próxima compra de insumos y dale click al enlace de nuestro perfil para surtirte con garantía. ¡Síguenos para ver más pruebas reales!`,
      copy: `Tu comida puede ser la más rica de la ciudad, pero si el empaque falla en el camino, perdiste un cliente para siempre 🛵📦\n\n${product.nombre} está fabricado para aguantar la ruta del delivery más exigente:\n🛡️ Cierre seguro y material firme\n📐 Calidad y presentación impecable\n📦 Desde $${formatUsd(unitGranMayor)} al Gran Mayor\n\n🛵 Envío GRATIS en Caracas y Guarenas-Guatire en compras desde $50.\n\n¿Quieres probarlos en tu negocio? Escríbenos al WhatsApp en el enlace del perfil.\n\n#deliveryvenezuela #empaquesalmayor #restaurantescaracas #suministros #calidadsumilisto`,
    },

    // Ángulo C: Psicología de la Presentación & Valor Percibido (Neuro: Estatus y cobrar más)
    {
      tipoEnfoque: "Valor Percibido: ¿Por qué pagar el doble?",
      hook: `¿Por qué un cliente paga $3 por esto... pero pagaría $7 por exactamente el mismo producto aquí?`,
      visualHook: `Pantalla dividida o comparación lado a lado: a la izquierda comida en empaque genérico opaco; a la derecha en ${product.nombre}. Texto: "$3 VS $7 (MISMO PRODUCTO)".`,
      enganche: `El cerebro humano compra con los ojos. El 70% de la percepción de sabor y calidad de un postre o comida depende de cómo se ve empacado antes de probarlo.`,
      desarrollo: `1. (0-3s) Comparativa inmediata antes y después. El contraste visual es evidente.\n2. (3-9s) Explicación simple: "La diferencia no fue la receta, fue el empaque. ${product.nombre} convierte un producto ordinario en un regalo premium que justifica un precio mayor".\n3. (9-16s) Colocación de la comida adentro, cierre elegante, presentación con etiqueta o lazo.\n4. (16-22s) El resultado final luce de vitrina de alta pastelería o restaurante top.`,
      cta: `¿Quieres elevar el valor de tus creaciones? Síguenos para no perderte nuestras zafras y escríbenos al DM para cotizar tu pedido hoy mismo.`,
      copy: `La presentación no es un gasto, es la herramienta que te permite cobrar lo que realmente vale tu trabajo 💎✨\n\nCon ${product.nombre} tus clientes notan la diferencia desde el primer segundo:\n✨ Acabado limpio y profesional\n✨ Mayor confianza y valor percibido\n✨ Precio al Gran Mayor que cuida tu ganancia\n\n🛵 DELIVERY GRATIS en pedidos de más de $50 en Caracas, Guarenas y Guatire.\n\n👉 Guarda este post y visita sumilisto.com para ver todas las presentaciones disponibles.\n\n#reposterosdevenezuela #pasteleriacaracas #empaquespremium #valorpercibido #sumilisto`,
    },

    // Ángulo D: Detrás de Cámara / ASMR Almacén (Neuro: Prueba Social & Confianza)
    {
      tipoEnfoque: "Detrás de Cámara / ASMR Almacén y Despacho",
      hook: `Empacando 300 unidades de ${product.nombre} para un negocio en Caracas 📦💨`,
      visualHook: `Primer plano con sonido nítido: cinta de embalar cortándose, conteo rápido de paquetes y apilado impecable en caja de despacho. Texto: "DESPACHANDO PEDIDO MAYORISTA".`,
      enganche: `La prueba social instantánea: cuando la gente ve que otros negocios están comprando este producto en grandes cantidades todos los días, el cerebro asume que es la mejor opción.`,
      desarrollo: `1. (0-3s) Audio ASMR fuerte y satisfactorio de empaque.\n2. (3-8s) Tomas rápidas de los estantes organizados y cómo se revisa cada paquete antes de salir para garantizar cero defectos.\n3. (8-15s) Ficha rápida del producto en pantalla con precio unitario al mayor y medidas.\n4. (15-20s) Caja lista y sellada para el motorizado de la ruta del día.`,
      cta: `¿Necesitas suministros para este fin de semana? Escríbenos antes de las 11 AM para salir en la ruta de hoy. ¡Síguenos para conocer todo el stock disponible!`,
      copy: `¡Así se mueve el almacén de Sumilisto todos los días! 📦⚡\n\nDespachando ${product.nombre} para nuestros clientes en Caracas.\n\n¿Por qué tantos negocios confían en nosotros?\n🚚 Entregas puntuales el mismo día\n🛵 Delivery GRATIS en compras mayores a $50\n💰 Precios reales de distribuidor directo al mayor y gran mayor\n\nEscríbenos al enlace de la bio y haz tu pedido en menos de 3 minutos.\n\n#sumilisto #almacencaracas #distribuidora #empaquesalmayor #comprasinteligentes`,
    },

    // Ángulo E: Mayor vs Gran Mayor (Neuro: El placer de ahorrar y maximizar ganancia)
    {
      tipoEnfoque: "Mayor vs Gran Mayor: Matemáticas de Negocio",
      hook: `Deja de comprar por docena suelta. Te explico cómo ahorrar un ${porcentajeAhorro}% en tus empaques.`,
      visualHook: `Pones dos pilas de productos: una pequeña de ${minMayor} y una grande de ${minGranMayor}. Letrero en pantalla: "COMPRA INTELIGENTE VS COMPRA TRADICIONAL".`,
      enganche: `Los negocios que crecen rápido no tienen recetas secretas: compran insumos por bulto cerrado y reinvierten la diferencia en su propia operación.`,
      desarrollo: `1. (0-3s) Hook verbal directo con las dos pilas en mesa.\n2. (3-10s) Matemáticas transparentes en pantalla: "Al mayor compras desde ${minMayor} und a $${formatUsd(unitMayor)} c/u. Pero si compras ${minGranMayor} al Gran Mayor te queda en $${formatUsd(unitGranMayor)} c/u. Te ahorras $${formatUsd(ahorroUnitario)} por cada pieza".\n3. (10-18s) Multiplica ese ahorro por 200 o 500 ventas al mes: es dinero directo a tu bolsillo.\n4. (18-24s) Muestra el bulto cerrado listo para llevar.`,
      cta: `Comparte este reel con tu socio o amiga emprendedora y comenta "ESCALA" para pasarte el catálogo con precios por bulto cerrado. ¡Síguenos para potenciar tu negocio!`,
      copy: `Las cuentas claras mantienen los negocios abiertos y rentables 📊💡\n\nNo compres por comprar, aprovecha nuestra escala de Gran Mayor:\n📦 ${product.nombre}\n• Escala Mayor: desde ${minMayor} unidades a $${formatUsd(precioMayor)}\n• Escala Gran Mayor: desde ${minGranMayor} unidades a $${formatUsd(precioGranMayor)}\n\n💡 Ese ahorro del ${porcentajeAhorro}% es ganancia limpia para ti.\n\n🛵 Recuerda: En compras mayores a $50 tu delivery es totalmente GRATIS en Caracas, Guarenas y Guatire.\n\n👉 Escríbenos al WhatsApp en el link del perfil para cotizar tu bulto hoy.\n\n#finanzasparanegocios #empaquescaracas #ahorromayorista #emprendimientovenezuela #sumilisto`,
    },

    // Ángulo F: Alerta de Zafra / No te quedes sin stock (Neuro: Urgencia y FOMO)
    {
      tipoEnfoque: "Alerta de Stock & Zafra de Temporada",
      hook: `Si esperas a última hora para comprar esto, te vas a quedar sin stock para tus entregas.`,
      visualHook: `Tomas rápidas mostrando la alta demanda de ${product.nombre}. Texto en pantalla con alerta amarilla: "PRODUCTO DE ALTA ROTACIÓN: ASEGURA EL TUYO".`,
      enganche: `En temporadas altas o fines de semana los suministros clave se agotan rápido en toda la ciudad. Quien no tiene empaque a tiempo, pierde pedidos y clientes.`,
      desarrollo: `1. (0-3s) Hook de urgencia con el producto en mano.\n2. (3-9s) Explicación: "Estamos en semana fuerte de pedidos y ${product.nombre} está volando. No esperes al viernes para darte cuenta de que no tienes dónde empacar".\n3. (9-16s) Muestra la versatilidad del producto, cómo se almacena fácil y el espacio que ahorra al venir apilable.\n4. (16-22s) Llamado a apartar con anticipación a precio congelado.`,
      cta: `Haz tu pedido ahora antes de que se cierre la ruta de despacho. Dale click al enlace en el perfil o escríbenos directo al DM. ¡Síguenos para estar al día con el stock!`,
      copy: `¡No dejes tus entregas para última hora! 🚨📦\n\n${product.nombre} es uno de nuestros productos con mayor rotación por su excelente relación calidad-precio.\n\n✅ Stock disponible para entrega inmediata\n✅ Escala de precio al Mayor y Gran Mayor\n✅ Delivery GRATIS en pedidos de más de $50 en Caracas, Guarenas y Guatire\n\n👉 Contáctanos hoy mismo por WhatsApp en el enlace de la bio y asegura tus cajas/paquetes.\n\n#suministrosurgentes #empaquesrapidos #deliverycaracas #sumilisto #emprendedoresvenezolanos`,
    },
  ];

  const chosenAngle = reelsAngles[seedIndex % reelsAngles.length];

  return {
    hookViral: `[0-3 seg] ${chosenAngle.visualHook}\nAudio / Qué decir: "${chosenAngle.hook}"`,
    problemaEnganche: chosenAngle.enganche,
    desarrolloAccion: chosenAngle.desarrollo,
    llamadaAccion: chosenAngle.cta,
    copyCompleto: chosenAngle.copy,
    formatoRecomendado: "Reel Dinámico (15-25 seg) / Carrusel",
    tipoEnfoque: chosenAngle.tipoEnfoque,
  };
}
