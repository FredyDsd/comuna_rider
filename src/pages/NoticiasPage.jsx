import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import {
  parseSosAlertRow,
  buildSosShareWhatsappUrl,
  LAST_LOCAL_SOS_KEY,
  markSosIdAsSeen,
} from '../lib/sosUtils';

const ADMIN_NOTICE_BADGE = '📢 Aviso Admin';
const NEWS_CACHE_KEY = 'comuna_rider_news_cache_v2';
const NEWS_CACHE_TTL_MS = 10 * 60 * 1000; // 10 min cache local entre cambios de pestaña
const MAX_NEWS_DISPLAY = 7;

const CATEGORY_LABELS = {
  plataformas: {
    label: 'Delivery',
    dotClass: 'bg-primary',
  },
  nafta: {
    label: 'Nafta',
    dotClass: 'bg-amber-500',
  },
  jujuy: {
    label: 'Jujuy',
    dotClass: 'bg-emerald-500',
  },
};

const PRIORITY_STYLES = {
  urgente: {
    label: 'Urgente',
    icon: 'campaign',
    cardClass: 'bg-error-container/45 border-error/40',
    accentBar: 'bg-error',
    badgeClass: 'bg-error text-on-error',
  },
  importante: {
    label: 'Importante',
    icon: 'priority_high',
    cardClass: 'bg-amber-50 border-amber-300/80',
    accentBar: 'bg-amber-500',
    badgeClass: 'bg-amber-500 text-white',
  },
  info: {
    label: 'Aviso Oficial',
    icon: 'notifications_active',
    cardClass: 'bg-surface-container-lowest border-primary/25',
    accentBar: 'bg-primary',
    badgeClass: 'bg-primary-fixed text-on-primary-fixed-variant',
  },
};

const EXPIRY_OPTIONS = [
  { id: '24h', label: '24 horas', hours: 24 },
  { id: '72h', label: '3 días', hours: 72 },
  { id: '168h', label: '7 días', hours: 168 },
  { id: 'none', label: 'Sin vencimiento', hours: null },
];

function isMissingAnnouncementsTableError(error) {
  if (!error) return false;
  const code = String(error.code || '');
  const msg = String(error.message || '').toLowerCase();
  return (
    code === '42P01' ||
    code === 'PGRST205' ||
    (msg.includes('announcements') &&
      (msg.includes('does not exist') ||
        msg.includes('could not find') ||
        msg.includes('schema cache')))
  );
}

function formatRelativeTime(isoDate) {
  if (!isoDate) return '';
  const ts = new Date(isoDate).getTime();
  if (Number.isNaN(ts)) return '';
  const diffMin = Math.floor((Date.now() - ts) / 60000);
  if (diffMin < 1) return 'Recién';
  if (diffMin < 60) return `Hace ${diffMin} min`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `Hace ${diffHours} h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return `Hace ${diffDays} días`;
  return new Date(ts).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
  });
}

function parseAlertNotice(row) {
  let parsed = {};
  try {
    parsed = row.extra ? JSON.parse(row.extra) : {};
  } catch {
    parsed = {};
  }
  return {
    id: row.id,
    title: row.title || 'Aviso Oficial',
    body: row.description || '',
    priority: ['urgente', 'importante', 'info'].includes(parsed.priority)
      ? parsed.priority
      : 'info',
    authorName: row.author_name || 'Administración',
    expiresAt: parsed.expiresAt || null,
    createdAt: row.created_at,
    storage: 'alerts',
  };
}

function parseTableNotice(row) {
  return {
    id: row.id,
    title: row.title || 'Aviso Oficial',
    body: row.body || '',
    priority: ['urgente', 'importante', 'info'].includes(row.priority)
      ? row.priority
      : 'info',
    authorName: row.author_name || 'Administración',
    expiresAt: row.expires_at || null,
    createdAt: row.created_at,
    storage: 'announcements',
  };
}

function readCachedNews() {
  try {
    const raw = sessionStorage.getItem(NEWS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.savedAt || Date.now() - parsed.savedAt > NEWS_CACHE_TTL_MS) {
      return null;
    }
    if (!Array.isArray(parsed.items)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCachedNews(items, updatedAt) {
  try {
    sessionStorage.setItem(
      NEWS_CACHE_KEY,
      JSON.stringify({ items, updatedAt, savedAt: Date.now() })
    );
  } catch {
    // Ignora error de storage en navegación privada
  }
}

function NewsPortalCard({ item, onShare }) {
  const [imgFailed, setImgFailed] = useState(false);
  const [faviconFailed, setFaviconFailed] = useState(false);
  const catMeta = CATEGORY_LABELS[item.category] || CATEGORY_LABELS.plataformas;
  const showImage = Boolean(item.image) && !imgFailed;

  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      className="group block overflow-hidden rounded-2xl bg-surface-container-lowest border border-surface-container shadow-[0_2px_10px_rgba(21,28,39,0.06)] hover:border-primary/40 active:scale-[0.99] transition-all"
    >
      {/* Portada real del portal (OpenGraph 16:9) */}
      {showImage && (
        <div className="relative w-full aspect-[16/9] bg-surface-container-low overflow-hidden">
          <img
            src={item.image}
            alt={item.title}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-black/20 pointer-events-none" />

          {/* Badge de tiempo relativo arriba a la derecha */}
          <span className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full bg-black/55 backdrop-blur-md text-white font-label-sm text-[10px] tracking-wide">
            {formatRelativeTime(item.publishedAt)}
          </span>

          {/* Identidad del portal abajo a la izquierda sobre la foto */}
          <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-md shadow-sm max-w-[75%]">
              {item.favicon && !faviconFailed ? (
                <img
                  src={item.favicon}
                  alt=""
                  onError={() => setFaviconFailed(true)}
                  className="w-3.5 h-3.5 rounded-sm object-contain flex-shrink-0"
                />
              ) : (
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${catMeta.dotClass}`} />
              )}
              <span className="font-label-sm text-[11px] text-on-surface truncate">
                {item.source}
              </span>
            </div>

            <span className="px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-md text-white/95 font-label-sm text-[10px] uppercase tracking-wider flex-shrink-0">
              {catMeta.label}
            </span>
          </div>
        </div>
      )}

      {/* Cuerpo editorial estilo previsualización de enlace */}
      <div className="p-4">
        {!showImage && (
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="inline-flex items-center gap-1.5 min-w-0">
              {item.favicon && !faviconFailed ? (
                <img
                  src={item.favicon}
                  alt=""
                  onError={() => setFaviconFailed(true)}
                  className="w-4 h-4 rounded-sm object-contain flex-shrink-0"
                />
              ) : (
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${catMeta.dotClass}`} />
              )}
              <span className="font-label-sm text-xs text-on-surface truncate">
                {item.source}
              </span>
              <span className="text-secondary/50 text-xs">•</span>
              <span className="font-label-sm text-[10px] uppercase text-secondary">
                {catMeta.label}
              </span>
            </div>
            <span className="font-body-sm text-[11px] text-secondary flex-shrink-0">
              {formatRelativeTime(item.publishedAt)}
            </span>
          </div>
        )}

        <h3 className="font-headline-md text-[16px] leading-[1.3] font-extrabold text-on-surface group-hover:text-primary transition-colors">
          {item.title}
        </h3>

        {item.description && (
          <p className="mt-1.5 font-body-sm text-[13px] leading-relaxed text-secondary line-clamp-2">
            {item.description}
          </p>
        )}

        <div className="mt-3 pt-2.5 border-t border-surface-container/70 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0 text-secondary">
            <span className="material-symbols-outlined text-sm flex-shrink-0">language</span>
            <span className="font-body-sm text-xs truncate">
              {item.domain || item.source}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={(e) => onShare(e, item)}
              title="Compartir por WhatsApp"
              className="h-8 px-2.5 rounded-lg bg-surface-container-low hover:bg-emerald-50 text-secondary hover:text-emerald-700 flex items-center gap-1 font-label-sm text-[11px] transition-colors"
            >
              <span className="material-symbols-outlined text-sm">share</span>
              <span>Pasar</span>
            </button>
            <span className="inline-flex items-center gap-0.5 text-primary font-label-md text-xs">
              Leer
              <span className="material-symbols-outlined text-sm">open_in_new</span>
            </span>
          </div>
        </div>
      </div>
    </a>
  );
}

export default function NoticiasPage() {
  const navigate = useNavigate();
  const { user, profile, isAdmin, canUseCadeteTools } = useAuth();

  // Alertas SOS activas (Nivel 2+)
  const [sosAlerts, setSosAlerts] = useState([]);
  const [helpingSosId, setHelpingSosId] = useState(null);

  // Avisos del Administrador
  const [announcements, setAnnouncements] = useState([]);
  const [noticeStorage, setNoticeStorage] = useState('announcements');
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeBody, setNoticeBody] = useState('');
  const [noticePriority, setNoticePriority] = useState('importante');
  const [noticeExpiry, setNoticeExpiry] = useState('72h');
  const [savingNotice, setSavingNotice] = useState(false);
  const [deletingNoticeId, setDeletingNoticeId] = useState(null);

  // Novedades automáticas (máximo 7)
  const [newsItems, setNewsItems] = useState(() =>
    (readCachedNews()?.items || []).slice(0, MAX_NEWS_DISPLAY)
  );
  const [newsUpdatedAt, setNewsUpdatedAt] = useState(() => readCachedNews()?.updatedAt || null);
  const [loadingNews, setLoadingNews] = useState(() => !readCachedNews());
  const [refreshingNews, setRefreshingNews] = useState(false);
  const [newsError, setNewsError] = useState(null);

  const [toastMessage, setToastMessage] = useState(null);

  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3600);
  }, []);

  const fetchAnnouncements = useCallback(async () => {
    if (!isSupabaseConfigured) return;

    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (!error && data) {
        setNoticeStorage('announcements');
        setAnnouncements(data.map(parseTableNotice));
        return;
      }

      if (isMissingAnnouncementsTableError(error)) {
        const { data: fallbackRows, error: fallbackErr } = await supabase
          .from('alerts')
          .select('*')
          .eq('badge', ADMIN_NOTICE_BADGE)
          .order('created_at', { ascending: false })
          .limit(20);

        if (!fallbackErr && fallbackRows) {
          setNoticeStorage('alerts');
          setAnnouncements(fallbackRows.map(parseAlertNotice));
        }
      }
    } catch (err) {
      console.warn('No se pudieron cargar avisos oficiales:', err);
    }
  }, []);

  const fetchNews = useCallback(
    async ({ force = false } = {}) => {
      if (force) {
        setRefreshingNews(true);
      } else if (newsItems.length === 0) {
        setLoadingNews(true);
      }
      setNewsError(null);

      try {
        const url = force ? `/api/noticias?t=${Date.now()}` : '/api/noticias';
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`Error del servidor (${res.status})`);
        }
        const data = await res.json();
        const items = (Array.isArray(data?.items) ? data.items : []).slice(0, MAX_NEWS_DISPLAY);
        const updatedAt = data?.updatedAt || new Date().toISOString();
        setNewsItems(items);
        setNewsUpdatedAt(updatedAt);
        writeCachedNews(items, updatedAt);
        if (force) {
          showToast('Novedades actualizadas.');
        }
      } catch (err) {
        console.warn('Error cargando novedades automáticas:', err);
        setNewsError(
          'No pudimos actualizar las novedades ahora. Verificá tu conexión o intentá de nuevo.'
        );
      } finally {
        setLoadingNews(false);
        setRefreshingNews(false);
      }
    },
    [newsItems.length, showToast]
  );

  const fetchSosAlerts = useCallback(async () => {
    if (!canUseCadeteTools) {
      setSosAlerts([]);
      return;
    }

    let list = [];
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('alerts')
          .select('*')
          .eq('category', 'sos')
          .order('created_at', { ascending: false })
          .limit(15);

        if (!error && data) {
          list = data.map(parseSosAlertRow).filter(Boolean);
        }
      } catch (err) {
        console.warn('Error cargando alertas SOS en Novedades:', err);
      }
    } else {
      try {
        const rawLocal = localStorage.getItem(LAST_LOCAL_SOS_KEY);
        if (rawLocal) {
          const parsedLocal = parseSosAlertRow(JSON.parse(rawLocal));
          if (parsedLocal) list = [parsedLocal];
        }
      } catch {
        // Ignora error de storage
      }
    }

    setSosAlerts(list);
  }, [canUseCadeteTools]);

  useEffect(() => {
    fetchAnnouncements();
    fetchSosAlerts();
  }, [fetchAnnouncements, fetchSosAlerts]);

  useEffect(() => {
    const onSosUpdate = () => fetchSosAlerts();
    window.addEventListener('comuna-sos-emitted', onSosUpdate);
    window.addEventListener('comuna-sos-resolved', onSosUpdate);
    return () => {
      window.removeEventListener('comuna-sos-emitted', onSosUpdate);
      window.removeEventListener('comuna-sos-resolved', onSosUpdate);
    };
  }, [fetchSosAlerts]);

  useEffect(() => {
    const cached = readCachedNews();
    if (!cached) {
      fetchNews({ force: false });
    }
  }, [fetchNews]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const channel = supabase
      .channel(`novedades-avisos-${noticeStorage}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: noticeStorage },
        () => {
          fetchAnnouncements();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'alerts' },
        () => {
          fetchSosAlerts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [noticeStorage, fetchAnnouncements, fetchSosAlerts]);

  const activeAnnouncements = useMemo(() => {
    const now = Date.now();
    return announcements.filter((a) => {
      if (!a.expiresAt) return true;
      const exp = new Date(a.expiresAt).getTime();
      return Number.isNaN(exp) || exp > now;
    });
  }, [announcements]);

  const handlePublishNotice = async (e) => {
    e.preventDefault();
    if (!isAdmin || !user) return;

    const cleanTitle = noticeTitle.trim();
    const cleanBody = noticeBody.trim();
    if (!cleanTitle || !cleanBody) {
      showToast('Completá título y mensaje del aviso.');
      return;
    }

    const expiryOpt = EXPIRY_OPTIONS.find((o) => o.id === noticeExpiry);
    const expiresAt =
      expiryOpt && expiryOpt.hours
        ? new Date(Date.now() + expiryOpt.hours * 3600 * 1000).toISOString()
        : null;
    const authorName = profile?.full_name || 'Administración';

    setSavingNotice(true);
    try {
      if (isSupabaseConfigured) {
        let saved = false;

        if (noticeStorage === 'announcements') {
          const { error } = await supabase.from('announcements').insert({
            user_id: user.id,
            author_name: authorName,
            title: cleanTitle,
            body: cleanBody,
            priority: noticePriority,
            expires_at: expiresAt,
          });

          if (!error) {
            saved = true;
          } else if (!isMissingAnnouncementsTableError(error)) {
            throw error;
          }
        }

        if (!saved) {
          const { error: fallbackErr } = await supabase.from('alerts').insert({
            user_id: user.id,
            author_name: authorName,
            vehicle: profile?.vehicle || 'Moto',
            type: noticePriority === 'urgente' ? 'critical' : 'warning',
            category: 'cuponeros',
            badge: ADMIN_NOTICE_BADGE,
            title: cleanTitle,
            description: cleanBody,
            zone: 'Jujuy',
            extra: JSON.stringify({
              subType: 'admin_announcement',
              priority: noticePriority,
              expiresAt,
            }),
          });
          if (fallbackErr) throw fallbackErr;
          setNoticeStorage('alerts');
        }

        await fetchAnnouncements();
      } else {
        setAnnouncements((prev) => [
          {
            id: `local-notice-${Date.now()}`,
            title: cleanTitle,
            body: cleanBody,
            priority: noticePriority,
            authorName,
            expiresAt,
            createdAt: new Date().toISOString(),
            storage: 'local',
          },
          ...prev,
        ]);
      }

      setNoticeTitle('');
      setNoticeBody('');
      setNoticePriority('importante');
      setNoticeExpiry('72h');
      setIsPublishModalOpen(false);
      showToast('📢 Aviso oficial publicado para todos los cadetes.');
    } catch (err) {
      showToast(`No se pudo publicar el aviso: ${err.message}`);
    } finally {
      setSavingNotice(false);
    }
  };

  const handleDeleteNotice = async (notice) => {
    if (!isAdmin) return;
    if (!window.confirm(`¿Eliminar el aviso "${notice.title}"?`)) return;

    setDeletingNoticeId(notice.id);
    try {
      if (isSupabaseConfigured && !String(notice.id).startsWith('local-')) {
        const table = notice.storage === 'alerts' ? 'alerts' : 'announcements';
        const { error } = await supabase.from(table).delete().eq('id', notice.id);
        if (error) throw error;
      }
      setAnnouncements((prev) => prev.filter((item) => item.id !== notice.id));
      showToast('🗑️ Aviso eliminado.');
    } catch (err) {
      showToast(`Error al eliminar aviso: ${err.message}`);
    } finally {
      setDeletingNoticeId(null);
    }
  };

  const handleShareNewsWhatsApp = (e, item) => {
    e.preventDefault();
    e.stopPropagation();
    const text = `📰 *${item.title}*\n${item.source}\n${item.link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };

  const handleOfferSosHelp = async (sos) => {
    if (!canUseCadeteTools || !user) return;
    const helperName = profile?.full_name || user.email?.split('@')[0] || 'Compañero';
    if (sos.helpers.includes(helperName)) return;
    const nextHelpers = [...sos.helpers, helperName];
    setHelpingSosId(sos.id);

    try {
      if (isSupabaseConfigured && !String(sos.id).startsWith('local-')) {
        const updatedExtra = {
          subType: 'sos',
          urgency: sos.urgency,
          phone: sos.phone,
          eventTime: sos.time,
          address: sos.zone,
          isRealGps: sos.isRealGps,
          helpers: nextHelpers,
          expiresAt: sos.expiresAt,
        };
        await supabase
          .from('alerts')
          .update({
            confirm_count: (sos.confirmCount || 1) + 1,
            extra: JSON.stringify(updatedExtra),
          })
          .eq('id', sos.id);
      }
      setSosAlerts((prev) =>
        prev.map((item) => (item.id === sos.id ? { ...item, helpers: nextHelpers } : item))
      );
      showToast('🤝 Avisado al compañero que vas en camino.');
    } catch (err) {
      showToast(`No se pudo registrar asistencia: ${err.message}`);
    } finally {
      setHelpingSosId(null);
    }
  };

  const handleResolveSos = async (sos) => {
    if (!user || (sos.user_id !== user.id && !isAdmin)) return;
    try {
      if (isSupabaseConfigured && !String(sos.id).startsWith('local-')) {
        const { error } = await supabase.from('alerts').delete().eq('id', sos.id);
        if (error) throw error;
      }
      markSosIdAsSeen(sos.id);
      try {
        localStorage.removeItem(LAST_LOCAL_SOS_KEY);
      } catch {
        // Ignora error de storage
      }
      setSosAlerts((prev) => prev.filter((item) => item.id !== sos.id));
      window.dispatchEvent(new CustomEvent('comuna-sos-resolved', { detail: { id: sos.id } }));
      showToast('✅ Alerta SOS cerrada.');
    } catch (err) {
      showToast(`No se pudo cerrar el SOS: ${err.message}`);
    }
  };

  return (
    <div className="py-space-md flex flex-col gap-space-md pb-6">
      {/* Toast flotante */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[70] w-[92%] max-w-sm bg-on-surface text-surface px-4 py-3 rounded-2xl shadow-xl flex items-center justify-between gap-2">
          <span className="font-body-sm text-body-sm font-semibold">{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-surface/70 hover:text-surface flex-shrink-0"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>
      )}

      {/* Encabezado limpio + acción exclusiva Admin */}
      <section className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface tracking-tight">
            {activeAnnouncements.length > 0 ? 'Avisos y Novedades' : 'Novedades'}
          </h1>
          <p className="font-body-sm text-body-sm text-secondary mt-0.5">
            Delivery, combustibles y Jujuy
            {newsUpdatedAt ? ` • ${formatRelativeTime(newsUpdatedAt)}` : ''}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => fetchNews({ force: true })}
            disabled={refreshingNews}
            title="Actualizar novedades"
            className="h-10 w-10 rounded-xl bg-surface-container-lowest border border-surface-container text-secondary hover:text-primary flex items-center justify-center shadow-sm active:scale-95 transition-transform disabled:opacity-60"
          >
            <span
              className={`material-symbols-outlined text-xl ${
                refreshingNews ? 'animate-spin text-primary' : ''
              }`}
            >
              refresh
            </span>
          </button>

          {isAdmin && (
            <button
              type="button"
              id="btn-publish-announcement"
              onClick={() => setIsPublishModalOpen(true)}
              className="h-10 px-3.5 rounded-xl bg-primary-container text-on-primary-container font-label-md text-label-md flex items-center gap-1.5 shadow-sm active:scale-95 transition-transform"
            >
              <span className="material-symbols-outlined text-lg">campaign</span>
              <span>Aviso</span>
            </button>
          )}
        </div>
      </section>

      {/* ALERTAS SOS EN VIVO — visible para Nivel 2+ cuando hay emergencias activas */}
      {canUseCadeteTools && sosAlerts.length > 0 && (
        <section aria-label="Alertas SOS en Vivo" className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-error text-lg animate-pulse">
                emergency
              </span>
              <h2 className="font-label-lg text-label-lg text-error uppercase tracking-wide font-extrabold">
                🚨 Alertas SOS en Vivo
              </h2>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-error text-on-error font-label-sm text-label-sm font-extrabold">
              {sosAlerts.length} {sosAlerts.length === 1 ? 'activa' : 'activas'}
            </span>
          </div>

          <div className="flex flex-col gap-2.5">
            {sosAlerts.map((sos) => {
              const myName = profile?.full_name || user?.email?.split('@')[0] || 'Compañero';
              const alreadyHelping = sos.helpers.includes(myName);
              const canClose = Boolean(user && (sos.user_id === user.id || isAdmin));

              return (
                <article
                  key={sos.id}
                  className="relative overflow-hidden rounded-2xl border-2 border-error bg-error-container/30 p-4 shadow-md"
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-error text-on-error font-label-sm text-[10px] font-extrabold uppercase">
                        <span className="material-symbols-outlined text-xs">emergency</span>
                        {sos.badge}
                      </span>
                      <span className="font-body-sm text-[11px] text-secondary font-bold">
                        {sos.time}
                      </span>
                    </div>

                    <h3 className="font-label-lg text-[15px] text-on-surface font-extrabold leading-snug">
                      {sos.title}
                    </h3>

                    <p className="font-body-sm text-body-sm text-on-surface/90">
                      {sos.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-secondary font-semibold">
                      <span className="inline-flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs text-error">
                          location_on
                        </span>
                        {sos.zone}
                      </span>
                      {sos.helpers.length > 0 && (
                        <span className="inline-flex items-center gap-1 text-tertiary font-extrabold">
                          • 🤝 {sos.helpers.length} en camino ({sos.helpers.join(', ')})
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        disabled={alreadyHelping || helpingSosId === sos.id}
                        onClick={() => handleOfferSosHelp(sos)}
                        className={`h-9 px-3 rounded-xl font-label-sm text-xs font-extrabold flex items-center gap-1 transition-all ${
                          alreadyHelping
                            ? 'bg-tertiary-container text-on-tertiary-container opacity-90'
                            : 'bg-error text-on-error shadow-sm active:scale-95'
                        }`}
                      >
                        <span className="material-symbols-outlined text-sm">handshake</span>
                        {alreadyHelping ? 'Ya avisaste' : 'Voy en camino'}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          navigate('/', { state: { focusSosCoords: [sos.lat, sos.lng] } })
                        }
                        className="h-9 px-3 rounded-xl bg-surface-container-lowest border border-surface-container text-on-surface font-label-sm text-xs font-extrabold flex items-center gap-1 active:scale-95"
                      >
                        <span className="material-symbols-outlined text-sm text-primary">map</span>
                        Ver Mapa
                      </button>

                      <a
                        href={buildSosShareWhatsappUrl(sos)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-9 px-3 rounded-xl bg-tertiary-container text-on-tertiary-container font-label-sm text-xs font-extrabold flex items-center gap-1 active:scale-95"
                      >
                        <span className="material-symbols-outlined text-sm">chat</span>
                        WhatsApp
                      </a>

                      {canClose && (
                        <button
                          type="button"
                          onClick={() => handleResolveSos(sos)}
                          className="h-9 px-3 rounded-xl bg-surface-container text-on-surface font-label-sm text-xs font-bold flex items-center gap-1 active:scale-95"
                        >
                          <span className="material-symbols-outlined text-sm">check_circle</span>
                          Cerrar SOS
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* AVISOS DEL ADMIN — solo se renderiza si hay al menos un aviso activo */}
      {activeAnnouncements.length > 0 && (
        <section aria-label="Avisos Oficiales" className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary text-lg">campaign</span>
              <h2 className="font-label-lg text-label-lg text-on-surface uppercase tracking-wide">
                Avisos Oficiales
              </h2>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed-variant font-label-sm text-label-sm">
              {activeAnnouncements.length}{' '}
              {activeAnnouncements.length === 1 ? 'activo' : 'activos'}
            </span>
          </div>

          <div className="flex flex-col gap-2.5">
            {activeAnnouncements.map((notice) => {
              const pStyle = PRIORITY_STYLES[notice.priority] || PRIORITY_STYLES.info;
              return (
                <article
                  key={notice.id}
                  className={`relative overflow-hidden rounded-2xl border p-4 shadow-sm ${pStyle.cardClass}`}
                >
                  <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${pStyle.accentBar}`} />
                  <div className="pl-2 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-label-sm text-label-sm uppercase tracking-wide ${pStyle.badgeClass}`}
                      >
                        <span className="material-symbols-outlined text-xs">{pStyle.icon}</span>
                        {pStyle.label}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <span className="font-body-sm text-[11px] text-secondary">
                          {formatRelativeTime(notice.createdAt)}
                        </span>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => handleDeleteNotice(notice)}
                            disabled={deletingNoticeId === notice.id}
                            title="Eliminar aviso"
                            className="w-7 h-7 rounded-lg bg-white/80 hover:bg-error-container text-secondary hover:text-error flex items-center justify-center transition-colors disabled:opacity-50"
                          >
                            <span className="material-symbols-outlined text-base">delete</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <h3 className="font-label-lg text-[15px] leading-snug text-on-surface">
                      {notice.title}
                    </h3>

                    <p className="font-body-md text-body-md text-on-surface/85 whitespace-pre-line">
                      {notice.body}
                    </p>

                    <div className="flex items-center justify-between pt-1 text-[11px] text-secondary">
                      <span className="inline-flex items-center gap-1 font-semibold">
                        <span className="material-symbols-outlined text-xs text-primary">
                          admin_panel_settings
                        </span>
                        {notice.authorName}
                      </span>
                      {notice.expiresAt && (
                        <span>
                          Vigente hasta{' '}
                          {new Date(notice.expiresAt).toLocaleDateString('es-AR', {
                            day: '2-digit',
                            month: 'short',
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* FEED DE NOVEDADES (HASTA 7 TARJETAS CON PREVISUALIZACIÓN REAL DE PORTALES) */}
      <section aria-label="Novedades" className="flex flex-col gap-3.5">
        {loadingNews ? (
          <div className="flex flex-col gap-3.5">
            {[1, 2, 3].map((skeleton) => (
              <div
                key={skeleton}
                className="overflow-hidden rounded-2xl bg-surface-container-lowest border border-surface-container animate-pulse"
              >
                <div className="w-full aspect-[16/9] bg-surface-container" />
                <div className="p-4">
                  <div className="h-4 w-full rounded bg-surface-container mb-2" />
                  <div className="h-4 w-4/5 rounded bg-surface-container mb-3" />
                  <div className="h-3 w-full rounded bg-surface-container mb-1.5" />
                  <div className="h-3 w-2/3 rounded bg-surface-container" />
                </div>
              </div>
            ))}
          </div>
        ) : newsError && newsItems.length === 0 ? (
          <div className="rounded-2xl bg-surface-container-lowest border border-surface-container p-6 text-center flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-error-container text-error flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">wifi_off</span>
            </div>
            <div>
              <h3 className="font-label-lg text-label-lg text-on-surface">
                Sin conexión con las novedades
              </h3>
              <p className="font-body-sm text-body-sm text-secondary mt-1">{newsError}</p>
            </div>
            <button
              type="button"
              onClick={() => fetchNews({ force: true })}
              className="h-10 px-4 rounded-xl bg-primary-container text-on-primary-container font-label-md text-label-md flex items-center gap-1.5 active:scale-95 transition-transform"
            >
              <span className="material-symbols-outlined text-lg">refresh</span>
              Reintentar
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3.5">
            {newsError && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 flex items-center justify-between gap-2 text-amber-900">
                <span className="font-body-sm text-xs">
                  Mostrando novedades guardadas. Tocá actualizar para reintentar.
                </span>
                <button
                  type="button"
                  onClick={() => fetchNews({ force: true })}
                  className="font-label-sm text-xs underline flex-shrink-0"
                >
                  Reintentar
                </button>
              </div>
            )}

            {newsItems.map((item) => (
              <NewsPortalCard
                key={item.id}
                item={item}
                onShare={handleShareNewsWhatsApp}
              />
            ))}
          </div>
        )}
      </section>

      {/* MODAL DE PUBLICACIÓN DE AVISO (EXCLUSIVO ADMIN) */}
      {isAdmin && isPublishModalOpen && (
        <div
          className="fixed inset-0 z-[80] bg-on-surface/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => !savingNotice && setIsPublishModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-surface-container-lowest rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-primary-fixed text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-xl">campaign</span>
                </div>
                <div>
                  <h2 className="font-headline-md text-headline-md text-on-surface">
                    Publicar Aviso Oficial
                  </h2>
                  <p className="font-body-sm text-xs text-secondary">
                    Visible arriba de las novedades para todos los cadetes
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !savingNotice && setIsPublishModalOpen(false)}
                className="w-8 h-8 rounded-full bg-surface-container text-secondary flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <form onSubmit={handlePublishNotice} className="flex flex-col gap-3.5">
              <div>
                <label className="block font-label-md text-label-md text-on-surface mb-1.5">
                  Tipo de aviso
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'info', label: 'Info', icon: 'notifications_active' },
                    { id: 'importante', label: 'Importante', icon: 'priority_high' },
                    { id: 'urgente', label: 'Urgente', icon: 'campaign' },
                  ].map((opt) => {
                    const selected = noticePriority === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setNoticePriority(opt.id)}
                        className={`h-11 rounded-xl border font-label-md text-xs flex items-center justify-center gap-1 transition-all ${
                          selected
                            ? opt.id === 'urgente'
                              ? 'bg-error text-on-error border-error shadow-sm'
                              : opt.id === 'importante'
                              ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                              : 'bg-primary-container text-on-primary-container border-primary-container shadow-sm'
                            : 'bg-surface text-secondary border-surface-container'
                        }`}
                      >
                        <span className="material-symbols-outlined text-base">{opt.icon}</span>
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block font-label-md text-label-md text-on-surface mb-1">
                  Título del aviso
                </label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={noticeTitle}
                  onChange={(e) => setNoticeTitle(e.target.value)}
                  placeholder="Ej: Reunión de cadetes hoy 19hs en Plaza Belgrano"
                  className="w-full h-11 px-3.5 rounded-xl bg-surface border border-surface-container text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>

              <div>
                <label className="block font-label-md text-label-md text-on-surface mb-1">
                  Mensaje
                </label>
                <textarea
                  required
                  rows={4}
                  maxLength={600}
                  value={noticeBody}
                  onChange={(e) => setNoticeBody(e.target.value)}
                  placeholder="Escribí los detalles del comunicado para el grupo..."
                  className="w-full p-3.5 rounded-xl bg-surface border border-surface-container text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
                />
              </div>

              <div>
                <label className="block font-label-md text-label-md text-on-surface mb-1.5">
                  Duración automática
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {EXPIRY_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setNoticeExpiry(opt.id)}
                      className={`h-10 rounded-xl border font-label-md text-xs transition-all ${
                        noticeExpiry === opt.id
                          ? 'bg-on-surface text-surface border-on-surface'
                          : 'bg-surface text-secondary border-surface-container'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  disabled={savingNotice}
                  onClick={() => setIsPublishModalOpen(false)}
                  className="flex-1 h-12 rounded-xl bg-surface-container text-on-surface font-label-lg text-label-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingNotice}
                  className="flex-1 h-12 rounded-xl bg-primary-container text-on-primary-container font-label-lg text-label-lg flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-60"
                >
                  <span className="material-symbols-outlined text-lg">send</span>
                  {savingNotice ? 'Publicando...' : 'Publicar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
