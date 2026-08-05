import { z } from 'zod';
import { AlertType } from '@prisma/client';

export const logsQuerySchema = z.object({
  level: z.enum(['error', 'warn', 'info']).optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().positive().max(500).optional(),
});

export type LogsQuery = z.infer<typeof logsQuerySchema>;

const alertConfigItemSchema = z
  .object({
    alertType: z.nativeEnum(AlertType),
    webhookUrl: z.string(),
    enabled: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.enabled && data.webhookUrl) {
      try {
        const url = new URL(data.webhookUrl);
        if (url.protocol !== 'https:') {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Webhook URL must use HTTPS when enabled',
            path: ['webhookUrl'],
          });
        }
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Invalid webhook URL',
          path: ['webhookUrl'],
        });
      }
    }
  });

export const updateAlertsSchema = z.object({
  configs: z.array(alertConfigItemSchema).min(1),
});

export type UpdateAlertsBody = z.infer<typeof updateAlertsSchema>;
