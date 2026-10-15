# DESIGN.md — Sistema de diseño de Compuesto

> Dirección: **Old Money × Trading Terminal** (banca privada suiza + terminal de trading). Fuente: `CLAUDE.md` §5–§6, §10 y `docs/ANIMACIONES.md` §1. Si algo aquí contradice `CLAUDE.md`, manda `CLAUDE.md`. Escrito a mano (Impeccable no disponible); `design-system/compuesto/MASTER.md` recoge la salida de UI UX Pro Max y su reconciliación.

## 1. Motivo de marca
La **curva exponencial del interés compuesto**: logo (trazo fino dorado), anillo de progreso, gráfico "Tu conocimiento compuesto", transiciones de subida de rango. Mascota **Bolsín** (toro original, 6 estados).

## 2. Tokens
Todo en CSS variables (OKLCH), Tailwind v4 las consume. Neutros siempre **tintados** (nunca `#000`/`#fff` ni grises puros).

### Color (7 temas; bull/bear con el mismo significado en todos)
| Tema | Acceso | Notas |
|---|---|---|
| Wall Street Noche | por defecto | oscuro, marino tintado, latón |
| Mayfair | claro | papel crema, verde inglés, acento ocre |
| Salmón | rango Analista | estilo prensa financiera (sin copiar marcas) |
| Ginebra | rango Asociado | marino + plata |
| Monte Carlo | rango VP | verde carreras + oro |
| Tokio 3 a.m. | rango Director | índigo, cian/magenta contenidos; único con glow sutil |
| Platino | rango Managing Director | grafito + platino |

Roles por tema: `--bg --surface-1 --surface-2 --line --text --text-2 --brand --accent --bull --bear --info`. Valores de los dos temas base en `CLAUDE.md` §5; los otros cinco se definen en la tarea 0.3 y se ajustan hasta AA con test automático. Bloqueados: visibles con candado y vista previa.

### Espaciado, forma, profundidad
- Base 4 px. Radios 10 / 16 / 999 px.
- Sombras suaves semitransparentes; bordes de 1 px a baja opacidad; filete dorado fino en elementos de rango.
- Grano 2–3 % en fondos grandes. Z-index por capas nombradas (base, sticky, sheet, toast, overlay).
- Densidad alta solo en pantallas "terminal".

### Tipografía
| Rol | Fuente | Notas |
|---|---|---|
| Display | Instrument Serif (alt. Fraunces) | títulos, rangos |
| UI | Geist Sans (alt. Hanken Grotesk) | 16 px mínimo en móvil |
| Cifras/tickers | Geist Mono | `tabular-nums` en **todas** las cifras |

Escala 1.25 · `text-wrap: balance` en títulos, `pretty` en párrafos · máx. 65 caracteres por línea · auto-alojadas con `@fontsource`. Formatos con `Intl` (`1.234,56 €`).

### Motion
Personalidad **Premium**: precisa, sin rebote en UI, aceleraciones suaves; rebote y partículas solo en recompensas. Capas: primaria (explica), secundaria (acompaña), ambiental (≤ 30 % de protagonismo).

| Token | Valor |
|---|---|
| `ease.out` | `cubic-bezier(0.23, 1, 0.32, 1)` |
| `ease.inOut` | `cubic-bezier(0.65, 0, 0.35, 1)` |
| `ease.exit` | `cubic-bezier(0.4, 0, 1, 1)` |
| `spring.ui` | stiffness 400, damping 40 |
| `spring.reward` | stiffness 300, damping 18 |
| `dur.micro / short / medium / long / story` | 120 / 200 / 320 / 600 / 1200–2000 ms |
| `stagger` | 40 ms |

Reglas: solo `transform` y `opacity`; botón `scale(0.97)` 100 ms; salidas más rápidas que entradas; todo interrumpible; ticker pausado con la pestaña oculta; 60 fps con CPU 4×.

## 3. Anti-patrones (prohibidos)
Degradados morado-azul/rosa de IA · negro o gris puros · tarjetas dentro de tarjetas · texto gris sobre color · Inter/Arial/sistema como única fuente · rebote/elástico en UI normal · `ease-in` en entradas · glassmorphism generalizado · iconito en cuadrado redondeado sobre cada título · animar `width/height/top/left` · verde/rojo como única señal (siempre ▲▼, signo y texto) · emojis como iconos.

## 4. Accesibilidad (WCAG 2.1 AA)
- Contraste AA en todos los temas (test automático desde OKLCH): texto/fondo y bull/bear/fondo.
- Foco visible; teclado completo; ARIA correcto; objetivos táctiles ≥ 48 px; inputs ≥ 16 px.
- Textos reajustables al 200 % de zoom; gráficos con descripción textual.
- Todo gesto tiene alternativa (swipe → botones; arrastrar → seleccionar y colocar).
- `prefers-reduced-motion`: fundidos, sin marquee ni confeti; cada animación con estado final estático y descripción equivalente. Nada se transmite solo con movimiento ni solo con color.

## 5. Nativo
`100dvh`, safe areas, sin tap highlight, hover solo con `(hover: hover)`, `touch-action: manipulation`, `theme-color` por tema, háptica con `navigator.vibrate` si existe.
