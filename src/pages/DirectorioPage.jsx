import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  useAuth,
  DEFAULT_AVATAR_URL,
  hasCustomProfilePhoto,
  compressAvatarFile,
} from '../context/AuthContext';

const INITIAL_FERIA = [
  {
    id: 'seed-feria-1',
    title: 'Mochila Térmica PeYa Oficial',
    subtitle: 'Impermeable con expansor térmico y cierres nuevos',
    price: '$22.000',
    badge: 'Seminuevo',
    subCategory: 'mochila',
    seller: 'Rodrigo',
    zone: 'Zona Cuyaya',
    phone: '5493884123456',
    verifiedSeller: true,
    image:
      'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'seed-feria-2',
    title: 'Casco Integral LS2 Talle L',
    subtitle: 'Homologado con visor pinlock anti-empañe',
    price: '$45.000',
    badge: 'Impecable',
    subCategory: 'casco',
    seller: 'Cristian',
    zone: 'Chijra',
    phone: '5493884889900',
    verifiedSeller: true,
    image:
      'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'seed-feria-3',
    title: 'Kit Transmisión Riffel 110cc + Rompeviento',
    subtitle: 'Nuevo en caja • Entrego en Palpalá o Alto Comedero',
    price: '$18.500',
    badge: 'Nuevo',
    subCategory: 'repuesto',
    seller: 'Matías R.',
    zone: 'Palpalá / Ruta 66',
    phone: '5493885112233',
    verifiedSeller: true,
    image:
      'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'seed-feria-4',
    title: 'Viandas Caseras & Sánguches de Milanesa',
    subtitle: 'Elaboración propia para compañeros en turno nocturno',
    price: '$4.500',
    badge: 'Emprendimiento',
    subCategory: 'comida',
    seller: 'Camila S.',
    zone: 'Centro SSJ',
    phone: '5493884776655',
    verifiedSeller: true,
    image:
      'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=300&q=80',
  },
];

const PRODUCT_IMAGES = {
  mochila:
    'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=300&q=80',
  casco:
    'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=300&q=80',
  repuesto:
    'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=300&q=80',
  comida:
    'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=300&q=80',
};

const FERIA_CATEGORIES = [
  { id: 'all', label: 'Todos' },
  { id: 'mochila', label: 'Mochilas e Indumentaria', icon: 'backpack' },
  { id: 'casco', label: 'Cascos y Seguridad', icon: 'sports_motorsports' },
  { id: 'repuesto', label: 'Repuestos y Accesorios', icon: 'build' },
  { id: 'comida', label: 'Emprendimientos / Comida', icon: 'lunch_dining' },
];

const normalizeText = (str = '') =>
  str
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

export default function DirectorioPage() {
  const navigate = useNavigate();
  const {
    user,
    profile,
    canPublishFeria,
    isAdmin,
  } = useAuth();

  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal de publicación (solo cuando canPublishFeria === true)
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [itemTitle, setItemTitle] = useState('');
  const [itemSubtitle, setItemSubtitle] = useState('Excelente estado • Entrega en mano');
  const [itemPrice, setItemPrice] = useState('$25.000');
  const [itemZone, setItemZone] = useState('Centro');
  const [itemPhone, setItemPhone] = useState('+54 9 388 ');
  const [itemSubCategory, setItemSubCategory] = useState('mochila');
  const [customProductImage, setCustomProductImage] = useState('');
  const [savingItem, setSavingItem] = useState(false);

  const [toastMessage, setToastMessage] = useState(null);
  const [marketplaceItems, setMarketplaceItems] = useState(INITIAL_FERIA);
  const [pendingPhotoRequests, setPendingPhotoRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [expandedPhotoUser, setExpandedPhotoUser] = useState(null);

  // Aviso de responsabilidad previo a WhatsApp y reportes comunitarios
  const [whatsAppConfirmData, setWhatsAppConfirmData] = useState(null);
  const [reportingItem, setReportingItem] = useState(null);
  const [reportReason, setReportReason] = useState('');
  const [sendingReport, setSendingReport] = useState(false);
  const [feriaReports, setFeriaReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);

  const hasCustomPhoto = hasCustomProfilePhoto(profile);

  useEffect(() => {
    if (profile?.whatsapp) {
      setItemPhone(profile.whatsapp);
    }
  }, [profile?.whatsapp]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  const fetchFeriaItems = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    try {
      const { data, error } = await supabase
        .from('directory_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        const dbFeria = data
          .filter((d) => d.section === 'feria' || d.category === 'feria')
          .map((d) => ({
            id: d.id,
            user_id: d.user_id,
            title: d.title,
            subtitle: d.subtitle || 'Publicado por Mulita Emprendedora',
            price: d.price || '$20.000',
            badge: d.badge || 'Vendedor Confiable',
            subCategory: PRODUCT_IMAGES[d.icon] ? d.icon : 'mochila',
            seller: d.seller_name || 'Rider Emprendedor',
            zone: d.zone || 'Centro',
            phone: d.phone || '5493884123456',
            verifiedSeller: d.seller_verified ?? true,
            image: d.image_url || PRODUCT_IMAGES[d.icon] || PRODUCT_IMAGES.mochila,
            isFromDb: true,
          }));

        setMarketplaceItems((prev) => {
          const remainingSeeds = prev.filter((s) => s.id.toString().startsWith('seed-'));
          return [...dbFeria, ...remainingSeeds];
        });
      }
    } catch (err) {
      console.warn('Error cargando Mulitas Emprendedoras desde Supabase:', err);
    }
  }, []);

  const fetchPendingPhotoRequests = useCallback(async () => {
    if (!isSupabaseConfigured || !isAdmin) {
      setPendingPhotoRequests([]);
      return;
    }
    setLoadingRequests(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('verification_requested_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (!error && data) {
        const pending = data.filter(
          (p) =>
            p.role !== 'admin' &&
            (p.verification_status === 'pending' ||
              (hasCustomProfilePhoto(p) &&
                p.role !== 'cadete_emprendedor' &&
                p.verification_status !== 'rejected'))
        );
        setPendingPhotoRequests(pending);
      }
    } catch (err) {
      console.warn('Error cargando solicitudes de foto en Feria:', err);
    } finally {
      setLoadingRequests(false);
    }
  }, [isAdmin]);

  const fetchFeriaReports = useCallback(async () => {
    if (!isSupabaseConfigured || !isAdmin) {
      setFeriaReports([]);
      return;
    }
    setLoadingReports(true);
    try {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .eq('badge', '🚩 Reporte Feria')
        .order('created_at', { ascending: false });

      if (!error && data) {
        const mapped = data.map((row) => {
          let parsed = {};
          try {
            parsed = row.extra ? JSON.parse(row.extra) : {};
          } catch {
            parsed = {};
          }
          return {
            id: row.id,
            reporterName: row.author_name || 'Compañero Rider',
            reason: row.description || '',
            createdAt: row.created_at,
            itemId: parsed.itemId || null,
            itemTitle: parsed.itemTitle || row.title || 'Publicación reportada',
            itemPrice: parsed.itemPrice || '',
            sellerName: parsed.sellerName || '',
            sellerUserId: parsed.sellerUserId || null,
          };
        });
        setFeriaReports(mapped);
      }
    } catch (err) {
      console.warn('Error cargando reportes de Feria:', err);
    } finally {
      setLoadingReports(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchFeriaItems();
    fetchPendingPhotoRequests();
    fetchFeriaReports();

    if (!isSupabaseConfigured) return;
    const channel = supabase
      .channel('public:directory_items_and_reports')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'directory_items' }, () => {
        fetchFeriaItems();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, () => {
        if (isAdmin) fetchFeriaReports();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchFeriaItems, fetchPendingPhotoRequests, fetchFeriaReports, isAdmin]);

  const handleAdminPhotoDecision = async (reqUser, approve) => {
    if (!isAdmin || !isSupabaseConfigured) return;
    try {
      const preservedRole =
        reqUser.role === 'cadete_emprendedor' ? 'cadete_verificado' : reqUser.role || 'ciudadano';
      const updates = approve
        ? {
            role: 'cadete_emprendedor',
            verification_status: 'approved',
            is_banned: false,
            updated_at: new Date().toISOString(),
          }
        : {
            role: preservedRole,
            avatar_url: DEFAULT_AVATAR_URL,
            verification_status: 'rejected',
            updated_at: new Date().toISOString(),
          };

      const { error } = await supabase.from('profiles').update(updates).eq('id', reqUser.id);
      if (error) throw error;

      setPendingPhotoRequests((prev) => prev.filter((p) => p.id !== reqUser.id));
      setExpandedPhotoUser((prev) => (prev?.id === reqUser.id ? null : prev));
      showToast(
        approve
          ? `✅ ${reqUser.full_name || reqUser.email} aprobado para publicar en Feria (N3).`
          : `❌ Foto de ${reqUser.full_name || reqUser.email} rechazada. Se restauró la foto por defecto.`
      );
    } catch (err) {
      alert(`No se pudo procesar la solicitud: ${err.message}`);
    }
  };

  const redirectToPerfilPhoto = () => {
    navigate('/perfil', { state: { highlightPhotoUpload: true } });
  };

  const handleOpenPublishClick = () => {
    if (!user) {
      if (
        window.confirm(
          '🔒 Para publicar en Mulitas Emprendedoras necesitás iniciar sesión, cargar tu foto de perfil y contar con aprobación del administrador. ¿Ir a Mi Perfil?'
        )
      ) {
        redirectToPerfilPhoto();
      }
      return;
    }

    if (!canPublishFeria) {
      if (profile?.verification_status === 'pending' && hasCustomPhoto) {
        showToast('⏳ Tu foto de perfil ya fue enviada y está pendiente de aprobación por el Administrador.');
        return;
      }
      redirectToPerfilPhoto();
      return;
    }

    setItemTitle('');
    setItemSubtitle('Excelente estado • Entrega en mano');
    setCustomProductImage('');
    setItemPhone(profile?.whatsapp || '+54 9 388 ');
    setIsPublishModalOpen(true);
  };

  const handleProductImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressAvatarFile(file, 360, 0.8);
      setCustomProductImage(compressed);
    } catch {
      alert('No se pudo procesar la foto del producto.');
    }
  };

  const handlePublishItem = async () => {
    if (!user || !canPublishFeria) {
      setIsPublishModalOpen(false);
      redirectToPerfilPhoto();
      return;
    }
    if (!itemTitle.trim()) {
      alert('Ingresá el título del producto o emprendimiento.');
      return;
    }

    setSavingItem(true);
    const sellerName = profile?.full_name || user.email?.split('@')[0] || 'Rider Emprendedor';
    const formattedPrice = itemPrice.trim().startsWith('$')
      ? itemPrice.trim()
      : `$${itemPrice.trim() || '25.000'}`;

    const newRow = {
      user_id: user.id,
      section: 'feria',
      category: 'feria',
      title: itemTitle.trim(),
      subtitle: itemSubtitle.trim() || 'Entrega en mano en Jujuy',
      badge: 'Vendedor Confiable',
      zone: `Zona ${itemZone}`,
      price: formattedPrice,
      phone: itemPhone.trim() || profile?.whatsapp || '5493884123456',
      seller_name: sellerName,
      seller_verified: true,
      image_url: customProductImage || PRODUCT_IMAGES[itemSubCategory] || PRODUCT_IMAGES.mochila,
      icon: itemSubCategory,
    };

    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('directory_items')
          .insert(newRow)
          .select()
          .single();

        if (error) throw error;

        if (data) {
          const uiItem = {
            id: data.id,
            user_id: data.user_id,
            title: data.title,
            subtitle: data.subtitle,
            price: data.price,
            badge: data.badge,
            subCategory: PRODUCT_IMAGES[data.icon] ? data.icon : itemSubCategory,
            seller: data.seller_name,
            zone: data.zone,
            phone: data.phone,
            verifiedSeller: true,
            image: data.image_url,
            isFromDb: true,
          };
          setMarketplaceItems((prev) => [uiItem, ...prev]);
        }
      } else {
        const localItem = {
          id: `local-feria-${Date.now()}`,
          user_id: user.id,
          title: newRow.title,
          subtitle: newRow.subtitle,
          price: newRow.price,
          badge: newRow.badge,
          subCategory: itemSubCategory,
          seller: newRow.seller_name,
          zone: newRow.zone,
          phone: newRow.phone,
          verifiedSeller: true,
          image: newRow.image_url,
        };
        setMarketplaceItems((prev) => [localItem, ...prev]);
      }

      setItemTitle('');
      setCustomProductImage('');
      setIsPublishModalOpen(false);
      showToast('¡Aviso publicado en Mulitas Emprendedoras!');
    } catch (err) {
      alert(`Error al publicar en Supabase: ${err.message}`);
    } finally {
      setSavingItem(false);
    }
  };

  const handleDeleteFeriaItem = async (item) => {
    if (!user || (!isAdmin && item.user_id !== user.id)) return;
    try {
      if (item.isFromDb && isSupabaseConfigured) {
        const { error } = await supabase.from('directory_items').delete().eq('id', item.id);
        if (error) throw error;
      }
      setMarketplaceItems((prev) => prev.filter((i) => i.id !== item.id));
      showToast('Publicación eliminada de Mulitas Emprendedoras');
    } catch (err) {
      alert(`No se pudo borrar la publicación: ${err.message}`);
    }
  };

  const handleOpenWhatsApp = (phone, text, item = null) => {
    setWhatsAppConfirmData({
      phone,
      text,
      seller: item?.seller || 'el vendedor',
      title: item?.title || 'esta publicación',
    });
  };

  const handleProceedToWhatsApp = () => {
    if (!whatsAppConfirmData) return;
    const { phone, text } = whatsAppConfirmData;
    const cleanPhone = (phone || '5493884123456').replace(/\D/g, '');
    setWhatsAppConfirmData(null);
    showToast('Abriendo chat de WhatsApp...');
    window.open(
      `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  const handleOpenReportModal = (item) => {
    if (!user) {
      if (
        window.confirm(
          '🚩 Iniciá sesión para poder reportar publicaciones al Administrador. ¿Ir a Mi Perfil?'
        )
      ) {
        navigate('/perfil');
      }
      return;
    }
    setReportingItem(item);
    setReportReason('');
  };

  const handleSubmitReport = async () => {
    if (!user || !reportingItem) return;
    const cleanReason = reportReason.trim();
    if (cleanReason.length < 4) {
      alert('Escribí brevemente el motivo del reporte para que el Administrador pueda revisarlo.');
      return;
    }
    setSendingReport(true);
    try {
      const reporterName =
        profile?.full_name || user.email?.split('@')[0] || 'Rider Jujuy';
      const reportPayload = {
        user_id: user.id,
        author_name: reporterName,
        vehicle: profile?.vehicle || 'Moto',
        type: 'security',
        category: 'cuponeros',
        badge: '🚩 Reporte Feria',
        title: `Reporte: ${reportingItem.title}`,
        description: cleanReason,
        zone: reportingItem.zone || 'Centro',
        extra: JSON.stringify({
          subType: 'feria_report',
          itemId: reportingItem.id,
          itemTitle: reportingItem.title,
          itemPrice: reportingItem.price,
          sellerName: reportingItem.seller,
          sellerUserId: reportingItem.user_id || null,
        }),
      };

      if (isSupabaseConfigured) {
        const { error } = await supabase.from('alerts').insert(reportPayload);
        if (error) throw error;
        if (isAdmin) await fetchFeriaReports();
      } else {
        setFeriaReports((prev) => [
          {
            id: `local-rep-${Date.now()}`,
            reporterName,
            reason: cleanReason,
            itemId: reportingItem.id,
            itemTitle: reportingItem.title,
            itemPrice: reportingItem.price,
            sellerName: reportingItem.seller,
          },
          ...prev,
        ]);
      }

      setReportingItem(null);
      setReportReason('');
      showToast('🚩 Reporte enviado al Administrador para revisión.');
    } catch (err) {
      alert(`No se pudo enviar el reporte: ${err.message}`);
    } finally {
      setSendingReport(false);
    }
  };

  const handleAdminResolveReport = async (report, deletePublication) => {
    if (!isAdmin) return;
    try {
      if (deletePublication && report.itemId) {
        if (
          isSupabaseConfigured &&
          !String(report.itemId).startsWith('seed-') &&
          !String(report.itemId).startsWith('local-')
        ) {
          const { error: delItemErr } = await supabase
            .from('directory_items')
            .delete()
            .eq('id', report.itemId);
          if (delItemErr) throw delItemErr;
        }
        setMarketplaceItems((prev) => prev.filter((item) => item.id !== report.itemId));
      }

      if (isSupabaseConfigured && !String(report.id).startsWith('local-')) {
        const { error: delAlertErr } = await supabase.from('alerts').delete().eq('id', report.id);
        if (delAlertErr) throw delAlertErr;
      }

      setFeriaReports((prev) => prev.filter((r) => r.id !== report.id));
      showToast(
        deletePublication
          ? '🗑️ Publicación eliminada y reporte cerrado.'
          : '✅ Reporte descartado.'
      );
    } catch (err) {
      alert(`No se pudo resolver el reporte: ${err.message}`);
    }
  };

  const filteredFeria = marketplaceItems.filter((item) => {
    if (activeCategory !== 'all' && item.subCategory !== activeCategory) return false;
    if (!searchQuery.trim()) return true;
    return normalizeText(
      `${item.title} ${item.subtitle} ${item.seller} ${item.zone} ${item.badge}`
    ).includes(normalizeText(searchQuery));
  });

  return (
    <div className="flex flex-col w-full pb-8 space-y-space-md pt-2">
      {/* Banner Superior: Mulitas emprendedoras (Solo Feria Rider) */}
      <div className="relative overflow-hidden rounded-xl bg-primary-container text-on-primary-container p-space-md shadow-md">
        <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
        <div className="relative z-10 flex items-center justify-between gap-space-sm">
          <div className="flex items-center gap-space-sm min-w-0">
            <div className="w-11 h-11 rounded-full bg-white text-primary flex items-center justify-center flex-shrink-0 shadow-sm">
              <span
                className="material-symbols-outlined text-2xl"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                storefront
              </span>
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className="font-headline-md text-headline-md font-extrabold truncate">
                  Mulitas emprendedoras
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-[10px] uppercase font-extrabold">
                  Feria Rider
                </span>
              </div>
              <p className="font-body-sm text-body-sm text-on-primary-container/90 truncate">
                Emprendimientos, indumentaria y repuestos entre compañeros
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Buscador Táctil */}
      <div className="flex items-center w-full h-12 bg-surface-container-lowest rounded-xl px-space-md shadow-sm border border-surface-container/60">
        <span className="material-symbols-outlined text-secondary mr-space-sm text-xl flex-shrink-0">
          search
        </span>
        <input
          id="feria-search"
          className="w-full bg-transparent font-body-md text-body-md text-on-surface placeholder:text-secondary focus:outline-none"
          placeholder="Buscar mochilas, cascos, repuestos, comida..."
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="text-secondary hover:text-on-surface p-1 ml-1 flex-shrink-0"
            type="button"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        )}
      </div>

      {/* Categorías de la Feria */}
      <div className="flex gap-space-xs overflow-x-auto no-scrollbar py-0.5 -mx-space-md px-space-md">
        {FERIA_CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`flex-shrink-0 px-3.5 py-2 rounded-full font-label-sm text-label-sm transition-all shadow-sm flex items-center gap-1 ${
                isActive
                  ? 'bg-primary-container text-on-primary-container font-extrabold'
                  : 'bg-surface-container-lowest text-secondary hover:text-on-surface font-bold'
              }`}
            >
              {cat.icon && <span className="material-symbols-outlined text-sm">{cat.icon}</span>}
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Botón Principal para Publicar en Mulitas Emprendedoras */}
      <button
        id="publish-ad-btn"
        onClick={handleOpenPublishClick}
        className="w-full flex items-center justify-center gap-2 h-12 bg-on-surface text-surface rounded-full font-label-lg text-label-lg font-extrabold active:scale-95 transition-transform shadow-md"
        type="button"
      >
        <span className="material-symbols-outlined text-xl text-primary-fixed">
          {canPublishFeria ? 'add_circle' : 'verified_user'}
        </span>
        {canPublishFeria
          ? 'Publicar en Mulitas Emprendedoras'
          : !user
          ? 'Publicar en Mulitas Emprendedoras'
          : profile?.verification_status === 'pending' && hasCustomPhoto
          ? 'Foto en Revisión del Admin (Pendiente)'
          : profile?.verification_status === 'rejected'
          ? 'Foto Rechazada • Subir Nueva en Perfil'
          : 'Subir Foto de Perfil en Perfil para Publicar'}
      </button>

      {/* TARJETA ADMIN: Solicitudes de Foto de Perfil para Publicar en Feria */}
      {isAdmin && pendingPhotoRequests.length > 0 && (
        <section className="bg-surface-container-lowest rounded-xl p-space-md shadow-md border-2 border-primary-container space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="material-symbols-outlined text-primary-container text-xl">
                admin_panel_settings
              </span>
              <h2 className="font-label-lg text-label-lg text-on-surface font-extrabold truncate">
                🛡️ Solicitudes para Publicar en Feria ({pendingPhotoRequests.length})
              </h2>
            </div>
            <button
              type="button"
              onClick={fetchPendingPhotoRequests}
              className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface flex-shrink-0"
              title="Actualizar solicitudes"
            >
              <span
                className={`material-symbols-outlined text-base ${
                  loadingRequests ? 'animate-spin' : ''
                }`}
              >
                refresh
              </span>
            </button>
          </div>

          <div className="space-y-2.5">
            {pendingPhotoRequests.map((reqUser) => {
              const reqHasPhoto = hasCustomProfilePhoto(reqUser);
              return (
                <div
                  key={reqUser.id}
                  className="p-3 rounded-xl bg-surface-container-low border border-surface-container-high space-y-2.5"
                >
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setExpandedPhotoUser(reqUser)}
                      className="relative group flex-shrink-0 cursor-zoom-in rounded-xl overflow-hidden focus:outline-none"
                      title="Tocar para ampliar foto"
                    >
                      <img
                        src={reqUser.avatar_url || DEFAULT_AVATAR_URL}
                        alt={reqUser.full_name || 'Solicitante'}
                        className="w-16 h-16 rounded-xl object-cover border-2 border-white shadow-sm group-hover:scale-105 transition-transform"
                      />
                      <span className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center shadow">
                        <span className="material-symbols-outlined text-[13px]">zoom_in</span>
                      </span>
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="font-label-lg text-label-lg text-on-surface font-extrabold truncate">
                        {reqUser.full_name || 'Sin nombre'}
                      </p>
                      <p className="font-body-sm text-[11px] text-secondary truncate">
                        {reqUser.email} {reqUser.whatsapp ? `• ${reqUser.whatsapp}` : ''}
                      </p>
                      <span
                        className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full font-label-sm text-[10px] font-extrabold ${
                          reqHasPhoto
                            ? 'bg-tertiary-container/20 text-tertiary'
                            : 'bg-amber-300/70 text-amber-950'
                        }`}
                      >
                        {reqHasPhoto
                          ? '📸 Foto de perfil propia (tocar para ampliar)'
                          : '⚠️ Tiene foto por defecto'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleAdminPhotoDecision(reqUser, true)}
                      className="h-9 rounded-lg bg-tertiary-container text-on-tertiary-container font-label-sm text-label-sm font-extrabold flex items-center justify-center gap-1 active:scale-95"
                    >
                      <span className="material-symbols-outlined text-sm">check_circle</span>
                      Aprobar Foto y Habilitar (N3)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAdminPhotoDecision(reqUser, false)}
                      className="h-9 rounded-lg bg-error-container text-on-error-container font-label-sm text-label-sm font-extrabold flex items-center justify-center gap-1 active:scale-95"
                    >
                      <span className="material-symbols-outlined text-sm">close</span>
                      Rechazar Foto
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* TARJETA ADMIN: Publicaciones Reportadas por la Comunidad */}
      {isAdmin && feriaReports.length > 0 && (
        <section className="bg-surface-container-lowest rounded-xl p-space-md shadow-md border-2 border-error space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="material-symbols-outlined text-error text-xl">flag</span>
              <h2 className="font-label-lg text-label-lg text-on-surface font-extrabold truncate">
                🚩 Publicaciones Reportadas ({feriaReports.length})
              </h2>
            </div>
            <button
              type="button"
              onClick={fetchFeriaReports}
              className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface flex-shrink-0"
              title="Actualizar reportes"
            >
              <span
                className={`material-symbols-outlined text-base ${
                  loadingReports ? 'animate-spin' : ''
                }`}
              >
                refresh
              </span>
            </button>
          </div>

          <div className="space-y-2.5">
            {feriaReports.map((rep) => (
              <div
                key={rep.id}
                className="p-3 rounded-xl bg-error-container/25 border border-error/35 space-y-2"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-label-lg text-label-lg text-on-surface font-extrabold truncate">
                      {rep.itemTitle} {rep.itemPrice ? `(${rep.itemPrice})` : ''}
                    </p>
                  </div>
                  <p className="font-body-sm text-[11px] text-secondary">
                    Vendedor: <strong className="text-on-surface">{rep.sellerName || 'Rider'}</strong> • Reportó:{' '}
                    <strong className="text-on-surface">{rep.reporterName}</strong>
                  </p>
                  <p className="font-body-sm text-body-sm text-on-surface bg-surface-container-lowest/90 p-2 rounded-lg border border-surface-container mt-1">
                    “{rep.reason}”
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleAdminResolveReport(rep, true)}
                    className="h-9 rounded-lg bg-error text-on-error font-label-sm text-label-sm font-extrabold flex items-center justify-center gap-1 active:scale-95"
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
                    Borrar Publicación
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdminResolveReport(rep, false)}
                    className="h-9 rounded-lg bg-surface-container text-on-surface font-label-sm text-label-sm font-extrabold flex items-center justify-center gap-1 active:scale-95"
                  >
                    <span className="material-symbols-outlined text-sm">check</span>
                    Descartar Reporte
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Feed Exclusivo de la Feria Rider */}
      {filteredFeria.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-xl p-6 text-center space-y-2 border border-surface-container/60 shadow-sm">
          <span className="material-symbols-outlined text-3xl text-secondary">storefront</span>
          <p className="font-headline-md text-headline-md text-on-surface font-extrabold">
            Sin publicaciones en esta categoría
          </p>
          <p className="font-body-sm text-body-sm text-secondary">
            Probá otra categoría o sé el primero en publicar tu emprendimiento.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-space-sm">
          {filteredFeria.map((item) => {
            const canDelete = Boolean(user && (item.user_id === user.id || isAdmin));
            return (
              <article
                key={item.id}
                className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm flex flex-col border border-surface-container/50"
              >
                <div className="flex p-3 gap-space-sm">
                  <div className="w-24 h-24 rounded-lg bg-surface-container overflow-hidden flex-shrink-0">
                    <img className="w-full h-full object-cover" src={item.image} alt={item.title} />
                  </div>
                  <div className="flex flex-col justify-between min-w-0 flex-1">
                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-headline-lg-mobile text-headline-lg-mobile font-extrabold text-primary-container">
                          {item.price}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenReportModal(item)}
                            className="text-secondary hover:text-error p-1 rounded-full hover:bg-error-container/30 transition-colors"
                            title="Reportar publicación al Administrador"
                          >
                            <span className="material-symbols-outlined text-base">flag</span>
                          </button>
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => handleDeleteFeriaItem(item)}
                              className="text-error hover:opacity-80 p-0.5"
                              title="Eliminar publicación"
                            >
                              <span className="material-symbols-outlined text-base">delete</span>
                            </button>
                          )}
                        </div>
                      </div>
                      <h3 className="font-label-lg text-label-lg text-on-surface line-clamp-1 mt-0.5 font-extrabold">
                        {item.title}
                      </h3>
                      <p className="font-body-sm text-body-sm text-secondary line-clamp-2">
                        {item.subtitle}
                      </p>
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-surface-container/60">
                      <span className="font-label-sm text-label-sm text-secondary truncate">
                        Por: <strong className="text-on-surface font-bold">{item.seller}</strong> (
                        {item.zone})
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleOpenWhatsApp(
                            item.phone,
                            `Hola ${item.seller}, vi tu aviso "${item.title}" (${item.price}) en Mulitas Emprendedoras de Comuna Rider Jujuy.`,
                            item
                          )
                        }
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-tertiary-container text-on-tertiary-container font-label-sm text-label-sm font-bold active:scale-95 transition-transform flex-shrink-0"
                      >
                        <span className="material-symbols-outlined text-sm">chat</span>
                        Charlar
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* LIGHTBOX ADMIN: Ampliar Foto de Perfil para Verificar */}
      {expandedPhotoUser && (
        <div
          onClick={() => setExpandedPhotoUser(null)}
          className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-surface-container-lowest w-full max-w-sm rounded-2xl p-space-md shadow-2xl space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-headline-md text-headline-md text-on-surface font-extrabold truncate">
                  {expandedPhotoUser.full_name || 'Solicitante'}
                </h3>
                <p className="font-body-sm text-[11px] text-secondary truncate">
                  {expandedPhotoUser.email}
                  {expandedPhotoUser.whatsapp ? ` • ${expandedPhotoUser.whatsapp}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setExpandedPhotoUser(null)}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-secondary flex-shrink-0"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden bg-surface-container border border-surface-container-high">
              <img
                src={expandedPhotoUser.avatar_url || DEFAULT_AVATAR_URL}
                alt={expandedPhotoUser.full_name || 'Foto de perfil'}
                className="w-full max-h-[60vh] object-contain mx-auto"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleAdminPhotoDecision(expandedPhotoUser, true)}
                className="h-11 rounded-xl bg-tertiary-container text-on-tertiary-container font-label-sm text-label-sm font-extrabold flex items-center justify-center gap-1 active:scale-95"
              >
                <span className="material-symbols-outlined text-base">check_circle</span>
                Aprobar (N3)
              </button>
              <button
                type="button"
                onClick={() => handleAdminPhotoDecision(expandedPhotoUser, false)}
                className="h-11 rounded-xl bg-error-container text-on-error-container font-label-sm text-label-sm font-extrabold flex items-center justify-center gap-1 active:scale-95"
              >
                <span className="material-symbols-outlined text-base">close</span>
                Rechazar Foto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: PUBLICAR EN MULITAS EMPRENDEDORAS (Solo usuarios con foto + aprobación) */}
      {isPublishModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest w-full max-w-md max-h-[88vh] overflow-y-auto rounded-2xl p-space-md shadow-2xl space-y-space-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary-container">sell</span>
                <h3 className="font-headline-md text-headline-md text-on-surface font-extrabold">
                  Publicar en Mulitas Emprendedoras
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPublishModalOpen(false)}
                className="p-1 rounded-full text-secondary hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-2xl">close</span>
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-label-sm text-label-sm text-secondary font-bold mb-1">
                  Rubro / Categoría
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {FERIA_CATEGORIES.filter((c) => c.id !== 'all').map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setItemSubCategory(cat.id)}
                      className={`py-2 px-2.5 rounded-xl font-label-sm text-label-sm font-bold flex items-center gap-1.5 ${
                        itemSubCategory === cat.id
                          ? 'bg-primary-container text-on-primary-container'
                          : 'bg-surface-container text-on-surface'
                      }`}
                    >
                      <span className="material-symbols-outlined text-sm">{cat.icon}</span>
                      <span className="truncate">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-label-sm text-label-sm text-secondary font-bold mb-1">
                  ¿Qué vendés o ofrecés?
                </label>
                <input
                  value={itemTitle}
                  onChange={(e) => setItemTitle(e.target.value)}
                  className="w-full h-11 px-3 rounded-lg bg-surface-container font-body-md text-body-md text-on-surface focus:outline-none"
                  placeholder="Ej: Cubierta Rinaldi 18, soporte celu, viandas..."
                  type="text"
                />
              </div>

              <div>
                <label className="block font-label-sm text-label-sm text-secondary font-bold mb-1">
                  Detalle / Estado / Horarios
                </label>
                <input
                  value={itemSubtitle}
                  onChange={(e) => setItemSubtitle(e.target.value)}
                  className="w-full h-11 px-3 rounded-lg bg-surface-container font-body-md text-body-md text-on-surface focus:outline-none"
                  placeholder="Ej: Impermeable, entrega en zona centro..."
                  type="text"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-label-sm text-label-sm text-secondary font-bold mb-1">
                    Precio ($ARS)
                  </label>
                  <input
                    value={itemPrice}
                    onChange={(e) => setItemPrice(e.target.value)}
                    className="w-full h-11 px-3 rounded-lg bg-surface-container font-body-md text-body-md text-on-surface focus:outline-none"
                    placeholder="$25.000"
                    type="text"
                  />
                </div>
                <div>
                  <label className="block font-label-sm text-label-sm text-secondary font-bold mb-1">
                    Zona Jujuy
                  </label>
                  <select
                    value={itemZone}
                    onChange={(e) => setItemZone(e.target.value)}
                    className="w-full h-11 px-3 rounded-lg bg-surface-container font-body-md text-body-md text-on-surface focus:outline-none"
                  >
                    <option>Centro</option>
                    <option>Los Perales</option>
                    <option>Cuyaya</option>
                    <option>Alto Comedero</option>
                    <option>Chijra</option>
                    <option>Palpalá</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-label-sm text-label-sm text-secondary font-bold mb-1">
                  Foto del Producto (Opcional)
                </label>
                <div className="flex items-center gap-2">
                  <img
                    src={customProductImage || PRODUCT_IMAGES[itemSubCategory]}
                    alt="Vista previa"
                    className="w-12 h-12 rounded-lg object-cover border border-surface-container"
                  />
                  <label className="px-3 py-2 rounded-full bg-surface-container text-on-surface font-label-sm text-label-sm font-bold cursor-pointer flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">add_a_photo</span>
                    <span>Subir foto propia</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleProductImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                disabled={savingItem}
                onClick={handlePublishItem}
                className="w-full h-12 bg-primary-container text-on-primary-container rounded-full font-label-lg text-label-lg font-bold shadow-md active:scale-95 transition-transform"
              >
                {savingItem ? 'Publicando en Supabase...' : 'Publicar en Mulitas Emprendedoras'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL AVISO RESPONSABILIDAD PREVIO A WHATSAPP */}
      {whatsAppConfirmData && (
        <div
          onClick={() => setWhatsAppConfirmData(null)}
          className="fixed inset-0 z-[115] bg-black/65 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-surface-container-lowest w-full max-w-sm rounded-2xl p-space-md shadow-2xl space-y-3"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full bg-amber-500/15 text-amber-700 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-2xl">info</span>
              </div>
              <div className="min-w-0">
                <h3 className="font-headline-md text-headline-md text-on-surface font-extrabold leading-tight">
                  Antes de contactar al vendedor
                </h3>
                <p className="font-body-sm text-[11px] text-secondary truncate">
                  {whatsAppConfirmData.title} • {whatsAppConfirmData.seller}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container-high font-body-sm text-body-sm text-on-surface leading-relaxed space-y-1.5">
              <p>
                <strong>Comuna Rider</strong> es una herramienta gratuita y comunitaria para
                repartidores. No cobra comisiones ni interviene en las ventas, por lo que{' '}
                <strong>no asume responsabilidad</strong> por los productos publicados ni los acuerdos
                entre integrantes.
              </p>
              <p className="text-[11px] text-secondary font-bold">
                💡 Revisá siempre el producto en persona antes de realizar pagos.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setWhatsAppConfirmData(null)}
                className="h-11 rounded-full bg-surface-container text-secondary font-label-md text-label-md font-bold active:scale-95"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleProceedToWhatsApp}
                className="h-11 rounded-full bg-tertiary-container text-on-tertiary-container font-label-md text-label-md font-extrabold flex items-center justify-center gap-1 shadow-md active:scale-95"
              >
                <span className="material-symbols-outlined text-base">chat</span>
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL REPORTAR PUBLICACIÓN (BANDERA COMUNITARIA) */}
      {reportingItem && (
        <div
          onClick={() => setReportingItem(null)}
          className="fixed inset-0 z-[115] bg-black/65 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-surface-container-lowest w-full max-w-sm rounded-2xl p-space-md shadow-2xl space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="material-symbols-outlined text-error text-2xl">flag</span>
                <div className="min-w-0">
                  <h3 className="font-headline-md text-headline-md text-on-surface font-extrabold leading-tight">
                    Reportar Publicación
                  </h3>
                  <p className="font-body-sm text-[11px] text-secondary truncate">
                    {reportingItem.title} • {reportingItem.seller}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReportingItem(null)}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-secondary flex-shrink-0"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {[
                'Posible estafa / perfil dudoso',
                'Producto prohibido o inapropiado',
                'Precio o descripción engañosa',
              ].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setReportReason(preset)}
                  className="px-2.5 py-1 rounded-full bg-surface-container text-on-surface font-label-sm text-[10px] font-bold hover:bg-error-container/40"
                >
                  {preset}
                </button>
              ))}
            </div>

            <div>
              <label className="block font-label-sm text-label-sm text-secondary font-bold mb-1">
                Motivo del reporte (lo revisará el Administrador)
              </label>
              <textarea
                rows={3}
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="Contanos qué viste mal en esta publicación..."
                className="w-full p-3 rounded-xl bg-surface-container font-body-sm text-body-sm text-on-surface focus:outline-none resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setReportingItem(null)}
                className="h-11 rounded-full bg-surface-container text-secondary font-label-md text-label-md font-bold"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={sendingReport}
                onClick={handleSubmitReport}
                className="h-11 rounded-full bg-error text-on-error font-label-md text-label-md font-extrabold flex items-center justify-center gap-1 shadow-md active:scale-95"
              >
                <span className="material-symbols-outlined text-base">send</span>
                {sendingReport ? 'Enviando...' : 'Enviar Reporte'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-inverse-surface text-inverse-on-surface px-4 py-2.5 rounded-full shadow-xl font-body-sm text-body-sm flex items-center gap-2 z-50 animate-in fade-in slide-in-from-bottom duration-200">
          <span className="material-symbols-outlined text-tertiary-fixed text-base">
            check_circle
          </span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
