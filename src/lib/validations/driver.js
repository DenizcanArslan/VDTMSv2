import { z } from "zod";

export const driverSchema = z.object({
  name: z.string().min(1, "Name is required"),
  surname: z.string().min(1, "Surname is required"),
  nickName: z.string().min(1, "Nick name is required"),
  birthday: z.string().optional().nullable(),
  phoneNumber: z.string().optional().nullable(),
  alphaPassNumber: z.string().optional().nullable(),
  alphaPassExpireDate: z.string().optional().nullable(),
  driverLicenseExpireDate: z.string().optional().nullable(),
  adr: z.enum(["YES", "NO"]),
  adrExpireDate: z.string().optional().nullable(),
  cargoCard: z.enum(["YES", "NO"]),
  cargoCardNumber: z.string().optional().nullable(),
  cargoCardExpireDate: z.string().optional().nullable(),
  tachographExpireDate: z.string().optional().nullable(),
}); 