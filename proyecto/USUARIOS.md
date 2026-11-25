# Sistema de Perfiles, Roles y Verificación de Foto (Supabase Auth)

Para abrir la participación comunitaria en el mapa de alertas a los vecinos de Jujuy y resguardar la confianza dentro del tablón de turnos y la feria **«Mulitas emprendedoras»**, la plataforma implementa 4 niveles de acceso respaldados por `public.profiles` y políticas RLS en Supabase.

## Roles del Sistema (`profiles.role`)

### 1. Nivel 1: "Ciudadano" (`ciudadano`) — Usuario registrado base
- **Asignación:** Rol por defecto al registrarse (`signUpWithEmail` / `signInWithGoogle`). Al crear la cuenta no se obliga a subir imagen inmediata; si no tiene foto propia usa `DEFAULT_AVATAR_URL`.
- **Permisos:**
  - Puede ver y aportar alertas viales/ciudadanas en el **Mapa de Jujuy** (cada alerta queda vinculada a su `user_id`).
  - Puede consultar el catálogo de **Feria «Mulitas emprendedoras»**.
  - Puede cargar su foto de perfil y WhatsApp desde **Mi Perfil** (`/perfil`) para solicitar verificación como Cadete (N2) o habilitación para Feria (N3).

### 2. Nivel 2: "Cadete Verificado" (`cadete_verificado`)
- **Validación:** Aprobado por un Administrador/Moderador (Nivel 4) tras validar su solicitud y número de WhatsApp.
- **Permisos:** Acceso completo al **Mapa de Alertas**, **Tablón de Turnos** (requiere además tener foto de perfil aprobada para publicar en "Mis horarios", tomando su `profiles.whatsapp`), **Novedades** (`/novedades`) y **Botón SOS**.
- **Publicación en Feria:** Aunque sea Nivel 2, para publicar avisos en **«Mulitas emprendedoras»** también debe cargar una foto de perfil propia y recibir aprobación del Administrador.

### 3. Nivel 3: "Cadete Emprendedor" (`cadete_emprendedor`)
- **Validación:** Usuario con foto de perfil real (`360x360` JPEG guardada en `profiles.avatar_url`) aprobada por un Administrador (`verification_status = 'approved'`).
- **Permisos:** Todo lo del Nivel 2, más permiso habilitado para publicar productos y emprendimientos en la Feria **«Mulitas emprendedoras»** (`/directorio`). Las tarjetas no muestran sello de "Vendedor Confiable"; cualquier compañero puede reportar avisos mediante el ícono de bandera (`flag`).

### 4. Nivel 4: "Administrador / Moderador" (`admin`)
- **Permisos:**
  - Acceso completo a todas las herramientas operativas, **Novedades** y Feria.
  - **Avisos Oficiales:** Es el único rol habilitado para publicar y eliminar avisos oficiales en `/novedades` (con prioridad `info`, `importante` o `urgente` y vencimiento automático).
  - **Auto-aprobación de foto:** Si un Administrador sube su propia foto de perfil, queda aprobada automáticamente (`verification_status = 'approved'`) sin requerir aprobación previa.
  - Acceso al **Panel de Moderación** en `/perfil` y al bloque administrativo rápido en **Feria**:
    - Tocar cualquier miniatura de solicitante o usuario abre un **modal Lightbox ampliado** para verificar claramente el rostro/identidad en la foto.
    - Puede **Aprobar N2** (`cadete_verificado`), **Aprobar N3 / Feria** (`cadete_emprendedor`), **Rechazar foto** o **Banear/Desbanear** usuarios (`is_banned`).
    - Puede eliminar alertas falsas o publicaciones inapropiadas.

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
