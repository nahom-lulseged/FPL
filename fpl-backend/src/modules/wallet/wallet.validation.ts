import { z } from 'zod';
import { paginationQuerySchema } from '../../lib/pagination';

export const ledgerQuerySchema = paginationQuerySchema;

export type LedgerQuery = z.infer<typeof ledgerQuerySchema>;
