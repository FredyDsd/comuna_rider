# Criterios de Aprobación y Pruebas (Testing)

## Pruebas Base por Fase
- **Prueba Fase 0:** El proyecto compila sin errores (`npm run build`) y la conexión a Supabase está inicializada (`src/lib/supabase.js`).
- **Prueba Fase 1:** La aplicación se adapta a vista móvil sin recargar la página al navegar entre `Mapa`, `Turnos`, `Calculadora`, `Feria` y `Perfil`.
- **Prueba Fase 2:** Un usuario puede registrarse dejando guardado su perfil (incluyendo `whatsapp` y `DEFAULT_AVATAR_URL`) en `public.profiles` con rol inicial `ciudadano`.
- **Prueba Fase 3:** El mapa Leaflet se muestra a pantalla completa con bottom sheet de 3 niveles; un usuario autenticado puede agregar/borrar pines vinculados a su `user_id` y las alertas expiran tras 12 horas.
- **Prueba Fase 4:**
  - **Calculadora:** Calcula correctamente combustible, plus lluvia, gastos y saldo neto en efectivo.
  - **Turnos:** Solo muestra días vigentes, habilita los días de la semana siguiente a partir del miércoles, permite publicar únicamente dentro de **"Mis horarios"** usando el WhatsApp del perfil y permite eliminar turnos publicados.
- **Prueba Fase 5:** La pestaña inferior muestra **"Feria"** y abre **«Mulitas emprendedoras»** con búsqueda por categoría/texto y contacto por WhatsApp.

## Pruebas de Refinamiento UX, SOS y Verificación de Foto (Fase 6)
- **Botón SOS Arrastrable:**
  - Se visualiza circular y centrado (`SOS`), sin cortarse en `Mapa`, `Turnos`, `Calculadora` ni `Feria`.
  - Se puede arrastrar por la pantalla, conserva su posición entre vistas/recargas (`localStorage`) y **no aparece en `/perfil`**.
- **Publicar en Feria («Mulitas emprendedoras»):**
  - Un usuario sin foto aprobada que toca publicar en Feria es redirigido directamente a `/perfil` con la tarjeta de foto resaltada (y en `/perfil` no aparece ningún anuncio de "Permiso Feria").
  - Si un usuario con foto en estado `'pending'` toca publicar, ve el aviso de revisión pendiente.
  - Si un Administrador (`admin`) sube su foto, se aprueba automáticamente sin revisión previa y puede publicar al instante.
- **Zoom Admin y Rechazo de Foto:**
  - Al tocar la miniatura de un solicitante o usuario (en Feria o en el Panel de Moderación de `/perfil`), se abre el modal Lightbox ampliado con su foto `360x360`.
  - Al pulsar **Rechazar Foto**: desaparece de pendientes, `avatar_url` vuelve a `DEFAULT_AVATAR_URL`, `verification_status` pasa a `'rejected'`, un usuario `cadete_verificado` conserva su nivel 2 operativo y en su `/perfil` ve `❌ Foto rechazada por el Admin` pudiendo subir una nueva foto para volver a revisión.
- **Feria sin "Vendedor Confiable", Pop-up WhatsApp y Reportes:**
  - Las tarjetas de Feria no muestran `"Vendedor Confiable"` ni `"Verificado"`.
  - Al tocar **"Charlar"**, aparece el pop-up de exención de responsabilidad de Comuna Rider y solo al pulsar **"Continuar"** se abre WhatsApp.
  - Al tocar la bandera (`flag`), enviar un reporte con motivo lo envía al panel de reportes del Administrador en Feria (sin contaminar los pines del mapa) para poder borrar la publicación o descartar el reporte.
- **Requisito de Foto en Turnos:**
  - Un usuario sin foto aprobada que pulsa **Publicar** en **"Mis horarios"** ve el aviso de espacio seguro comunitario y puede ir directo a `/perfil` a subir su foto.
