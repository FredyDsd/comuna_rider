# Contexto del Proyecto: Comuna Rider

## ¿Qué es?
App móvil-first (PWA) para **cadetes/repartidores de Jujuy**, orientada a San Salvador de Jujuy, Alto Comedero y La Viña.

## Stack Tecnológico
- **Frontend:** React 19 + Vite 8 + Tailwind CSS 3
- **Routing:** React Router v7
- **Backend/Auth/DB:** Supabase (PostgreSQL + Auth + Realtime)
- **Mapas:** A integrar en Fase 3 (centrado en Jujuy)

## Estructura del Proyecto
```
comuna_rider/
├── src/
│   ├── components/     # Componentes reutilizables (Fase 1+)
│   ├── pages/          # 4 pantallas principales (Fase 1+)
│   ├── lib/
│   │   └── supabase.js # Cliente Supabase (credenciales en .env)
│   ├── App.jsx         # Componente raíz
│   ├── main.jsx        # Entry point React
│   └── index.css       # Tailwind directives
├── proyecto/           # Documentación del proyecto
├── index.html
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── .env.example        # Template de variables de entorno
└── package.json
```

## Módulos Planificados
1. **Mapa de Alertas** — Pines de controles policiales, zonas rojas, SOS
2. **Tablón de Turnos** — Intercambio de turnos entre usuarios verificados
3. **Calculadora de Finanzas** — Rendimientos y efectivo
4. **Directorio Local** — Gomerías y repuesteras (Chijra, Palpalá)
5. **Mercado** — Publicaciones de ventas para "Cadete Emprendedor"

## Variables de Entorno Necesarias (Fase 2)
```
VITE_SUPABASE_URL=https://TU_PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key_aqui
```

## Notas Importantes
- **Fase 0 y Fase 1 completadas:** Stack inicializado, sistema de diseño Stitch / PedidosYa implementado y enrutamiento móvil operativo sin recarga.
- **Fase 2 (Siguiente):** Integración de Supabase Auth y perfiles de cadetes.
- Los usuarios no logueados solo pueden leer datos del mapa, NO escribir
- Los pines del mapa requieren `user_id` de Supabase