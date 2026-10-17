import raw from '../../content/shared/games.json' with { type: 'json' };
import { gamesDataSchema, type GamesData } from './schemas';

/** Datos de los juegos (content/shared/games.json), validados con Zod al cargar. */
export const gamesData: GamesData = gamesDataSchema.parse(raw);
