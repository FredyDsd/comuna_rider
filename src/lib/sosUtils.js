export const SOS_TTL_MS = 90 * 60 * 1000;
export const SEEN_SOS_STORAGE_KEY = 'comuna_rider_seen_sos_ids_v1';
export const LAST_LOCAL_SOS_KEY = 'comuna_rider_last_local_sos_v1';

/**
 * Parsea una fila SOS de `public.alerts` (o payload local) y devuelve null si ya expiró.
 */
export function parseSosAlertRow(row) {
  if (!row) return null;
  if (row.category !== 'sos' && row.type !== 'sos' && row.subType !== 'sos') {
    return null;
  }

  let parsed = {};
  if (typeof row.extra === 'string' && row.extra.trim().startsWith('{')) {
    try {
      parsed = JSON.parse(row.extra);
    } catch {
      parsed = {};
    }
  } else if (row.extra && typeof row.extra === 'object') {
    parsed = row.extra;
  }

  const createdMs = row.created_at ? new Date(row.created_at).getTime() : Date.now();
  const expiresAt =
    typeof parsed.expiresAt === 'number'
      ? parsed.expiresAt
      : typeof row.expiresAt === 'number'
      ? row.expiresAt
      : createdMs + SOS_TTL_MS;

  if (Date.now() > expiresAt) return null;

  return {
    id: row.id,
    user_id: row.user_id,
    title: row.title || 'Emergencia SOS Rider',
    description: row.description || row.desc || '',
    badge: row.badge || '🚨 AUXILIO SOS',
    urgency: parsed.urgency || row.urgency || 'mecanico',
    phone: parsed.phone ?? row.phone ?? '',
    time: parsed.eventTime || row.time || 'Reciente',
    zone: parsed.address || row.zone || 'Jujuy',
    isRealGps: Boolean(parsed.isRealGps ?? row.isRealGps),
    lat: typeof row.lat === 'number' ? row.lat : -24.1858,
    lng: typeof row.lng === 'number' ? row.lng : -65.2995,
    helpers: Array.isArray(parsed.helpers)
      ? parsed.helpers
      : Array.isArray(row.helpers)
      ? row.helpers
      : [],
    confirmCount: row.confirm_count ?? row.confirmCount ?? 1,
    expiresAt,
    createdAt: row.created_at || new Date(createdMs).toISOString(),
  };
}

export function getSeenSosIds() {
  try {
    const raw = localStorage.getItem(SEEN_SOS_STORAGE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function markSosIdAsSeen(sosId) {
  if (!sosId) return;
  try {
    const current = getSeenSosIds();
    if (!current.includes(sosId)) {
      const updated = [sosId, ...current].slice(0, 60);
      localStorage.setItem(SEEN_SOS_STORAGE_KEY, JSON.stringify(updated));
    }
  } catch {
    // Ignora errores de localStorage
  }
}

export function buildSosShareWhatsappUrl(sos) {
  const mapsLink = `https://maps.google.com/?q=${sos.lat},${sos.lng}`;
  const msg =
    `🚨 *SOS CADETE JUJUY* (${sos.time || ''})\n` +
    `👤 *${sos.title}*\n` +
    `📋 ${sos.description || ''}\n` +
    `📍 *Zona:* ${sos.zone || 'Jujuy'}\n` +
    (sos.phone ? `📱 *WhatsApp:* ${sos.phone}\n` : '') +
    `🗺️ *Ubicación exacta:* ${mapsLink}`;
  return `https://wa.me/?text=${encodeURIComponent(msg)}`;
}
