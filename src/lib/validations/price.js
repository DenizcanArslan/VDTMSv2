import { z } from 'zod';

export const priceSchema = z.object({
  clientId: z.string().min(1, 'Client is required'),
  frequentLocationId: z.string().min(1, 'Location is required'),
  isFixedPrice: z.boolean().default(false),
  basePrice: z.union([
    z.string(),
    z.number()
  ])
    .refine((val) => !isNaN(parseFloat(val)), {
      message: 'Base price must be a number'
    })
    .refine((val) => parseFloat(val) >= 0, {
      message: 'Base price must be positive'
    })
    .transform(val => parseFloat(val)),
  dieselSurcharge: z.union([
    z.string(),
    z.number()
  ])
    .optional()
    .refine((val) => !val || !isNaN(parseFloat(val)), {
      message: 'Diesel surcharge must be a number'
    })
    .refine((val) => !val || parseFloat(val) >= 0, {
      message: 'Diesel surcharge must be positive'
    })
    .transform(val => val ? parseFloat(val) : null)
    .nullable(),
  roadTax: z.union([
    z.string(),
    z.number()
  ])
    .optional()
    .refine((val) => !val || !isNaN(parseFloat(val)), {
      message: 'Road tax must be a number'
    })
    .refine((val) => !val || parseFloat(val) >= 0, {
      message: 'Road tax must be positive'
    })
    .transform(val => val ? parseFloat(val) : null)
    .nullable(),
  gensetPrice: z.union([
    z.string(),
    z.number()
  ])
    .optional()
    .refine((val) => !val || !isNaN(parseFloat(val)), {
      message: 'Genset price must be a number'
    })
    .refine((val) => !val || parseFloat(val) >= 0, {
      message: 'Genset price must be positive'
    })
    .transform(val => val ? parseFloat(val) : null)
    .nullable(),
});

export const transformPriceData = (data) => {
  const validatedData = priceSchema.parse(data);
  return {
    ...validatedData,
    clientId: parseInt(validatedData.clientId),
    frequentLocationId: parseInt(validatedData.frequentLocationId),
  };
}; 