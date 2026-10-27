# Fases de Implementación — Comuna Rider

> **INSTRUCCIÓN PARA EL AGENTE:** No avances a la siguiente fase sin la aprobación explícita del usuario. Detente al terminar cada una y reporta resultados.

---

### ✅ Fase 0 - Inicialización (COMPLETADA)
- Proyecto inicializado con React 19 + Vite 8 + Tailwind CSS 3.
- Instalados React Router v7 y Supabase SDK v2.
- Estructura base de carpetas creada (`src/components`, `src/pages`, `src/lib/supabase.js`).
- Dev server verificado en `http://localhost:5173`.

---

### 🧪 Fase 1 - Maquetado Base, Navegación y Adaptación de Stitch (LISTA PARA PRUEBA ✅)
- **Design System & Tokens:** Extender `tailwind.config.js` e `index.css` con la paleta de tokens M3, tipografía *Plus Jakarta Sans* e iconos *Material Symbols Outlined* según `DESIGN.md`.
- **Shell Móvil & Layout:** Contenedor responsivo PWA centrado (`max-w-md mx-auto min-h-screen pb-24`) con soporte para *safe-areas* móviles.
- **Navegación Global:** Componente `BottomNav` con las 4 rutas principales + botón flotante de SOS en el header/dock.
- **Conversión de Pantallas Stitch (HTML a JSX):**
  - `src/pages/MapaPage.jsx`: Vista radar y alertas viales (reutilizando maquetado Stitch de `mapa_jujuy_alertas_viales_y_zonas`).
  - `src/pages/TurnosPage.jsx`: Tablón comunitario de turnos (`tabl_n_de_turnos_jujuy`).
  - `src/pages/CalculadoraPage.jsx`: Calculadora de rendición y ganancias (`calculadora_de_rendici_n_y_ganancias`).
  - `src/pages/DirectorioPage.jsx`: Guía de repuesteras, gomerías y mercado (`directorio_mercado_cadete_jujuy`).
- **Resolución de Brechas UI detectadas en Stitch:**
  - 🧩 **Hub / Home (`src/pages/HubPage.jsx`):** Stitch solo proveyó `DESIGN.md` sin código. Se maquetará la pantalla principal "Cadete Hub Jujuy" (resumen de estado operativo, accesos rápidos, clima/tarifa dinámica y accesos directos).
  - 🧩 **Maquetado de Auth & Perfil:** Crear interfaces preliminares para Login/Registro (`src/pages/LoginPage.jsx`) y Perfil de usuario (`src/pages/PerfilPage.jsx`), las cuales no venían en el paquete de Stitch pero son requeridas por las fases posteriores.

---

### ⏳ Fase 2 - Autenticación, Perfiles y Roles
- **Integración Supabase Auth:** Login con Google y Email/Password.
- **Gestión de Perfil:** Pantalla "Mi Perfil" con nivel de cadete, vehículo (moto/bici), zona frecuente y estadísticas.
- **Sistema de Roles:**
  - *Anónimo:* Solo lectura en mapa y directorio.
  - *Cadete Registrado:* Puede reportar alertas en 1-tap y confirmar incidentes.
  - *Cadete Verificado:* Acceso al intercambio de turnos en el tablón.
  - *Cadete Emprendedor:* Habilitado para publicar productos en el mercado local.
- **Control de Acceso en UI:** Bloqueo/deshabilitación condicional de botones ("Reportar Alerta", "Publicar Turno", "Vender") con redirección o modal hacia el Login para no autenticados.

---

### ⏳ Fase 3 - Módulo de Mapa Interactivo y Alertas Seguras
- **Resolución de Brecha - Mapa Real:** Sustituir la imagen estática de Stitch por un mapa interactivo (Leaflet o MapLibre) enfocado en San Salvador de Jujuy, Alto Comedero, Cuyaya, Los Perales y La Viña.
- **Pines Georreferenciados en Tiempo Real:** Integración con tabla de Supabase (con `user_id` obligatorio) para reportes de:
  - Controles de tránsito y grúas (Rotonda Chango Más, Acceso Sur, etc.).
  - Badenes crecidos y lluvias/inundaciones (colectora Chijra).
  - Gomerías y auxilio mecánico de turno.
  - Zonas rojas o alertas de seguridad.
- **Resolución de Brecha - Funcionalidad SOS:** Configurar la acción real del botón SOS (alerta con coordenadas GPS por WhatsApp comunitario / llamada de auxilio rápido / pin de emergencia en la base de datos).

---

### ⏳ Fase 4 - Tablón de Turnos y Calculadora Financiera
- **Turnos Dinámicos:** Sistema en tiempo real de oferta/cesión de turnos entre cadetes verificados.
- **Calculadora Operativa:** Lógica reactiva para calcular rendimiento de nafta, recaudación en efectivo, tarifas con plus por clima (+25%) y balance neto del turno.

---

### ⏳ Fase 5 - Directorio Local, Marketplace y Preparación PWA
- **Directorio de Servicios:** Base de datos de gomerías 24h, talleres y repuesteras de Jujuy y Palpalá con llamada directa y estado de turno.
- **Mercado Cadete:** Catálogo de compra/venta de repuestos, accesorios e indumentaria para cadetes emprendedores.
- **Optimización PWA:** Configuración de `manifest.json`, iconografía y soporte para guardado en pantalla de inicio del teléfono móvil.