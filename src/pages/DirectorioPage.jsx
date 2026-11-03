import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const INITIAL_SERVICES = [
  {
    id: 'seed-serv-1',
    title: 'Gomería El Chaqueño',
    badge: '24 HS',
    desc: 'Parche vulcanizado moto & bici • Calibrado',
    address: 'Av. Almirante Brown 1420 (San Pedrito / Chijra)',
    distance: 'a 600m',
    discount: '15% OFF para riders PeYa mostrando mochila oficial.',
    phone: '+5493884123456',
    icon: 'tire_repair',
    category: 'gomerias',
  },
  {
    id: 'seed-serv-2',
    title: 'Repuestos San Salvador',
    badge: 'GUARDIA',
    desc: 'Piñones, cadenas reforzadas, cables embrague',
    address: 'Calle Iguazú esq. Ayacucho (Centro / Chijra)',
    phone: '+5493884889900',
    whatsapp: 'https://wa.me/5493884889900',
    icon: 'precision_manufacturing',
    category: 'mecanica',
  },
  {
    id: 'seed-serv-3',
    title: 'Taller & Gomería Palpalá Express',
    badge: 'REMOLQUE',
    desc: 'Auxilio en ruta 66 / Gomería y mecánica ligera',
    address: 'Av. Martijena 350 • Palpalá',
    phone: '+5493885112233',
    icon: 'two_wheeler',
    category: 'gomerias',
  },
];

const INITIAL_LOCALES = [
  {
    id: 'seed-loc-1',
    name: 'Grido Helados',
    desc: 'Belgrano Centro • Mostrador Cadetes',
    phone: '+5493884221100',
    icon: 'icecream',
  },
  {
    id: 'seed-loc-2',
    name: 'Franui / Rapanui SSJ',
    desc: 'Despacho exclusivo entregas rápidas',
    phone: '+5493884256677',
    icon: 'takeout_dining',
  },
  {
    id: 'seed-loc-3',
    name: 'Lomitería El Gaucho',
    desc: 'Alto Comedero • WhatsApp Cocina',
    phone: '+5493884992211',
    icon: 'lunch_dining',
  },
];

const INITIAL_FERIA = [
  {
    id: 'seed-feria-1',
    title: 'Mochila Térmica PeYa Oficial',
    subtitle: 'Impermeable con expansor térmico',
    price: '$22.000',
    badge: 'Seminuevo',
    seller: 'Rodrigo',
    zone: 'Zona Cuyaya',
    verifiedSeller: true,
    image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'seed-feria-2',
    title: 'Casco Integral LS2 Talle L',
    subtitle: 'Homologado con visor pinlock',
    price: '$45.000',
    badge: 'Impecable',
    seller: 'Cristian',
    zone: 'Chijra',
    verifiedSeller: true,
    image: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=300&q=80',
  },
];

const normalizeText = (str = '') =>
  str
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

export default function DirectorioPage() {
  const navigate = useNavigate();
  const { user, profile, canPublishFeria, isAdmin } = useAuth();

  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);

  const [itemTitle, setItemTitle] = useState('');
  const [itemSubtitle, setItemSubtitle] = useState('Excelente estado • Entrega en mano');
  const [itemPrice, setItemPrice] = useState('$25.000');
  const [itemZone, setItemZone] = useState('Centro');
  const [savingItem, setSavingItem] = useState(false);

  const [emergencyServices, setEmergencyServices] = useState(INITIAL_SERVICES);
  const [localRestaurants] = useState(INITIAL_LOCALES);
  const [marketplaceItems, setMarketplaceItems] = useState(INITIAL_FERIA);

  const categories = [
    { id: 'all', label: 'Todos' },
    { id: 'gomerias', label: 'Gomerías 24hs', icon: 'tire_repair' },
    { id: 'mecanica', label: 'Mecánica & Repuestos', icon: 'build' },
    { id: 'locales', label: 'Teléfonos Locales', icon: 'call' },
    { id: 'feria', label: 'Feria Cadete', icon: 'shopping_bag' },
  ];

  const fetchDirectoryItems = useCallback(async () => {
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
            subtitle: d.subtitle || 'Publicado por Cadete Emprendedor',
            price: d.price || '$20.000',
            badge: d.badge || 'Vendedor Confiable',
            seller: d.seller_name || 'Cadete Emprendedor',
            zone: d.zone || 'Centro',
            verifiedSeller: d.seller_verified ?? true,
            image:
              d.image_url ||
              'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=300&q=80',
            isFromDb: true,
          }));

        const dbServices = data
          .filter((d) => d.section === 'servicios' && d.category !== 'feria')
          .map((d) => ({
            id: d.id,
            user_id: d.user_id,
            title: d.title,
            badge: d.badge || '24 HS',
            desc: d.subtitle || '',
            address: d.address || d.zone,
            distance: d.distance,
            discount: d.discount,
            phone: d.phone || '+5493884123456',
            icon: d.icon || 'tire_repair',
            category: d.category || 'gomerias',
            isFromDb: true,
          }));

        setMarketplaceItems([...dbFeria, ...INITIAL_FERIA]);
        if (dbServices.length > 0) {
          setEmergencyServices([...dbServices, ...INITIAL_SERVICES]);
        }
      }
    } catch (err) {
      console.warn('Error cargando directory_items de Supabase:', err);
    }
  }, []);

  useEffect(() => {
    fetchDirectoryItems();
  }, [fetchDirectoryItems]);

  const handleOpenPublishModal = () => {
    if (!user) {
      if (
        window.confirm(
          '🔒 Acción restringida (Nivel 1: Visitante).\nPara publicar en el Mercado Cadete necesitás iniciar sesión con Nivel 3 (Cadete Emprendedor / Vendedor). ¿Ir a Mi Perfil?'
        )
      ) {
        navigate('/perfil');
      }
      return;
    }

    if (!canPublishFeria) {
      if (
        window.confirm(
          '🔒 Nivel requerido: Nivel 3 (Cadete Emprendedor / Vendedor).\nActualmente tenés Nivel 2 (Cadete Verificado). ¿Querés ir a Mi Perfil para activar tu rol de Cadete Emprendedor?'
        )
      ) {
        navigate('/perfil');
      }
      return;
    }

    setIsPublishModalOpen(true);
  };

  const handlePublishFeriaItem = async () => {
    if (!canPublishFeria || !user) {
      navigate('/perfil');
      return;
    }
    if (!itemTitle.trim()) {
      alert('Ingresá qué producto querés publicar.');
      return;
    }

    setSavingItem(true);
    const sellerName = profile?.full_name || user.email?.split('@')[0] || 'Cadete Emprendedor';
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
      seller_name: sellerName,
      seller_verified: true,
      image_url:
        'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=300&q=80',
      icon: 'shopping_bag',
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
            seller: data.seller_name,
            zone: data.zone,
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
          seller: newRow.seller_name,
          zone: newRow.zone,
          verifiedSeller: true,
          image: newRow.image_url,
        };
        setMarketplaceItems((prev) => [localItem, ...prev]);
      }

      setItemTitle('');
      setIsPublishModalOpen(false);
    } catch (err) {
      alert(`Error al publicar en Supabase: ${err.message}`);
    } finally {
      setSavingItem(false);
    }
  };

  const handleDeleteFeriaItem = async (item) => {
    if (!user) return;
    if (item.user_id !== user.id && !isAdmin) return;

    try {
      if (item.isFromDb && isSupabaseConfigured) {
        const { error } = await supabase.from('directory_items').delete().eq('id', item.id);
        if (error) throw error;
      }
      setMarketplaceItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch (err) {
      alert(`No se pudo borrar la publicación: ${err.message}`);
    }
  };

  const filterItem = (text) => {
    if (!searchQuery.trim()) return true;
    return normalizeText(text).includes(normalizeText(searchQuery));
  };

  const filteredServices = emergencyServices.filter((s) => {
    if (activeCategory === 'gomerias' && s.category !== 'gomerias') return false;
    if (activeCategory === 'mecanica' && s.category !== 'mecanica') return false;
    return filterItem(`${s.title} ${s.desc} ${s.address} ${s.badge}`);
  });

  const filteredLocales = localRestaurants.filter((l) =>
    filterItem(`${l.name} ${l.desc}`)
  );

  const filteredFeria = marketplaceItems.filter((m) =>
    filterItem(`${m.title} ${m.subtitle} ${m.seller} ${m.zone}`)
  );

  const showServicios =
    (activeCategory === 'all' || activeCategory === 'gomerias' || activeCategory === 'mecanica') &&
    filteredServices.length > 0;

  const showLocales =
    (activeCategory === 'all' || activeCategory === 'locales') &&
    filteredLocales.length > 0;

  const showFeria =
    (activeCategory === 'all' || activeCategory === 'feria') &&
    (filteredFeria.length > 0 || !searchQuery.trim());

  return (
    <div className="flex flex-col w-full pb-8 space-y-space-md pt-2">
      {/* Micro Banner Contextual Cadete Jujuy */}
      <div className="relative overflow-hidden rounded-xl bg-surface-container p-space-md shadow-sm border border-surface-container-high/60">
        <div className="flex items-center justify-between gap-space-sm">
          <div className="flex items-center gap-space-sm min-w-0">
            <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center flex-shrink-0 shadow-sm">
              <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                handshake
              </span>
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-label-lg text-label-lg text-on-surface truncate font-extrabold">
                  Comunidad Rider Jujuy
                </span>
                <span className="px-2 py-0.5 rounded-full bg-tertiary-container text-on-tertiary-container font-label-sm text-label-sm uppercase font-bold">
                  100% Activo
                </span>
              </div>
              <p className="font-body-sm text-body-sm text-secondary truncate">
                Auxilio rápido, repuestos y tratos entre compañeros
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end flex-shrink-0">
            <span className="font-label-sm text-label-sm text-tertiary font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse"></span>SSJ &amp; Palpalá
            </span>
          </div>
        </div>
      </div>

      {/* Buscador Táctil Alto Impacto */}
      <div className="relative w-full">
        <div className="flex items-center w-full h-12 bg-surface-container-lowest rounded-xl px-space-md shadow-sm border border-surface-container/60">
          <span className="material-symbols-outlined text-secondary mr-space-sm text-xl flex-shrink-0">
            search
          </span>
          <input
            id="directory-search"
            className="w-full bg-transparent font-body-md text-body-md text-on-surface placeholder:text-secondary focus:outline-none"
            placeholder="Buscar gomerías 24hs, Palpalá, Chijra, repuestos..."
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
      </div>

      {/* Pestañas de Navegación Segmentada (Pills Deslizables) */}
      <div className="flex gap-space-xs overflow-x-auto no-scrollbar py-0.5 -mx-space-md px-space-md">
        {categories.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-full font-label-md text-label-md transition-all shadow-sm flex items-center gap-1 ${
                isActive
                  ? 'bg-primary-container text-on-primary-container font-bold'
                  : 'bg-surface-container-lowest text-secondary hover:text-on-surface'
              }`}
            >
              {cat.icon && <span className="material-symbols-outlined text-sm">{cat.icon}</span>}
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* SECCIÓN 1: Servicios Esenciales de Ruta */}
      {showServicios && (
        <section className="space-y-space-sm">
          <div className="flex items-center justify-between px-0.5">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary-container text-lg">fmd_good</span>
              <h2 className="font-headline-md text-headline-md text-on-surface font-extrabold">
                Servicios de Emergencia
              </h2>
            </div>
            <span className="font-label-sm text-label-sm px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-bold">
              {filteredServices.length} Cercanos
            </span>
          </div>

          <div className="space-y-space-sm">
            {filteredServices.map((serv) => (
              <article
                key={serv.id}
                className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm space-y-space-sm border border-surface-container/50"
              >
                <div className="flex items-start justify-between gap-space-sm">
                  <div className="flex items-start gap-space-sm min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-primary-fixed text-on-primary-fixed flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span
                        className="material-symbols-outlined text-2xl"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        {serv.icon}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-label-lg text-label-lg text-on-surface truncate font-extrabold">
                          {serv.title}
                        </h3>
                        <span className="px-2 py-0.5 rounded-full bg-tertiary-container text-on-tertiary-container font-label-sm text-label-sm font-extrabold uppercase">
                          {serv.badge}
                        </span>
                      </div>
                      <p className="font-body-sm text-body-sm text-secondary truncate">{serv.desc}</p>
                      <p className="font-body-sm text-body-sm text-on-surface flex items-center gap-1 mt-0.5">
                        <span className="material-symbols-outlined text-xs text-primary-container">near_me</span>
                        {serv.address}{' '}
                        {serv.distance && (
                          <span className="font-bold text-primary">({serv.distance})</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {serv.discount && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-surface-container-low">
                    <span className="material-symbols-outlined text-primary-container text-lg flex-shrink-0">
                      local_activity
                    </span>
                    <p className="font-body-sm text-body-sm text-on-surface">{serv.discount}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-space-sm pt-1">
                  <a
                    className="flex items-center justify-center gap-1.5 h-11 bg-primary-container text-on-primary-container rounded-full font-label-md text-label-md font-bold active:scale-95 transition-transform shadow-sm"
                    href={`tel:${serv.phone}`}
                  >
                    <span className="material-symbols-outlined text-base">call</span>
                    Llamar Ahora
                  </a>
                  <button
                    type="button"
                    onClick={() => alert(`Abriendo navegación GPS a ${serv.title}`)}
                    className="flex items-center justify-center gap-1.5 h-11 bg-surface-container text-on-surface rounded-full font-label-md text-label-md font-bold active:scale-95 transition-transform"
                  >
                    <span className="material-symbols-outlined text-base text-secondary">navigation</span>
                    Ir en Maps
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* SECCIÓN 2: Teléfonos Directos de Locales Adheridos */}
      {showLocales && (
        <section className="space-y-space-sm pt-2">
          <div className="flex items-center justify-between px-0.5">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary-container text-lg">restaurant</span>
              <h2 className="font-headline-md text-headline-md text-on-surface font-extrabold">
                Líneas Directas de Cocina
              </h2>
            </div>
            <span className="font-body-sm text-body-sm text-secondary">Para demoras &gt;10m</span>
          </div>

          <div className="space-y-2">
            {filteredLocales.map((local) => (
              <div
                key={local.id}
                className="flex items-center justify-between p-3 rounded-xl bg-surface-container-lowest shadow-sm gap-space-sm border border-surface-container/50"
              >
                <div className="flex items-center gap-space-sm min-w-0">
                  <div className="w-10 h-10 rounded-full bg-secondary-container text-primary flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-xl">{local.icon}</span>
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-label-lg text-label-lg text-on-surface truncate font-extrabold">
                      {local.name}
                    </h4>
                    <p className="font-body-sm text-body-sm text-secondary truncate">{local.desc}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <a
                    className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-on-surface active:scale-90 transition-transform"
                    href={`tel:${local.phone}`}
                  >
                    <span className="material-symbols-outlined text-lg">phone_in_talk</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => alert(`Abriendo WhatsApp con la cocina de ${local.name}`)}
                    className="w-10 h-10 rounded-full bg-tertiary-container flex items-center justify-center text-on-tertiary-container active:scale-90 transition-transform"
                  >
                    <span className="material-symbols-outlined text-lg">chat</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* SECCIÓN 3: Feria Cadete Jujuy (Compra-Venta entre Repartidores) */}
      {showFeria && (
        <section className="space-y-space-sm pt-2">
          <div className="flex items-center justify-between px-0.5">
            <div className="flex items-center gap-1.5">
              <span
                className="material-symbols-outlined text-primary-container text-lg"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                storefront
              </span>
              <h2 className="font-headline-md text-headline-md text-on-surface font-extrabold">
                Feria Cadete Jujuy
              </h2>
            </div>
            <span className="font-label-sm text-label-sm px-2 py-0.5 rounded-full bg-primary-fixed text-primary font-bold">
              Nivel 3 • Vendedor Confiable
            </span>
          </div>

          <div className="grid grid-cols-1 gap-space-sm">
            {filteredFeria.map((item) => {
              const canDelete = user && (item.user_id === user.id || isAdmin);
              return (
                <article
                  key={item.id}
                  className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm flex flex-col border border-surface-container/50"
                >
                  <div className="flex p-3 gap-space-sm">
                    <div className="w-24 h-24 rounded-lg bg-surface-container overflow-hidden flex-shrink-0 relative">
                      <img className="w-full h-full object-cover" src={item.image} alt={item.title} />
                      <span className="absolute bottom-1 left-1 px-1.5 py-0.2 rounded bg-inverse-surface/80 text-inverse-on-surface font-label-sm text-[9px] uppercase font-bold">
                        {item.badge}
                      </span>
                    </div>
                    <div className="flex flex-col justify-between min-w-0 flex-1">
                      <div>
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-headline-lg-mobile text-headline-lg-mobile font-extrabold text-primary-container">
                            {item.price}
                          </span>
                          <div className="flex items-center gap-1">
                            {item.verifiedSeller && (
                              <span
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-tertiary-container/15 text-tertiary font-label-sm text-[9px] font-bold"
                                title="Distintivo Vendedor Confiable (Nivel 3)"
                              >
                                <span className="material-symbols-outlined text-xs">verified</span>
                                Confiable
                              </span>
                            )}
                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => handleDeleteFeriaItem(item)}
                                className="text-error hover:opacity-80"
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
                        <p className="font-body-sm text-body-sm text-secondary line-clamp-1">
                          {item.subtitle}
                        </p>
                      </div>
                      <div className="flex items-center justify-between mt-2 pt-1 border-t border-surface-container/60">
                        <span className="font-label-sm text-label-sm text-secondary truncate">
                          Por: <strong className="text-on-surface font-bold">{item.seller}</strong> ({item.zone})
                        </span>
                        <button
                          type="button"
                          onClick={() => alert(`Contactando a ${item.seller} por WhatsApp`)}
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

          <div className="pt-2">
            <button
              id="publish-ad-btn"
              onClick={handleOpenPublishModal}
              className="w-full flex items-center justify-center gap-2 h-12 bg-on-surface text-surface rounded-full font-label-lg text-label-lg font-bold active:scale-95 transition-transform shadow-md"
              type="button"
            >
              <span className="material-symbols-outlined text-xl text-primary-container">
                {canPublishFeria ? 'add_circle' : 'lock'}
              </span>
              {canPublishFeria
                ? 'Publicar aviso en la Feria Cadete'
                : 'Publicar en Feria (Requiere Nivel 3 Emprendedor)'}
            </button>
          </div>
        </section>
      )}

      {/* Modal Publicación en Feria */}
      {isPublishModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest w-full max-w-md max-h-[88vh] overflow-y-auto rounded-2xl p-space-md shadow-2xl space-y-space-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary-container">sell</span>
                <h3 className="font-headline-md text-headline-md text-on-surface font-extrabold">
                  Nuevo Aviso Cadete (Nivel 3)
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
                  ¿Qué vendés?
                </label>
                <input
                  value={itemTitle}
                  onChange={(e) => setItemTitle(e.target.value)}
                  className="w-full h-11 px-3 rounded-lg bg-surface-container font-body-md text-body-md text-on-surface focus:outline-none"
                  placeholder="Ej: Cubierta Rinaldi 18, soporte celu metálico..."
                  type="text"
                />
              </div>
              <div>
                <label className="block font-label-sm text-label-sm text-secondary font-bold mb-1">
                  Estado / Detalle
                </label>
                <input
                  value={itemSubtitle}
                  onChange={(e) => setItemSubtitle(e.target.value)}
                  className="w-full h-11 px-3 rounded-lg bg-surface-container font-body-md text-body-md text-on-surface focus:outline-none"
                  placeholder="Ej: Impermeable, poco uso..."
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
                    Zona SSJ
                  </label>
                  <select
                    value={itemZone}
                    onChange={(e) => setItemZone(e.target.value)}
                    className="w-full h-11 px-3 rounded-lg bg-surface-container font-body-md text-body-md text-on-surface focus:outline-none"
                  >
                    <option>Centro</option>
                    <option>Cuyaya</option>
                    <option>Alto Comedero</option>
                    <option>Chijra</option>
                    <option>Palpalá</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="pt-2">
              <button
                type="button"
                disabled={savingItem}
                onClick={handlePublishFeriaItem}
                className="w-full h-12 bg-primary-container text-on-primary-container rounded-full font-label-lg text-label-lg font-bold shadow-md active:scale-95 transition-transform"
              >
                {savingItem ? 'Publicando en Supabase...' : 'Publicar Ahora (Vendedor Confiable)'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
