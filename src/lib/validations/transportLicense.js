import { z } from "zod";

export const transportLicenseSchema = z.object({
  licenseNumber: z
    .string()
    .min(1, "License number is required")
    .max(50, "License number cannot exceed 50 characters"),
  truckId: z
    .string()
    .optional()
    .nullable()
    .transform(val => val === "" ? null : val),
});

export const transportLicenseUpdateSchema = transportLicenseSchema.partial();

