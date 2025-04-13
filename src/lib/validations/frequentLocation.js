import { z } from "zod";

export const frequentLocationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  city: z.string().nullable().optional(),
  country: z.string().min(1, "Country is required"),
  postalCode: z.string().nullable().optional(),
  km: z.string()
    .min(1, "KM is required")
    .transform((val) => (val === "" ? null : parseInt(val, 10)))
    .refine((val) => !val || (val >= 0), {
      message: "KM must be a positive number",
    }),
}); 