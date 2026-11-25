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
- **Regla 8 (Documentación Siempre Actualizada):** Mantener actualizados siempre los archivos `.md` dentro de la carpeta `proyecto/` ante cada cambio funcional, visual o de negocio.
