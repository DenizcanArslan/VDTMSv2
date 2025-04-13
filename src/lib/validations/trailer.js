import { z } from "zod";

export const trailerSchema = z.object({
  licensePlate: z.string().min(1, "License plate is required"),
  nickName: z.string().min(1, "Nick name is required"),
  model: z.string().optional().nullable(),
  modelYear: z.union([z.string(), z.number()])
    .nullable()
    .transform((val) => (val ? parseInt(val) : null))
    .refine((val) => !val || (val >= 1900 && val <= new Date().getFullYear()), {
      message: "Model year must be between 1900 and current year"
    }),
  chasisNumber: z.string().optional().nullable(),
  genset: z.enum(["YES", "NO"]),
  insuranceExpireDate: z.string().optional().nullable(),
}); 