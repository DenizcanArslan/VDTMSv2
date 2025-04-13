import { z } from "zod";

export const vehicleInspectionSchema = z.object({
  inspectionDate: z.string().min(1, "Inspection date is required"),
  notes: z.string().optional().nullable(),
  cost: z.string()
    .optional()
    .nullable()
    .transform((val) => (val === "" ? null : val))
    .refine(
      (val) => !val || /^\d*\.?\d{0,2}$/.test(val),
      { message: "Please enter a valid amount (e.g. 10.20)" }
    )
    .transform((val) => (val ? parseFloat(val) : null)),
  
  // Truck veya Trailer ID'si (biri zorunlu)
  vehicleType: z.enum(["truck", "trailer"]),
  vehicleId: z.string().min(1, "Please select a vehicle"),
}); 