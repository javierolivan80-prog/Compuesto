import companiesJson from '../../content/shared/companies.json';
import { companiesSchema } from './schemas';

/** Universo ficticio completo (cuentas de 5 años). Se carga aparte porque pesa y Inicio solo necesita la cinta. */
export const companies = () => companiesSchema.parse(companiesJson);
