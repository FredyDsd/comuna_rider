import { createHash } from 'node:crypto';

// Vercel Serverless Function: GET /api/noticias
// Obtiene noticias automáticas y gratuitas desde Google News RSS (Argentina)
// enfocadas en plataformas de delivery, combustible y tránsito/clima en Jujuy.

const NEWS_FEEDS = [
  {
    id: 'plataformas',
    defaultCategory: 'plataformas',
    query:
      '(PedidosYa OR Rappi OR "Uber Eats" OR "repartidores de aplicaciones" OR "trabajadores de reparto" OR "ley de plataformas") Argentina when:21d',
  },
  {
    id: 'reparto',
    defaultCategory: 'plataformas',
    query:
      '(delivery OR repartidores OR cadetes OR motoqueros) (tarifas OR paro OR reclamo OR seguro OR app OR pedidos) Argentina when:21d',
  },
  {
    id: 'nafta',
    defaultCategory: 'nafta',
    query:
      '(nafta OR combustibles OR YPF OR "precio de la nafta" OR "aumento de combustibles") Argentina when:14d',
  },
  {
    id: 'jujuy',
    defaultCategory: 'jujuy',
    query:
      '("San Salvador de Jujuy" OR Jujuy) (tránsito OR corte OR lluvia OR tormenta OR alerta OR combustible OR motos OR delivery) when:7d',
  },
];

const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 días
const MAX_PER_FEED = 12;
const MAX_TOTAL_ITEMS = 36;

const ENTITY_MAP = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

export function decodeHtmlEntities(str = '') {
  return String(str)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      const code = parseInt(hex, 16);
      return Number.isNaN(code) ? '' : String.fromCodePoint(code);
    })
    .replace(/&#(\d+);/g, (_, dec) => {
      const code = parseInt(dec, 10);
      return Number.isNaN(code) ? '' : String.fromCodePoint(code);
    })
    .replace(/&([a-zA-Z]+);/g, (match, name) => ENTITY_MAP[name.toLowerCase()] ?? match)
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTag(block, tagName) {
  const regex = new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  const match = block.match(regex);
  return match ? decodeHtmlEntities(match[1]) : '';
}

function normalizeForKey(str = '') {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function classifyNewsCategory(title = '', source = '', fallbackCategory = 'plataformas') {
  const text = normalizeForKey(`${title} ${source}`);

  const isPlatform =
    /\b(pedidosya|pedidos ya|rappi|uber eats|ubereats|repartidor|repartidores|delivery|cadete|cadetes|ley de plataformas|app de reparto|apps de reparto|aplicaciones de reparto|glovo|cabify envios)\b/.test(
      text
    );
  if (isPlatform) return 'plataformas';

  const isJujuy =
    /\b(jujuy|jujeno|jujena|palpala|alto comedero|san salvador|chijra|cuyaya|los perales|tilcara|humahuaca|perico|todojujuy|el tribuno de jujuy|somos jujuy)\b/.test(
      text
    );
  if (isJujuy) return 'jujuy';

  const isFuel =
    /\b(nafta|combustible|combustibles|ypf|shell|axion|puma energy|surtidor|surtidores|gasoil|infinia|super)\b/.test(
      text
    );
  if (isFuel) return 'nafta';

  return fallbackCategory;
}

export function parseRssItems(xml = '', defaultCategory = 'plataformas') {
  if (!xml || typeof xml !== 'string') return [];

  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const rawTitle = extractTag(block, 'title');
    const link = extractTag(block, 'link');
    const pubDateRaw = extractTag(block, 'pubDate');
    const sourceTag = extractTag(block, 'source');

    if (!rawTitle || !link) continue;

    let title = rawTitle;
    let source = sourceTag;

    // Google News suele concatenar "Titular - Nombre del Medio" al final del <title>
    if (source) {
      const suffix = ` - ${source}`;
      if (title.endsWith(suffix)) {
        title = title.slice(0, -suffix.length).trim();
      }
    } else {
      const lastDash = title.lastIndexOf(' - ');
      if (lastDash > 20) {
        source = title.slice(lastDash + 3).trim();
        title = title.slice(0, lastDash).trim();
      }
    }

    if (!title) continue;

    const parsedDate = pubDateRaw ? new Date(pubDateRaw) : null;
    const publishedMs =
      parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate.getTime() : 0;

    if (!publishedMs || Date.now() - publishedMs > MAX_AGE_MS) continue;

    const category = classifyNewsCategory(title, source, defaultCategory);

    const hash = createHash('sha1').update(link).digest('hex').slice(0, 14);

    items.push({
      id: `${category}-${hash}`,
      title,
      link,
      source: source || 'Google News AR',
      category,
      publishedAt: new Date(publishedMs).toISOString(),
      publishedMs,
    });

    if (items.length >= MAX_PER_FEED) break;
  }

  return items;
}

function buildGoogleNewsRssUrl(query) {
  const params = new URLSearchParams({
    q: query,
    hl: 'es-419',
    gl: 'AR',
    ceid: 'AR:es-419',
  });
  return `https://news.google.com/rss/search?${params.toString()}`;
}

export async function fetchRiderNews() {
  const results = await Promise.allSettled(
    NEWS_FEEDS.map(async (feed) => {
      const url = buildGoogleNewsRssUrl(feed.query);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 7500);
      try {
        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'ComunaRiderJujuy/1.0 (+https://comunarider.vercel.app)',
            Accept: 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
          },
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status} en feed ${feed.id}`);
        }
        const xml = await response.text();
        return parseRssItems(xml, feed.defaultCategory);
      } finally {
        clearTimeout(timer);
      }
    })
  );

  const combined = [];
  let feedsSucceeded = 0;

  for (const res of results) {
    if (res.status === 'fulfilled') {
      feedsSucceeded += 1;
      combined.push(...res.value);
    }
  }

  // Deduplicar por enlace y por prefijo de título normalizado
  const seenLinks = new Set();
  const seenTitles = new Set();
  const unique = [];

  // Ordenamos primero por fecha descendente antes de deduplicar
  combined.sort((a, b) => b.publishedMs - a.publishedMs);

  for (const item of combined) {
    const titleKey = normalizeForKey(item.title).slice(0, 64);
    if (seenLinks.has(item.link) || (titleKey && seenTitles.has(titleKey))) {
      continue;
    }
    seenLinks.add(item.link);
    if (titleKey) seenTitles.add(titleKey);
    unique.push({
      id: item.id,
      title: item.title,
      link: item.link,
      source: item.source,
      category: item.category,
      publishedAt: item.publishedAt,
    });
    if (unique.length >= MAX_TOTAL_ITEMS) break;
  }

  return {
    items: unique,
    feedsSucceeded,
    totalFeeds: NEWS_FEEDS.length,
    updatedAt: new Date().toISOString(),
  };
}

export default async function handler(req, res) {
  if (req.method && req.method !== 'GET') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }

  try {
    const data = await fetchRiderNews();
    // Caché en CDN de Vercel: 30 min fresco + 60 min stale-while-revalidate
    res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=3600');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(200).json(data);
  } catch (err) {
    res.status(502).json({
      items: [],
      error: err?.message || 'No se pudieron obtener las noticias en este momento.',
      updatedAt: new Date().toISOString(),
    });
  }
}
