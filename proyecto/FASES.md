# Fases de Implementación — Comuna Rider

> **INSTRUCCIÓN PARA EL AGENTE:** Documentar fielmente cada hito ejecutado y mantener alineado el estado con `proyecto/DESICIONES.md`.

---

### ✅ Fase 0 - Inicialización (COMPLETADA)
- Proyecto inicializado con React 19 + Vite 8 + Tailwind CSS 3.
- Instalados React Router v7 (`react-router-dom`) y Supabase SDK v2 (`@supabase/supabase-js`).
- Estructura base de carpetas creada (`src/components`, `src/pages`, `src/lib/supabase.js`).

---

### ✅ Fase 1 - Maquetado Base, Navegación y Design System (COMPLETADA)
- **Design System & Tokens:** `tailwind.config.js` e `index.css` configurados con paleta roja/blanca estilo PedidosYa, tipografía *Plus Jakarta Sans* e iconos *Material Symbols Outlined*.
- **Shell Móvil & Layout:** Contenedor responsivo PWA centrado (`max-w-md mx-auto`) con soporte para *safe-areas* móviles.
- **Navegación Global:** `BottomNav.jsx` con 4 pestañas principales y botón global `SOS`.

---

### ✅ Fase 2 - Autenticación, Perfiles y Roles (COMPLETADA)
- **Integración Supabase Auth (`src/context/AuthContext.jsx`):** Login y registro con Email/Password y Google OAuth asignando por defecto rol base Nivel 1 (`ciudadano`) con foto por defecto (`DEFAULT_AVATAR_URL`), WhatsApp obligatorio al registrarse y soporte para 4 niveles (`ciudadano`, `cadete_verificado`, `cadete_emprendedor`, `admin`).
- **Gestión de Perfil (`src/pages/PerfilPage.jsx`):** Edición de vehículo, zona, estado (`Disponible` / `En Pausa`), WhatsApp, subida de foto de perfil propia (`360x360` JPEG) y Panel de Moderación para Nivel 4.
- **Esquema SQL y Políticas RLS (`supabase/schema.sql`):** Tablas `profiles`, `alerts`, `shifts` y `directory_items` con Row Level Security vinculando escrituras a `auth.uid() = user_id`.

---

### ✅ Fase 3 - Mapa Interactivo y Alertas con Expiración (COMPLETADA)
- **Mapa Full-Screen (`src/pages/MapaPage.jsx`, `src/components/JujuyMap.jsx`):** Mapa Leaflet y OpenStreetMap centrado en Jujuy a pantalla completa con panel inferior deslizable (bottom sheet) de 3 posiciones.
- **Alertas Georreferenciadas en Supabase:** Creación, consulta y borrado de pines (controles policiales, badenes, lluvia, gomerías, zonas rojas y SOS) con expiración automática a las 12 horas.

---

### ✅ Fase 4 - Tablón de Turnos y Calculadora Financiera (COMPLETADA)
- **Turnos Dinámicos (`src/pages/TurnosPage.jsx`):**
  - Integración en tiempo real con `public.shifts`.
  - Tira única horizontal desplazable de días sin botones de semana; oculta días pasados automáticamente y habilita la semana siguiente recién los **miércoles**.
  - Botón de publicar ubicado exclusivamente en **"Mis horarios"** tomando el teléfono automáticamente desde `profiles.whatsapp`.
- **Calculadora Operativa (`src/pages/CalculadoraPage.jsx`):** Rendición en tiempo real con combustible, plus por clima (+25%), gastos extra, saldo neto en efectivo, historial y reporte por WhatsApp.

---

### ✅ Fase 5 - Feria «Mulitas emprendedoras» y PWA (COMPLETADA)
- **Feria Rider Exclusiva (`src/pages/DirectorioPage.jsx`, pestaña `"Feria"`):** Catálogo en tiempo real (`public.directory_items`) exclusivo de **«Mulitas emprendedoras»** con filtros por categoría, búsqueda, borrado propio/admin y contacto directo por WhatsApp.
- **Optimización PWA (`public/manifest.json`, `public/icon.svg`, `public/sw.js`):** App instalable en dispositivos móviles.

---

### ✅ Fase 6 - Refinamiento UX, Seguridad Comunitaria y Despliegue (COMPLETADA)
- **Botón SOS Global Arrastrable (`src/components/Layout.jsx`):** Botón circular centrado con texto `SOS`, posicionamiento arrastrable libre con límites seguros (sin recortes en móviles), guardado en `localStorage` y oculto en `/perfil`.
- **Verificación de Foto para Publicar en Feria y Turnos:**
  - Redirección directa desde Feria y desde el modal de seguridad en Turnos hacia `/perfil` con resaltado de la tarjeta de foto de perfil (sin tarjeta de anuncio extra en `/perfil`).
  - En `/turnos`, publicar turnos también exige `hasApprovedPhoto`, mostrando un aviso cálido de espacio seguro comunitario si aún no cuenta con foto aprobada.
  - Auto-aprobación instantánea cuando el usuario tiene rol `admin`.
  - Compresión mejorada a `360x360` y modal Lightbox para que el Administrador amplíe la foto de solicitantes y usuarios antes de aprobar o rechazar.
  - Lógica completa de rechazo: restaura `DEFAULT_AVATAR_URL`, fija `verification_status = 'rejected'`, conserva `cadete_verificado` y permite reenvío al subir una nueva foto.
- **Control Comunitario y Exención de Responsabilidad en Feria:**
  - Eliminadas las etiquetas de `"Vendedor Confiable"` y `"Verificado"` en tarjetas de Feria.
  - Pop-up previo a WhatsApp aclarando el carácter gratuito y sin responsabilidad de Comuna Rider sobre ventas entre usuarios.
  - Botón de bandera (`flag`) para reportar publicaciones con motivo de texto y panel exclusivo para que el Administrador borre la publicación o descarte el reporte.
- **Producción:** Desplegado en Vercel (`https://comunarider.vercel.app`) sincronizado con `origin/master`.
