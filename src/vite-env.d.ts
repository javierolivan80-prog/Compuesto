/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />
declare const __APP_VERSION__: string;

declare module 'virtual:content-index' {
  export const lessons: {
    id: string;
    title: string;
    level: number;
    unit: number;
    order?: number;
    status: string;
    estimatedMinutes: number;
  }[];
  export const placements: { unitId: string; status: string }[];
}
