# Fases de Implementación — Comuna Rider

> **INSTRUCCIÓN PARA EL AGENTE:** No avances a la siguiente fase sin la aprobación explícita del usuario. Detente al terminar cada una y reporta resultados.

---

### ✅ Fase 0 - Inicialización (COMPLETADA)
- Proyecto inicializado con React 19 + Vite 8 + Tailwind CSS 3.
- Instalados React Router v7 y Supabase SDK v2.
- Estructura base de carpetas creada (`src/components`, `src/pages`, `src/lib/supabase.js`).
- Dev server verificado en `http://localhost:5173`.

---

### ✅ Fase 1 - Maquetado Base, Navegación y Adaptación de Stitch (COMPLETADA)
- **Design System & Tokens:** Extender `tailwind.config.js` e `index.css` con la paleta de tokens M3, tipografía *Plus Jakarta Sans* e iconos *Material Symbols Outlined* según `DESIGN.md`.
- **Shell Móvil & Layout:** Contenedor responsivo PWA centrado (`max-w-md mx-auto min-h-screen pb-24`) con soporte para *safe-areas* móviles.
- **Navegación Global:** Componente `BottomNav` con las 4 rutas principales + botón flotante de SOS en el header/dock.
- **Conversión de Pantallas Stitch (HTML a JSX):**
  - `src/pages/MapaPage.jsx`: Vista radar y alertas viales (reutilizando maquetado Stitch de `mapa_jujuy_alertas_viales_y_zonas`).
  - `src/pages/TurnosPage.jsx`: Tablón comunitario de turnos (`tabl_n_de_turnos_jujuy`).
  - `src/pages/CalculadoraPage.jsx`: Calculadora de rendición y ganancias (`calculadora_de_rendici_n_y_ganancias`).
  - `src/pages/DirectorioPage.jsx`: Guía de repuesteras, gomerías y mercado (`directorio_mercado_cadete_jujuy`).

---

### ✅ Fase 2 - Autenticación, Perfiles y Roles (COMPLETADA)
- **Integración Supabase Auth (`src/context/AuthContext.jsx`):** Login y registro con Email/Password y Google OAuth asignando por defecto el rol Nivel 2 (`cadete_verificado`).
- **Gestión de Perfil (`src/pages/PerfilPage.jsx`):** Vista "Mi Perfil" accesible desde el botón de perfil en `Header.jsx` para gestionar estado (`Disponible` / `En Pausa`), vehículo (`Moto` / `Bici`), zona de Jujuy y nivel de acceso (`USUARIOS.md`).
- **Esquema SQL y Políticas RLS (`supabase/schema.sql`):** Tablas `profiles`, `alerts`, `shifts` y `directory_items` con Row Level Security vinculando cada escritura a `auth.uid() = user_id`.

---

### ✅ Fase 3 - Módulo de Mapa Interactivo y Alertas Seguras (COMPLETADA)
- **Mapa Real Interactivo (`src/components/JujuyMap.jsx`):** Mapa con Leaflet y OpenStreetMap centrado en San Salvador de Jujuy, Alto Comedero, Cuyaya, Chijra, La Viña, Los Perales y Palpalá.
- **Pines Georreferenciados en Supabase:** Creación y borrado de pines (Controles en Rotonda Chango Más, Badenes/Lluvia, Gomerías, Zonas Rojas y SOS) restringidos a usuarios autenticados con trazabilidad (`user_id`).

---

### ✅ Fase 4 - Tablón de Turnos y Calculadora Financiera (COMPLETADA)
- **Turnos Dinámicos (`src/pages/TurnosPage.jsx`):** Sistema en tiempo real con Supabase (`public.shifts`) de oferta, cesión, permuta y **eliminación de turnos publicados** entre cadetes verificados, con filtrado por día y zona.
- **Calculadora Operativa (`src/pages/CalculadoraPage.jsx`):** Lógica reactiva para calcular rendimiento de nafta YPF, recaudación en efectivo, tarifas con plus por clima (+25%), gastos extra, **saldo neto en efectivo tras restar gastos**, ganancia neta de bolsillo, historial de cierres guardados y reporte por WhatsApp.

---

### ✅ Fase 5 - Directorio Local, Marketplace y Preparación PWA (COMPLETADA)
- **Directorio de Servicios (`src/pages/DirectorioPage.jsx`):** Base de datos de gomerías 24h, talleres, repuesteras y líneas directas de cocina de San Salvador de Jujuy, Alto Comedero y Palpalá con buscador instantáneo sin tildes (`"Gomería"`, `"Palpalá"`), llamada directa, WhatsApp y navegación Google Maps.
- **Mercado Cadete (`Feria Cadete Jujuy`):** Catálogo en tiempo real (`public.directory_items`) de compra/venta de mochilas, cascos, indumentaria y repuestos para cadetes emprendedores (Nivel 3) con sello "Vendedor Confiable".
- **Optimización PWA (`public/manifest.json`, `public/icon.svg`, `public/sw.js`):** Manifiesto web, iconografía oficial y Service Worker para instalar la aplicación en la pantalla de inicio del teléfono móvil.