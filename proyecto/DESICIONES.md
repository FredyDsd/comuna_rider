# Historial de Decisiones y Correcciones

*Las reglas escritas aquí tienen prioridad máxima sobre cualquier otro documento.*
*Agente: Revisa este archivo constantemente antes de generar nuevo código.*

- **Regla 1 (Backend y Auth Exclusivos en Supabase):** Todo el stack backend, base de datos en tiempo real y autenticación debe manejarse única y exclusivamente con Supabase (`profiles`, `alerts`, `shifts`, `directory_items`).
- **Regla 2 (Mapa Full-Screen y Expiración de Alertas):** El mapa interactivo Leaflet ocupa toda la pantalla con un panel inferior deslizable (bottom sheet) de 3 estados. Las alertas viales expiradas se ocultan/limpian automáticamente tras 12 horas.
- **Regla 3 (Botón SOS Circular y Arrastrable):** El botón de emergencia es circular, muestra únicamente `SOS` centrado, es arrastrable libremente por la pantalla (con sujeción dentro del área segura para no cortarse y persistencia de posición en `localStorage`), y aparece en todas las pantallas **excepto en `/perfil`**.
- **Regla 4 (Tablón de Turnos Sin Botones de Semana):**
  - Se eliminan los botones de "Semana Actual / Siguiente"; todos los días habilitados se muestran en una tira única desplazable horizontalmente.
  - Los días pasados desaparecen automáticamente al volverse obsoletos.
  - Recién cuando llega el **miércoles**, se habilitan todos los días de la semana siguiente (Lunes a Domingo).
  - La opción de publicar turnos existe únicamente dentro de **"Mis horarios"** (no duplicada cuando el tablón está vacío).
  - Al publicar un turno, el teléfono de contacto se toma automáticamente del perfil registrado (`profiles.whatsapp`) para evitar que el usuario lo cargue repetidamente.
- **Regla 5 (Feria Exclusiva «Mulitas emprendedoras»):** La ruta `/directorio` (etiquetada como **"Feria"** en la barra inferior `BottomNav.jsx`) muestra exclusivamente la feria rider **«Mulitas emprendedoras»**.
- **Regla 6 (Foto de Perfil Obligatoria y Redirección a Perfil):**
  - Al registrarse, si el usuario no sube imagen se le asigna una foto por defecto (`DEFAULT_AVATAR_URL`).
  - Para poder publicar en **«Mulitas emprendedoras»**, el usuario debe cargar una foto de perfil real (`360x360` JPEG comprimida vía `compressAvatarFile` y guardada en `profiles.avatar_url`) y contar con aprobación de un Administrador.
  - Si un usuario con rol **Administrador (`admin`)** sube su foto de perfil, queda aprobado automáticamente sin revisión previa.
  - No mostrar tarjetas de anuncio de permiso dentro de `/perfil`; si el usuario toca publicar en Feria sin foto aprobada (y sin revisión pendiente), se lo redirige directamente a `/perfil` enfocando la carga de foto.
- **Regla 7 (Zoom Admin y Lógica Completa de Rechazo de Foto):**
  - El Administrador puede tocar cualquier miniatura de foto de perfil (en Feria o en el Panel de Moderación de Perfil) para ampliarla en un modal Lightbox y aprobar o rechazar desde ahí.
  - Al rechazar una foto: se restaura `avatar_url` a `DEFAULT_AVATAR_URL` (eliminando la imagen rechazada), se establece `verification_status = 'rejected'`, **se conserva el rol operativo** (`cadete_verificado` no se degrada a `ciudadano`, y si era `cadete_emprendedor` vuelve a `cadete_verificado`), desaparece de las listas pendientes del admin y el usuario ve en `/perfil` el estado `❌ Foto rechazada por el Admin` para subir una nueva foto (lo que vuelve `verification_status` a `'pending'`).
- **Regla 8 (Sin Sello "Vendedor Confiable", Pop-up WhatsApp y Reporte Comunitario en Feria):**
  - Las tarjetas de publicación en **«Mulitas emprendedoras»** no muestran etiquetas de `"Vendedor Confiable"` ni `"Verificado"`.
  - Al presionar **"Charlar"** en Feria, se muestra primero un pop-up aclarando que **Comuna Rider** es una herramienta gratuita y comunitaria que no cobra comisiones ni asume responsabilidad por las ventas; recién al presionar **"Continuar"** se abre WhatsApp.
  - Cada tarjeta incluye un botón de bandera (`flag`) para que cualquier compañero autenticado reporte una publicación con motivo de texto; el Administrador visualiza los reportes en **«Mulitas emprendedoras»** para **Borrar Publicación** o **Descartar Reporte**.
- **Regla 9 (Foto de Perfil Aprobada Obligatoria en Turnos):** Para publicar horarios en `/turnos` también es requisito contar con foto de perfil propia aprobada por el Administrador; si falta, se muestra el aviso de espacio seguro con acceso directo a `/perfil`.
- **Regla 10 (Documentación Siempre Actualizada):** Mantener actualizados siempre los archivos `.md` dentro de la carpeta `proyecto/` ante cada cambio funcional, visual o de negocio.
- **Regla 11 (Reemplazo de Calculadora por Novedades — Nivel 2+):**
  - Se elimina la página y funcionalidad de Calculadora (`/calculadora` y `/noticias` redirigen a `/novedades`).
  - La pestaña en `BottomNav.jsx` se llama **"Novedades"** (`/novedades`), restringida a Cadetes desde Nivel 2 (`cadete_verificado`, `cadete_emprendedor`, `admin`).
  - **Avisos Oficiales:** Solo el Administrador (`admin`) puede publicar y borrar avisos (persistidos en `public.announcements` con fallback automático a `public.alerts` filtrados fuera del mapa). Si no hay avisos vigentes, la sección de avisos se oculta por completo y se muestran directamente las noticias.
  - **Noticias Automáticas Curadas (sin buscador ni filtros, máx. 7):** Se obtienen mediante la Vercel Serverless Function `/api/noticias` (`api/noticias.js`) desde Google News RSS Argentina (delivery de plataformas, nafta en surtidor sin spam bursátil, y tránsito/clima de Jujuy), decodificando el enlace real del medio y extrayendo previsualización OpenGraph (`og:image`, `og:description`, favicon y dominio) para mostrar tarjetas estilo portal de noticias.
