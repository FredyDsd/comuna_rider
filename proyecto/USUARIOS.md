# Sistema de Perfiles y Roles de Usuario (Supabase Auth)

Para garantizar la seguridad del mapa y evitar sabotajes, la plataforma requiere niveles de acceso.

## Roles del Sistema

### 1. Nivel 1: "Visitante / Novato" (No registrado)
- **Permisos:** Solo lectura. Puede ver el Mapa de Alertas, el Tablón de Turnos y usar las calculadoras libremente[cite: 2].
- **Restricciones:** No puede agregar pines al mapa, no puede publicar turnos, no puede publicar ventas.

### 2. Nivel 2: "Cadete Verificado" (Usuario registrado)
- **Validación:** Registro mediante Supabase (Email/Contraseña o Google).
- **Permisos:** Puede publicar/tomar turnos y colocar "Pines de Alerta" en el mapa[cite: 2]. Cada acción se guarda con su ID.

### 3. Nivel 3: "Cadete Emprendedor / Vendedor"
- **Permisos:** Todo lo del Nivel 2. Además, está habilitado para publicar en la sección "Mercado Cadete" (venta de mochilas, cascos, etc.)[cite: 2]. Su perfil mostrará un distintivo de "Vendedor Confiable".

### 4. Administrador (Dueño del sistema)
- **Permisos:** Puede borrar alertas falsas, banear usuarios conflictivos y moderar el mercado y tablón.