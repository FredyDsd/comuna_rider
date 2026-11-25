# Arquitectura del Sistema & Guía de Estética Móvil

## 1. Identidad Visual: PedidosYa Rider Jujuy
- **Paleta de Marca:**
  - Primario PedidosYa: `#EA0029` (Rojo Caramelo vibrante de alta visibilidad)
  - Primario Pressed/Contenedor: `#C60023` / `#BB001F`
  - Fondo de Superficie PWA: `#F4F5F7` (Gris pavimento neutro antireflejo bajo sol)
  - Tarjetas y Módulos: `#FFFFFF` con borde sutil `#E2E8F0` y radio `16px` (`rounded-xl` / `rounded-2xl`)
  - Éxito / Turno Activo: `#008659` / `#00B67A` (Verde esmeralda táctil)
  - Advertencias / Precaución vial: `#FFB800` / `#F59E0B` (Ámbar intenso)
  - Emergencia / SOS / Cupo: `#EF4444` / `#BA1A1A` (Rojo alerta)

- **Tipografía & Ergonomía en Ruta:**
  - Tipografía principal: **Plus Jakarta Sans** (altamente legible en manubrios de moto o bicicleta en movimiento).
  - Pesos: `500` (cuerpo base contra reflejos), `700` y `800` (encabezados de lectura rápida).
  - Iconografía: **Material Symbols Outlined**.

## 2. Shell Móvil & Layout (`src/components/Layout.jsx`)
- Ancho contenedor principal: `max-w-md mx-auto` simulando pantalla nativa de smartphone, con vista full-screen dedicada para el mapa en `/`.
- Altura y Safe Areas: adaptado para PWA con `pt-safe` en Header y `pb-safe` en BottomNav.
- Interacciones táctiles de 1-tap: botones de altura mínima `44px` - `48px`.
- **Botón SOS Global Arrastrable:**
  - Circular, rojo de alta visibilidad, con la palabra `SOS` centrada.
  - Puede arrastrarse libremente sobre la pantalla mediante pointer/touch events, con límites calculados según el viewport (`safe bounds`) para no quedar cortado por los bordes ni por `BottomNav`.
  - Persiste su última posición en `localStorage`.
  - Se muestra en todas las rutas **excepto en `/perfil`**.

## 3. Estructura de Enrutamiento SPA (`react-router-dom`)
- `/` (`MapaPage.jsx`): Mapa Leaflet full-screen centrado en Jujuy, clima actual, bottom sheet deslizable de 3 alturas y feed de incidentes/controles en vivo con expiración automática a las 12 horas.
- `/turnos` (`TurnosPage.jsx`): Tablón comunitario de cesión y permuta de turnos en Supabase (`public.shifts`). Tira única de tarjetas de días desplazable horizontalmente (oculta días pasados, habilita la semana siguiente recién los miércoles), publicación exclusiva desde **Mis horarios** y teléfono precargado desde `profiles.whatsapp`.
- `/novedades` (`NoticiasPage.jsx`, Nivel 2+): Avisos oficiales publicados exclusivamente por el Administrador (se ocultan si no hay avisos vigentes) y hasta 7 noticias curadas con previsualización real de portales (`og:image`, `og:description`, favicon y enlace directo) provistas por `api/noticias.js` sin buscador ni filtros. (`/calculadora` y `/noticias` redirigen automáticamente a `/novedades`).
- `/directorio` (`DirectorioPage.jsx`, pestaña **"Feria"** en `BottomNav.jsx`): Vista dedicada exclusivamente a la feria rider **«Mulitas emprendedoras»**. Incluye buscador/filtros por rubro, tarjetas de emprendimientos, panel rápido para que el Administrador revise/amplíe fotos pendientes y botón de publicar (redirige a `/perfil` si falta foto aprobada o avisa si está pendiente).
- `/perfil` (`PerfilPage.jsx`): Acceso por Email/Password o Google OAuth, edición de vehículo/zona/WhatsApp, carga y estado de foto de perfil propia (`360x360` JPEG en `profiles.avatar_url`), y **Panel de Moderación (Nivel 4)** con pestañas (`Solicitudes`, `Usuarios`, `Alertas`) y modal Lightbox para ampliar fotos antes de aprobar o rechazar.
- Componentes compartidos:
  - `Header.jsx`: Marca Comuna Rider, zona activa (`SSJ`), estado y acceso directo a `/perfil`.
  - `BottomNav.jsx`: Barra fija inferior con 4 rutas (`Mapa`, `Turnos`, `Novedades`, `Feria`).
  - `Layout.jsx`: Shell principal + botón SOS circular arrastrable.
