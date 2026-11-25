# Contexto del Proyecto: Comuna Rider

## ¿Qué es?
App móvil-first (PWA) para **cadetes y repartidores de Jujuy**, enfocada en San Salvador de Jujuy, Alto Comedero, Chijra, Cuyaya, Los Perales, La Viña y Palpalá.
Desplegada en producción en Vercel: `https://comunarider.vercel.app`.

## Stack Tecnológico
- **Frontend:** React 19 + Vite 8 + Tailwind CSS 3
- **Routing:** React Router v7 (`react-router-dom`)
- **Backend / Auth / Realtime:** Supabase (PostgreSQL + Auth + RLS + Realtime)
- **Mapas:** Leaflet + OpenStreetMap (`src/components/JujuyMap.jsx`)

## Estructura Actual del Proyecto
```
comuna_rider/
├── public/
│   ├── icon.svg             # Ícono SVG PWA
│   ├── manifest.json        # Manifiesto PWA instalable
│   └── sw.js                # Service Worker
├── src/
│   ├── components/
│   │   ├── BottomNav.jsx    # Barra inferior fija (Mapa, Turnos, Calculadora, Feria)
│   │   ├── Header.jsx       # Cabecera superior con acceso a Perfil y estado online
│   │   ├── JujuyMap.jsx     # Mapa Leaflet interactivo centrado en Jujuy
│   │   └── Layout.jsx       # Shell móvil + botón global SOS circular y arrastrable
│   ├── context/
│   │   └── AuthContext.jsx  # Sesión Supabase Auth, roles, compresión de avatar 360x360
│   ├── lib/
│   │   └── supabase.js      # Cliente Supabase (.env o configuración en runtime)
│   ├── pages/
│   │   ├── MapaPage.jsx         # Mapa full-screen + bottom sheet + alertas 12h
│   │   ├── TurnosPage.jsx       # Tablón de turnos con tira móvil y regla del miércoles
│   │   ├── CalculadoraPage.jsx  # Cierre de caja, combustible y saldo neto
│   │   ├── DirectorioPage.jsx   # Feria exclusiva «Mulitas emprendedoras»
│   │   └── PerfilPage.jsx       # Auth, foto de perfil y Panel de Moderación (N4)
│   ├── App.jsx
│   ├── index.css
│   └── main.jsx
├── supabase/
│   └── schema.sql           # Tablas profiles, alerts, shifts, directory_items y políticas RLS
├── proyecto/                # Documentación viva del proyecto
├── index.html
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── .env.example
└── package.json
```

## Módulos Implementados
1. **Mapa de Alertas (`/`)** — Mapa Leaflet a pantalla completa con panel inferior deslizable de 3 estados, pines comunitarios en tiempo real (controles policiales, zonas rojas, badenes, lluvia, gomerías y SOS) y expiración automática a las 12 horas.
2. **Tablón de Turnos (`/turnos`)** — Intercambio/cesión de turnos entre cadetes en tira única desplazable horizontalmente; oculta días pasados, habilita la semana siguiente los miércoles, permite publicar solo desde **Mis horarios** y toma el WhatsApp del perfil (`profiles.whatsapp`).
3. **Calculadora de Finanzas (`/calculadora`)** — Rendición de caja interactiva, cálculo de nafta YPF, plus por clima (+25%), gastos extra, saldo neto, historial y reporte rápido por WhatsApp.
4. **Feria «Mulitas emprendedoras» (`/directorio`, pestaña `"Feria"`)** — Marketplace exclusivo para la comunidad rider. Requiere foto de perfil propia (`360x360`) aprobada por el Administrador (o subida directa si el usuario es `admin`).
5. **Mi Perfil y Panel de Moderación (`/perfil`)** — Registro/login con Email o Google, edición de datos/WhatsApp, carga de foto de perfil con envío automático a revisión y panel administrativo con ampliación de fotos (Lightbox), aprobación N2/N3 y rechazo.
6. **Botón SOS Global** — Botón circular rojo arrastrable por pantalla con persistencia de posición y oculto en `/perfil`.

## Variables de Entorno
```
VITE_SUPABASE_URL=https://TU_PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key_aqui
```

## Reglas Operativas Clave
- Los visitantes no logueados solo leen el mapa y el catálogo de Feria, no escriben en la base de datos.
- Cada escritura en `alerts`, `shifts` y `directory_items` requiere autenticación en Supabase y queda trazada con `user_id`.
- Toda regla vigente de negocio y UX se consulta en `proyecto/DESICIONES.md`.
