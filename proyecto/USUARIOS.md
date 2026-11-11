# Sistema de Perfiles y Roles de Usuario (Supabase Auth)

Para abrir la participación comunitaria en el mapa de alertas a los vecinos de Jujuy mientras se resguardan las herramientas operativas exclusivas para repartidores, la plataforma implementa 4 niveles de acceso administrados por los Moderadores de los grupos de WhatsApp.

## Roles del Sistema

### 1. Nivel 1: "Ciudadano" (`ciudadano`) — Usuario registrado base
- **Asignación:** Rol por defecto al registrarse en la aplicación.
- **Permisos:**
  - Puede ver y aportar alertas viales/ciudadanas en el **Mapa de Jujuy** (cada alerta queda vinculada a su ID).
  - Puede consultar el **Directorio de Servicios** (Gomerías 24hs, Talleres, etc.).
  - Puede enviar desde **Mi Perfil** una **Solicitud de Verificación de Cadete** ingresando su número de WhatsApp.
- **Restricciones de UI y Acceso:**
  - **No ve ni accede** a **Turnos**, **Calculadora** ni **Mercado Cadete** (ocultos en `BottomNav.jsx` y `Header.jsx`).

### 2. Nivel 2: "Cadete Verificado" (`cadete_verificado`)
- **Validación:** Aprobado por un Moderador (Nivel 4) tras validar su solicitud y número de WhatsApp en los grupos oficiales de cadetes.
- **Permisos:** Ve y utiliza **todas las herramientas de trabajo**: Mapa de Alertas, Tablón de Turnos, Calculadora Financiera, Botón SOS y Directorio completo (con vista del Mercado Cadete).

### 3. Nivel 3: "Emprendedor" (`cadete_emprendedor`)
- **Permisos:** Todo lo del Nivel 2. Además, está habilitado para publicar productos a la venta en el **Mercado Cadete** con el distintivo de "Vendedor Confiable".

### 4. Nivel 4: "Moderador" (`admin`) — Administradores de Grupos de WhatsApp
- **Permisos:**
  - Acceso al **Panel de Control / Moderación**.
  - Puede **aprobar o rechazar solicitudes de verificación** de Nivel 1 → Nivel 2 (o ascender a Nivel 3).
  - Puede borrar alertas falsas, moderar turnos/mercado y **banear usuarios** conflictivos (`is_banned = true`).
