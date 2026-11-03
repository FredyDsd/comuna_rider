# Arquitectura y Diseño (UI/UX)

## Stack Tecnológico
- **Frontend:** PWA (Mobile-First) construida con React, Vite y Tailwind CSS.
- **Backend, Base de Datos y Auth:** Supabase para autenticación de usuarios y base de datos en tiempo real (vital para el mapa y chat de turnos)[cite: 2].
- **Mapas:** Integración de Leaflet con OpenStreetMap o Mapbox API[cite: 2].

## Autenticación y Seguridad
- **Servicio:** Supabase Auth[cite: 2].
- **Trazabilidad:** Cada acción de escritura en la base de datos (crear una alerta en el mapa, subir un turno, publicar en el mercado) DEBE estar vinculada al `user_id` de Supabase para auditar falsos reportes o sabotajes.

## Directrices Visuales Obligatorias (Estética PedidosYa)
Se debe utilizar EL CÓDIGO GENERADO PREVIAMENTE EN GOOGLE STITCH. Si el agente debe recrear componentes, debe respetar estrictamente:
- **Enfoque:** Mobile-First, botones grandes fáciles de tocar con una mano[cite: 2].
- **Colores:** 
  - Primario: Rojo PeYa (#EA0029 o #E21B23)[cite: 2].
  - Fondo general: Gris muy claro (#F4F5F7)[cite: 2].
  - Tarjetas (Cards): Blancas (#FFFFFF) con bordes redondeados (16px) y sombras sutiles[cite: 2].
  - Acentos: Verde confirmación (#00B67A) y Amarillo alerta (#FFB800)[cite: 2].
- **Navegación:** Bottom Navigation Bar fija en color blanco con 4 íconos grandes: Mapa, Turnos, Calculadora, Directorio[cite: 2].