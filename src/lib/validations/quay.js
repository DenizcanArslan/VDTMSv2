import { z } from "zod";

export const quaySchema = z.object({
  name: z.string().min(1, "Name is required"),
  quayNumber: z.union([z.number(), z.string()])
    .refine((val) => {
      if (val === "" || val === null) return true;
      return !isNaN(val) && Number.isInteger(Number(val));
    }, "Quay number must be a valid integer")
    .transform((val) => {
      if (val === "" || val === null) return null;
      return typeof val === 'number' ? val : parseInt(val, 10);
    })
    .nullable()
    .optional(),
  isLoRo: z.string()
    .min(1, "Lo/Ro is required")
    .pipe(z.enum(["LO", "RO"])),
  address: z.string().nullable().optional(),
  terminalFee: z.string().nullable().optional(),
  workingHoursStart: z.string().nullable().optional(),
  workingHoursEnd: z.string().nullable().optional(),
  defaultTar: z.string().nullable().optional(),
  tarType: z.enum(["NONE", "PICKUP", "DROPOFF", "BOTH"]).default("NONE"),
  tarPositiveColor: z.enum(["GREEN", "BLUE", "PURPLE", "TEAL"]).nullable().optional(),
  tarNegativeColor: z.enum(["RED", "ORANGE", "YELLOW", "GRAY"]).nullable().optional(),
}); 