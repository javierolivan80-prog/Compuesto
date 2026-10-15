import i18next from 'i18next';
import es from './es.json';

/** Solo hay español, pero todos los textos nuevos pasan por aquí para que añadir otro idioma no obligue a rehacer nada. */
void i18next.init({
  lng: 'es',
  fallbackLng: 'es',
  resources: { es: { translation: es } },
  interpolation: { escapeValue: false },
  initAsync: false,
});

export const t = (key: string, vars?: Record<string, string | number>): string =>
  i18next.t(key, vars);
