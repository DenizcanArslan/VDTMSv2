import { z } from "zod";

export const truckSchema = z.object({
  licensePlate: z.string().min(1, "License plate is required"),
  nickName: z.string().min(2, "Nick name must be at least 2 characters"),
  modelYear: z.union([z.string(), z.number()])
    .nullable()
    .transform((val) => (val ? parseInt(val) : null))
    .refine((val) => !val || (val >= 1900 && val <= new Date().getFullYear()), {
      message: "Model year must be between 1900 and current year"
    }),
  model: z.string().nullable(),
  chasisNumber: z.string().nullable(),
  genset: z.enum(["YES", "NO"]),
  insuranceExpireDate: z.string().optional().nullable(),
}); 