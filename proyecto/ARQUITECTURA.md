# Arquitectura del Sistema & Guía de Estética Móvil

## 1. Identidad Visual: PedidosYa Rider Jujuy
- **Paleta de Marca:**
  - Primario PedidosYa: `#EA0029` (Rojo Caramelo vibrante de alta visibilidad)
  - Primario Pressed/Contenedor: `#C60023` / `#BB001F`
  - Fondo de Superficie PWA: `#F4F5F7` (Gris pavimento neutro antireflejo bajo sol)
  - Tarjetas y Módulos: `#FFFFFF` con borde sutil `#E2E8F0` y radio `16px` (`rounded-xl` / `rounded-2xl`)
  - Éxito / Turno Activo: `#008659` / `#00B67A` (Verde esmeralda táctil)
  - Advertencias / Precaución vial: `#FFB800` / `#F59E0B` (Ámbar intenso)
  - Emergencia / SOS / Cupo: `#EF4444` / `#BA1A1A` (Rojo alerta)

- **Tipografía & Ergonomía en Ruta:**
  - Tipografía principal: **Plus Jakarta Sans** (altamente legible en manubrios de moto o bicicleta en movimiento).
  - Pesos: `500` (cuerpo base contra reflejos), `700` y `800` (encabezados de lectura rápida).
  - Iconografía: **Material Symbols Outlined** (iconos limpios y universales).

## 2. Shell Móvil & Layout
- Ancho contenedor: `max-w-md mx-auto` simulando pantalla nativa de smartphone en cualquier viewport.
- Altura y Safe Areas: adaptado para PWA con `pt-safe` en Header y `pb-safe` en BottomNav.
- Interacciones táctiles de 1-tap: botones de altura mínima `44px` - `48px` para manipulación con guantes.

## 3. Estructura de Enrutamiento SPA (`react-router-dom`)
- `/` (`MapaPage`): Radar vial, clima de Jujuy, puntos de control policial / grúas y feed de incidentes en vivo.
- `/turnos` (`TurnosPage`): Tablón comunitario de cesión y permuta de franjas horarias con selector de días.
- `/calculadora` (`CalculadoraPage`): Cierre de caja interactivo con cálculo en tiempo real de combustible, tope de deuda ($50k) y ganancia neta.
- `/directorio` (`DirectorioPage`): Servicios de urgencia (gomerías 24h, repuesteras en Chijra y Palpalá), líneas de cocina y feria cadete.
- Componentes compartidos:
  - `Header.jsx`: Marca PedidosYa, zona activa ("SSJ"), estado online.
  - `BottomNav.jsx`: Barra de navegación fija inferior sin recarga de página (SPA).
  - `Layout.jsx`: Shell centralizado con botón flotante permanente de SOS.
