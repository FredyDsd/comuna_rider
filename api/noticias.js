import { createHash } from 'node:crypto';

// Vercel Serverless Function: GET /api/noticias
// Obtiene hasta 7 noticias curadas y enriquecidas con previsualización real del portal
// (imagen og:image, bajada og:description, favicon y URL directa del medio) desde Google News RSS AR.

const NEWS_FEEDS = [
  {
    id: 'plataformas',
    defaultCategory: 'plataformas',
    targetCount: 3,
    query:
      '(PedidosYa OR Rappi OR "repartidores" OR "delivery" OR "ley de plataformas") (reparto OR tarifas OR app OR pedidos OR trabajadores OR reclamo OR paro OR delivery) Argentina when:21d',
  },
  {
    id: 'nafta',
    defaultCategory: 'nafta',
    targetCount: 2,
    query:
      '("precio de la nafta" OR "aumento de nafta" OR "aumento de combustibles" OR "nafta YPF" OR "surtidores") Argentina when:14d -acciones -bolsa -cotizacion -merval',
  },
  {
    id: 'jujuy',
    defaultCategory: 'jujuy',
    targetCount: 2,
    query:
      '("San Salvador de Jujuy" OR Jujuy) (tránsito OR corte OR lluvia OR tormenta OR alerta OR combustible OR motos) when:7d',
  },
];

const MAX_AGE_MS = 21 * 24 * 60 * 60 * 1000; // 21 días
const MAX_CANDIDATES_PER_FEED = 8;
const MAX_ENRICH_CANDIDATES = 12;
const MAX_FINAL_ITEMS = 7;

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

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

function extractSourceUrl(block) {
  const match = block.match(/<source[^>]+url=["']([^"']+)["']/i);
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

function isLowQualityFinanceSpam(title = '', source = '') {
  const text = normalizeForKey(`${title} ${source}`);
  return (
    /\b(precio de acciones|cotizacion e historial|ypfd ba|yahoo finanzas|investing com|tradingview|marketscreener|cedear|wall street|adr de ypf|bonos argentinos)\b/.test(
      text
    ) || /^yahoo$/i.test(source.trim())
  );
}

export function classifyNewsCategory(title = '', source = '', fallbackCategory = 'plataformas') {
  const text = normalizeForKey(`${title} ${source}`);

  const isPlatform =
    /\b(pedidosya|pedidos ya|rappi|uber eats|ubereats|repartidor|repartidores|delivery|cadete|cadetes|ley de plataformas|app de reparto|apps de reparto|aplicaciones de reparto)\b/.test(
      text
    );
  if (isPlatform) return 'plataformas';

  const isJujuy =
    /\b(jujuy|jujeno|jujena|palpala|alto comedero|san salvador|chijra|cuyaya|los perales|tilcara|humahuaca|perico|todojujuy|el tribuno de jujuy|somos jujuy)\b/.test(
      text
    );
  if (isJujuy) return 'jujuy';

  const isFuel =
    /\b(nafta|combustible|combustibles|ypf|shell|axion|puma energy|surtidor|surtidores|gasoil|infinia)\b/.test(
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
    const sourceUrl = extractSourceUrl(block);

    if (!rawTitle || !link) continue;

    let title = rawTitle;
    let source = sourceTag;

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

    if (!title || isLowQualityFinanceSpam(title, source)) continue;

    const parsedDate = pubDateRaw ? new Date(pubDateRaw) : null;
    const publishedMs =
      parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate.getTime() : 0;

    if (!publishedMs || Date.now() - publishedMs > MAX_AGE_MS) continue;

    const category = classifyNewsCategory(title, source, defaultCategory);
    const hash = createHash('sha1').update(link).digest('hex').slice(0, 14);

    let domain = '';
    try {
      if (sourceUrl) {
        domain = new URL(sourceUrl).hostname.replace(/^www\./, '');
      }
    } catch {
      domain = '';
    }

    items.push({
      id: `${category}-${hash}`,
      title,
      link,
      source: source || domain || 'Portal de Noticias',
      sourceUrl,
      domain,
      category,
      publishedAt: new Date(publishedMs).toISOString(),
      publishedMs,
    });

    if (items.length >= MAX_CANDIDATES_PER_FEED) break;
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

async function fetchWithTimeout(url, options = {}, timeoutMs = 4200) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function decodeGoogleNewsUrl(googleUrl) {
  const artId = googleUrl?.split('/articles/')[1]?.split('?')[0];
  if (!artId) return googleUrl;

  try {
    const pageRes = await fetchWithTimeout(
      `https://news.google.com/articles/${artId}`,
      { headers: { 'User-Agent': BROWSER_UA } },
      3500
    );
    if (!pageRes.ok) return googleUrl;
    const html = await pageRes.text();

    const sig = html.match(/data-n-a-sg="([^"]+)"/)?.[1];
    const ts = html.match(/data-n-a-ts="([^"]+)"/)?.[1];
    if (!sig || !ts) return googleUrl;

    const payload = [
      [
        [
          'Fbv4je',
          JSON.stringify([
            'garturlreq',
            [
              ['X', 'X', ['X', 'X'], null, null, 1, 1, 'ES:es', null, 1, null, null, null, null, null, 0, 1],
              'X',
              'X',
              1,
              [1, 1, 1],
              1,
              1,
              null,
              0,
              0,
              null,
              0,
            ],
            artId,
            Number(ts),
            sig,
          ]),
          null,
          'generic',
        ],
      ],
    ];

    const batchRes = await fetchWithTimeout(
      'https://news.google.com/_/DotsSplashUi/data/batchexecute',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          'User-Agent': BROWSER_UA,
        },
        body: `f.req=${encodeURIComponent(JSON.stringify(payload))}`,
      },
      3500
    );

    if (!batchRes.ok) return googleUrl;
    const text = await batchRes.text();
    const jsonLine = text.split('\n').find((line) => line.includes('garturlres'));
    if (!jsonLine) return googleUrl;

    const outer = JSON.parse(jsonLine);
    const inner = JSON.parse(outer?.[0]?.[2] || '[]');
    const resolved = inner?.[1];
    if (typeof resolved === 'string' && resolved.startsWith('http')) {
      return resolved;
    }
  } catch {
    // Mantiene URL original si falla la decodificación
  }

  return googleUrl;
}

function extractMetaContent(html, attrNames) {
  for (const attr of attrNames) {
    const escaped = attr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const r1 = new RegExp(
      `<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["']`,
      'i'
    );
    const m1 = html.match(r1);
    if (m1?.[1]) return decodeHtmlEntities(m1[1]);

    const r2 = new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["']`,
      'i'
    );
    const m2 = html.match(r2);
    if (m2?.[1]) return decodeHtmlEntities(m2[1]);
  }
  return '';
}

function resolveAbsoluteUrl(candidate, baseUrl) {
  if (!candidate) return '';
  try {
    const abs = new URL(candidate, baseUrl).toString();
    if (!abs.startsWith('http://') && !abs.startsWith('https://')) return '';
    // Evitar íconos diminutos o tracking pixels genéricos
    if (/(favicon|logo-placeholder|pixel|1x1)/i.test(abs)) return '';
    return abs;
  } catch {
    return '';
  }
}

async function enrichArticlePreview(item) {
  const realUrl = await decodeGoogleNewsUrl(item.link);

  let domain = item.domain;
  try {
    const parsed = new URL(realUrl);
    if (!parsed.hostname.includes('news.google.com')) {
      domain = parsed.hostname.replace(/^www\./, '');
    }
  } catch {
    // Mantiene domain previo
  }

  const favicon = domain
    ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`
    : '';

  let image = '';
  let description = '';

  if (realUrl && !realUrl.includes('news.google.com')) {
    try {
      const artRes = await fetchWithTimeout(
        realUrl,
        {
          headers: {
            'User-Agent': BROWSER_UA,
            Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'es-AR,es;q=0.9',
          },
          redirect: 'follow',
        },
        3800
      );

      if (artRes.ok) {
        // Leemos solo el head/primeros 45KB para ir muy rápido
        const rawHtml = (await artRes.text()).slice(0, 45000);
        const rawImg = extractMetaContent(rawHtml, [
          'og:image',
          'og:image:secure_url',
          'twitter:image',
          'twitter:image:src',
        ]);
        const rawDesc = extractMetaContent(rawHtml, [
          'og:description',
          'twitter:description',
          'description',
        ]);

        image = resolveAbsoluteUrl(rawImg, realUrl);
        if (rawDesc && rawDesc.length > 25 && normalizeForKey(rawDesc) !== normalizeForKey(item.title)) {
          description = rawDesc.length > 180 ? `${rawDesc.slice(0, 177).trim()}...` : rawDesc;
        }
      }
    } catch {
      // Si un portal bloquea o demora, sigue funcionando sin romper el resto
    }
  }

  return {
    id: item.id,
    title: item.title,
    link: realUrl || item.link,
    source: item.source,
    domain: domain || item.source,
    favicon,
    image: image || null,
    description: description || null,
    category: item.category,
    publishedAt: item.publishedAt,
    publishedMs: item.publishedMs,
  };
}

export async function fetchRiderNews() {
  const results = await Promise.allSettled(
    NEWS_FEEDS.map(async (feed) => {
      const url = buildGoogleNewsRssUrl(feed.query);
      const response = await fetchWithTimeout(
        url,
        {
          headers: {
            'User-Agent': 'ComunaRiderJujuy/1.0 (+https://comunarider.vercel.app)',
            Accept: 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
          },
        },
        6000
      );
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} en feed ${feed.id}`);
      }
      const xml = await response.text();
      return {
        feedId: feed.id,
        targetCount: feed.targetCount,
        items: parseRssItems(xml, feed.defaultCategory),
      };
    })
  );

  // Deduplicar y seleccionar un pool balanceado de candidatos (máx 12) para enriquecer en paralelo
  const seenLinks = new Set();
  const seenTitles = new Set();
  const buckets = { plataformas: [], nafta: [], jujuy: [] };
  let feedsSucceeded = 0;

  for (const res of results) {
    if (res.status !== 'fulfilled') continue;
    feedsSucceeded += 1;
    const sorted = [...res.value.items].sort((a, b) => b.publishedMs - a.publishedMs);
    for (const item of sorted) {
      const titleKey = normalizeForKey(item.title).slice(0, 64);
      if (seenLinks.has(item.link) || (titleKey && seenTitles.has(titleKey))) continue;
      seenLinks.add(item.link);
      if (titleKey) seenTitles.add(titleKey);
      if (buckets[item.category]) {
        buckets[item.category].push(item);
      } else {
        buckets.plataformas.push(item);
      }
    }
  }

  // Tomamos candidatos balanceados (priorizando Plataformas, luego Jujuy y Nafta)
  const candidates = [
    ...buckets.plataformas.slice(0, 5),
    ...buckets.jujuy.slice(0, 4),
    ...buckets.nafta.slice(0, 3),
  ].slice(0, MAX_ENRICH_CANDIDATES);

  const enrichedResults = await Promise.allSettled(
    candidates.map((item) => enrichArticlePreview(item))
  );

  const enriched = enrichedResults
    .filter((r) => r.status === 'fulfilled')
    .map((r) => r.value);

  // Elegir las mejores 7 noticias: priorizar las que tienen foto real del portal (og:image) y balancear categorías
  const withImage = enriched.filter((item) => Boolean(item.image));
  const withoutImage = enriched.filter((item) => !item.image);
  const ranked = [...withImage, ...withoutImage];

  const finalItems = [];
  const chosenIds = new Set();
  const desiredQuotas = [
    { category: 'plataformas', count: 3 },
    { category: 'jujuy', count: 2 },
    { category: 'nafta', count: 2 },
  ];

  for (const quota of desiredQuotas) {
    let taken = 0;
    for (const item of ranked) {
      if (taken >= quota.count) break;
      if (item.category === quota.category && !chosenIds.has(item.id)) {
        chosenIds.add(item.id);
        finalItems.push(item);
        taken += 1;
      }
    }
  }

  // Completar hasta 7 si alguna categoría trajo menos
  for (const item of ranked) {
    if (finalItems.length >= MAX_FINAL_ITEMS) break;
    if (!chosenIds.has(item.id)) {
      chosenIds.add(item.id);
      finalItems.push(item);
    }
  }

  // Orden final por fecha más reciente (manteniendo las con foto arriba si hay empate)
  finalItems.sort((a, b) => b.publishedMs - a.publishedMs);

  const cleanItems = finalItems.slice(0, MAX_FINAL_ITEMS).map(({ publishedMs, ...rest }) => rest);

  return {
    items: cleanItems,
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
      error: err?.message || 'No se pudieron obtener las novedades en este momento.',
      updatedAt: new Date().toISOString(),
    });
  }
}
