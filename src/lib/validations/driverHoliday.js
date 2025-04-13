import { z } from "zod";

const schema = z.object({
  startDate: z.string({
    required_error: "Start date is required",
    invalid_type_error: "Start date is required",
  }).min(1, "Start date is required"),
  endDate: z.string({
    required_error: "End date is required",
    invalid_type_error: "End date is required",
  }).min(1, "End date is required"),
  reason: z.string()
    .min(1, "Please select a holiday reason")
    .refine(
      (val) => ["ANNUAL_LEAVE", "SICK_LEAVE", "UNPAID_LEAVE", "BEREAVEMENT_LEAVE", "MARRIAGE_LEAVE", "OTHER"].includes(val),
      { message: "Please select a holiday reason" }
    ),
  notes: z.string().nullable(),
  driverId: z.string().min(1, "Please select a driver"),
});

export const driverHolidaySchema = schema
  .refine(
    (data) => {
      if (data.reason === "OTHER") {
        return data.notes && data.notes.trim() !== "";
      }
      return true;
    },
    {
      message: "Please provide details for other reason",
      path: ["notes"]
    }
  )
  .refine(
    (data) => {
      const startDate = new Date(data.startDate);
      const endDate = new Date(data.endDate);
      return startDate <= endDate;
    },
    {
      message: "End date cannot be before start date",
      path: ["endDate"]
    }
  )
  .refine(
    (data) => {
      const startDate = new Date(data.startDate);
      const endDate = new Date(data.endDate);
      return endDate >= startDate;
    },
    {
      message: "Start date cannot be after end date",
      path: ["startDate"]
    }
  ); 