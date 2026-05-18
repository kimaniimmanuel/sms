import { z } from "zod";

/**
 * Schema for Daraja's STK Push callback payload. The shape is a documented
 * Safaricom contract; we Zod-parse to fail fast on anything unexpected.
 *
 *   ResultCode 0 = success (CallbackMetadata.Item is populated)
 *   Any other value = failure (no CallbackMetadata, ResultDesc explains)
 */
export const StkCallbackSchema = z.object({
  Body: z.object({
    stkCallback: z.object({
      MerchantRequestID: z.string(),
      CheckoutRequestID: z.string(),
      ResultCode: z.number(),
      ResultDesc: z.string(),
      CallbackMetadata: z
        .object({
          Item: z.array(
            z.object({
              Name: z.string(),
              Value: z.union([z.string(), z.number()]).optional(),
            }),
          ),
        })
        .optional(),
    }),
  }),
});

export type StkCallback = z.infer<typeof StkCallbackSchema>;
