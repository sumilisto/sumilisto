/**
 * Módulo de detección y filtrado de bots, rastreadores y tráfico de centros de datos.
 */

// Expresión regular exhaustiva para detectar rastreadores, indexadores y scripts
const BOT_PATTERNS = [
  // Motores de búsqueda principales
  "googlebot",
  "bingbot",
  "yandex",
  "baiduspider",
  "duckduckbot",
  "slurp",
  "sogou",
  "exabot",
  "teoma",
  "qwantify",
  // Redes sociales y mensajería (crawlers que generan vistas previas al compartir links)
  "facebookexternalhit",
  "facebot",
  "meta-externalagent",
  "whatsapp",
  "telegrambot",
  "twitterbot",
  "linkedinbot",
  "slackbot",
  "discordbot",
  "pinterest",
  "skypeuripreview",
  "applebot",
  // Herramientas de SEO, auditoría y scrapers
  "ahrefsbot",
  "semrushbot",
  "dotbot",
  "mj12bot",
  "petalbot",
  "screaming frog",
  "blexbot",
  "dataforseo",
  "megaindex",
  "serpstatbot",
  "bytespider",
  "zoominfobot",
  "seznambot",
  "seekport",
  "criteo",
  // Herramientas de terminal, scripts y librerías HTTP
  "curl",
  "wget",
  "python",
  "aiohttp",
  "urllib",
  "requests",
  "httpie",
  "postman",
  "insomnia",
  "go-http-client",
  "okhttp",
  "node-fetch",
  "axios",
  "java/",
  "apache-httpclient",
  "ruby",
  "php/",
  "guzzle",
  "libwww-perl",
  // Navegadores headless y automatización (Selenium, Puppeteer, etc.)
  "headlesschrome",
  "phantomjs",
  "selenium",
  "puppeteer",
  "playwright",
  "cypress",
  "webdriver",
  // Monitoreo de uptime y escáneres de salud/seguridad
  "uptimerobot",
  "pingdom",
  "statuscake",
  "feedfetcher",
  "lighthouse",
  "gtmetrix",
  "sitemonitor",
  "vercel-screenshot",
  "censysinspect",
  "shodan",
  "netcraft",
];

const BOT_REGEX = new RegExp(`(${BOT_PATTERNS.join("|")})`, "i");

const GENERIC_BOT_REGEX = /\b(bot|crawler|spider|scraper|crawl|archiver)\b/i;

/**
 * Determina si un User-Agent corresponde a un bot o script automatizado.
 */
export function isBotUserAgent(userAgent?: string | null): boolean {
  if (!userAgent || typeof userAgent !== "string") return true;
  const ua = userAgent.trim();
  if (ua.length < 10) return true; // User-Agents sospechosamente cortos o vacíos
  return BOT_REGEX.test(ua) || GENERIC_BOT_REGEX.test(ua);
}

/**
 * Evalúa si una visita almacenada o en curso califica como humana o ruido de servidor.
 */
export function isHumanTraffic(visita: {
  pais?: string | null;
  estado?: string | null;
  ciudad?: string | null;
  navegador?: string | null;
  dispositivo?: string | null;
  totalPaginasVistas?: number;
  productosVistos?: string[];
  rutasVistas?: string[];
}): boolean {
  const pais = (visita.pais || "").toLowerCase();
  const estado = (visita.estado || "").toLowerCase();
  const totalPaginas = visita.totalPaginasVistas ?? 1;
  const prodsVistos = visita.productosVistos?.length ?? 0;

  // Si navegó por varias páginas o consultó algún producto, es indiscutiblemente humano
  if (totalPaginas >= 2 || prodsVistos > 0) {
    return true;
  }

  // Si proviene de Venezuela residencial, se considera humano legítimo
  const isVenezuela = pais.includes("venezuela") || (!estado.includes("internacional") && pais !== "estados unidos");
  if (isVenezuela) {
    return true;
  }

  // Visita internacional de 1 sola página y 0 productos consultados:
  // Típico escaneo de servidor / bot en centros de datos de EE. UU.
  return false;
}
