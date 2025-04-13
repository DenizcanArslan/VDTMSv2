import { z } from "zod";

export const clientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().optional().nullable(),
  vatNumber: z.string().optional().nullable(),
  emergencyContacts: z.array(z.object({
    name: z.string().optional().nullable(),
    phoneNumber: z.string().optional().nullable(),
  })).optional(),
  invoiceMails: z.array(z.object({
    email: z.string()
      .optional()
      .nullable()
      .transform(e => e === "" ? null : e)
      .refine(e => e === null || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e), {
        message: "Invalid email format",
      }),
  })).optional(),
}); 