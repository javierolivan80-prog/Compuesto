import { describe, expect, it } from 'vitest';
import { TABS, parseRoute, tabOf } from './routes';

describe('rutas', () => {
  it.each([
    ['', { name: 'home' }],
    ['#', { name: 'home' }],
    ['#/', { name: 'home' }],
    ['#/camino', { name: 'camino' }],
    ['#/practicar/', { name: 'practicar' }],
    ['#/rivales', { name: 'rivales' }],
    ['#/despacho', { name: 'despacho' }],
    ['#/despacho/ajustes', { name: 'ajustes' }],
    ['#/despacho/glosario', { name: 'glosario' }],
    ['#/despacho/reportes', { name: 'reportes' }],
    ['#/leccion/n0-u1-l1', { name: 'leccion', id: 'n0-u1-l1' }],
    ['#/salto/n1-u4', { name: 'salto', unitId: 'n1-u4' }],
    ['#/saltar-nivel/0', { name: 'saltar-nivel', level: 0 }],
    ['#/sesion', { name: 'sesion' }],
    ['#/juego/campana', { name: 'juego', id: 'campana', daily: false }],
    ['#/juego/mesa-ordenes/dia', { name: 'juego', id: 'mesa-ordenes', daily: true }],
  ])('%s', (hash, route) => {
    expect(parseRoute(hash)).toEqual(route);
  });
  it('una ruta desconocida o mal formada cae en Inicio', () => {
    for (const h of [
      '#/nada',
      '#/leccion/',
      '#/leccion/A B',
      '#/saltar-nivel/x',
      '#/despacho/otra',
      '#/juego/no-existe',
      '#/juego/campana/otro',
    ])
      expect(parseRoute(h)).toEqual({ name: 'home' });
  });
  it('hay exactamente 5 pestañas y Glosario/Ajustes cuelgan de Despacho', () => {
    expect(TABS.map((t) => t.label)).toEqual([
      'Inicio',
      'Camino',
      'Practicar',
      'Rivales',
      'Despacho',
    ]);
    expect(tabOf(parseRoute('#/despacho/ajustes'))).toBe('despacho');
    expect(tabOf(parseRoute('#/despacho/glosario'))).toBe('despacho');
    expect(tabOf(parseRoute('#/leccion/x'))).toBeNull(); // pantalla completa
    expect(tabOf(parseRoute('#/salto/n0-u1'))).toBeNull();
  });
});
