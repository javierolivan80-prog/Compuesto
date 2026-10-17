# Despliegue personal en Cloudflare Pages (tarea 2.8)

Necesita tu cuenta de Cloudflare: lo haces tú (gratis, sin tarjeta). Tiempo: ~10 min.

## 1. Crear el proyecto
1. Entra en <https://dash.cloudflare.com> → **Workers & Pages** → **Create** → pestaña **Pages** → **Connect to Git**.
2. Autoriza GitHub y elige el repositorio `javierolivan80-prog/Compuesto`.
3. Rama de producción: la que decidas desplegar (p. ej. `main` tras fusionar `claude/new-session-w0ge7w`).
4. Configuración de compilación:
   - Framework preset: **None**
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Variable de entorno: `NODE_VERSION` = `22` (Vite 8 exige Node ≥ 20.19 o ≥ 22.12)
5. **Save and Deploy**. La URL será `https://<proyecto>.pages.dev`; no la compartas (no está indexada).

## 2. Qué ya viene en el repositorio
- `public/_headers`: seguridad (CSP, `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`), `X-Robots-Tag: noindex`, `sw.js` y `sw-control.json` sin caché (para que el interruptor de emergencia funcione al instante) y `/assets/*` inmutable.
- `public/robots.txt` con `Disallow: /` y `<meta name="robots" content="noindex">`.
- Probado en `e2e/despliegue.spec.ts`: la app arranca, se juega y se genera la tarjeta con esas cabeceras reales sin violaciones de CSP.

## 3. Checklist tras desplegar (márcala tú)
- [ ] Abrir la URL en el móvil y en el ordenador; la primera lección empieza en < 60 s.
- [ ] Instalar en la pantalla de inicio (Chrome Android: «Instalar app»; Safari iOS: Compartir → «Añadir a pantalla de inicio»). En iPhone, instalada, Safari no borra los datos por inactividad.
- [ ] Desactivar el wifi y abrir la app: funciona sin conexión.
- [ ] Despacho → Ajustes → **Exportar copia** descarga un JSON; guárdalo.
- [ ] Ajustes → recordatorio: descargar el `.ics` y añadirlo al calendario del móvil.
- [ ] Ajustes → Diagnóstico: sin errores.
- [ ] Al subir una versión nueva, la app avisa y actualiza al aceptar (nunca a mitad de lección).

## 4. Si una versión sale rota
Edita `public/sw-control.json` → `{ "kill": true, "minVersion": "0.1.0" }`, súbelo: el service worker se desregistra solo en la siguiente visita. Vuelve a `false` al arreglarlo.

## 5. Lighthouse (móvil, build de producción en el entorno de desarrollo)
Rendimiento 79–83 · Accesibilidad 100 · Buenas prácticas 100 · SEO 63 (**deliberado**: `noindex`). Mide de nuevo sobre la URL real (CDN con Brotli/HTTP2 mejora el resultado).
