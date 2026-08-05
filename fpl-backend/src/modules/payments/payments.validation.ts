import { z } from 'zod';

export const depositSchema = z.object({
  amountMinor: z.number().int().positive().optional(),
  amountMajor: z.number().positive().optional(),
}).refine((d) => d.amountMinor !== undefined || d.amountMajor !== undefined, {
  message: 'amountMinor or amountMajor is required',
});

export const withdrawSchema = z.object({
  amountMinor: z.number().int().positive().optional(),
  amountMajor: z.number().positive().optional(),
}).refine((d) => d.amountMinor !== undefined || d.amountMajor !== undefined, {
  message: 'amountMinor or amountMajor is required',
});
