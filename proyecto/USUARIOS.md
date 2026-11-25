# Sistema de Perfiles, Roles y Verificación de Foto (Supabase Auth)

Para abrir la participación comunitaria en el mapa de alertas a los vecinos de Jujuy y resguardar la confianza dentro del tablón de turnos y la feria **«Mulitas emprendedoras»**, la plataforma implementa 4 niveles de acceso respaldados por `public.profiles` y políticas RLS en Supabase.

## Roles del Sistema (`profiles.role`)

### 1. Nivel 1: "Ciudadano" (`ciudadano`) — Usuario registrado base
- **Asignación:** Rol por defecto al registrarse (`signUpWithEmail` / `signInWithGoogle`). Al crear la cuenta no se obliga a subir imagen inmediata; si no tiene foto propia usa `DEFAULT_AVATAR_URL`.
- **Permisos:**
  - Puede ver y aportar alertas viales/ciudadanas en el **Mapa de Jujuy** (cada alerta queda vinculada a su `user_id`).
  - No accede a **Turnos**, **Novedades** ni **Feria «Mulitas emprendedoras»** hasta ser verificado como Cadete (Nivel 2).
  - Puede cargar su foto de perfil y WhatsApp desde **Mi Perfil** (`/perfil`) para solicitar verificación como Cadete (N2).

### 2. Nivel 2: "Cadete Verificado" (`cadete_verificado`)
- **Validación:** Aprobado por un Administrador/Moderador (Nivel 4) tras validar su solicitud y número de WhatsApp.
- **Permisos:** Acceso completo al **Mapa de Alertas**, **Tablón de Turnos** (requiere además tener foto de perfil aprobada para publicar en "Mis horarios", tomando su `profiles.whatsapp`), **Novedades** (`/novedades`), **Feria «Mulitas emprendedoras»** (`/directorio`) y **Botón SOS**.
- **Publicación en Feria:** Aunque sea Nivel 2, para publicar avisos en **«Mulitas emprendedoras»** también debe cargar una foto de perfil propia y recibir aprobación del Administrador.

### 3. Nivel 3: "Cadete Emprendedor" (`cadete_emprendedor`)
- **Validación:** Usuario con foto de perfil real (`360x360` JPEG guardada en `profiles.avatar_url`) aprobada por un Administrador (`verification_status = 'approved'`).
- **Permisos:** Todo lo del Nivel 2, más permiso habilitado para publicar productos y emprendimientos en la Feria **«Mulitas emprendedoras»** (`/directorio`). Las tarjetas no muestran sello de "Vendedor Confiable"; cualquier compañero puede reportar avisos mediante el ícono de bandera (`flag`).

### 4. Nivel 4: "Administrador Común" (`admin`, `score != 100`) y "Super Admin" (`admin`, `score = 100`)
- **Admin Común (`isAdmin && !isSuperAdmin`):**
  - Acceso completo al panel de control limpio en `/moderador` (desde la pestaña `"Moderador"` en `BottomNav.jsx`), además de Novedades y Feria.
  - Puede aprobar/rechazar solicitudes de cadetes (N2) y fotos para Feria (N3), ampliar fotos (Lightbox), borrar alertas/reportes, publicar avisos oficiales y banear usuarios Nivel 1 a 3.
  - **Restricción de jerarquía:** **No puede** nombrar nuevos administradores ni modificar, degradar o banear a otros Administradores o al Super Admin.
- **Super Admin (`isSuperAdmin` — cuenta fundadora `mfdiony@gmail.com` / `score = 100`):**
  - Tiene todas las facultades del Administrador Común, y además es el **único** con permiso para **nombrar nuevos Administradores** o **degradar/banear a Administradores comunes** desde `/moderador`. Su propia cuenta queda protegida frente a modificaciones de terceros.

## Flujo Completo de Foto de Perfil y Rechazo
1. **Desde Feria (`/directorio`):** Si un usuario sin permiso vigente intenta publicar:
   - Si no inició sesión, no subió foto propia o su foto fue rechazada: redirige directamente a `/perfil` haciendo scroll y resaltando la tarjeta **Mi Foto de Perfil** (no se muestran anuncios ni modales extra en Feria o Perfil).
   - Si ya subió foto y está en revisión (`verification_status = 'pending'`), un toast le informa que su foto aguarda aprobación del Administrador.
2. **Al subir la foto en `/perfil`:**
   - `compressAvatarFile` redimensiona y comprime la imagen a `360x360` JPEG.
   - Si el usuario no es `admin`, pasa automáticamente a `verification_status = 'pending'` e ingresa en la cola del Administrador.
3. **Al aprobar el Administrador (Lightbox o tarjeta):**
   - Pasa a `role = 'cadete_emprendedor'`, `verification_status = 'approved'`, `is_banned = false`.
4. **Al rechazar el Administrador (`Rechazar Foto`):**
   - Restaura `avatar_url = DEFAULT_AVATAR_URL` (elimina la imagen rechazada).
   - Marca `verification_status = 'rejected'`.
   - **No degrada a los cadetes:** si el usuario tenía `cadete_emprendedor` vuelve a `cadete_verificado`; si era `cadete_verificado` o `ciudadano`, mantiene su rol operativo actual.
   - Desaparece de la lista de pendientes del Administrador y ve en `/perfil` el estado **`❌ Foto rechazada por el Admin`** junto con la indicación para volver a subir una foto clara (lo que reinicia `verification_status = 'pending'`).
