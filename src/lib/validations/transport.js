import { z } from 'zod';

// Create a custom schema for frequentLocationId that's conditional based on transport type
const conditionalFrequentLocationId = z.union([
  z.number(),
  z.null(),
  z.undefined()
]);

// Destination şeması
const destinationSchema = z.object({
  id: z.number().optional(),
  order: z.number(),
  destinationDate: z.string(),
  destinationTime: z.string().optional().nullable(),
  frequentLocationId: conditionalFrequentLocationId,
  eta: z.string().optional().nullable(),
});

// Ana transport şeması
export const transportSchema = z.object({
  clientId: z.string().min(1, 'Client is required'),
  transportOrderNumber: z.string().min(1, 'Transport order number is required'),
  containerBookingReference: z.string().optional().nullable(),
  containerNumber: z.string()
    .nullable()
    .optional()
    .transform(val => val ? val.toUpperCase() : val)
    .refine(val => {
      // Skip validation if no container number provided
      if (!val) return true;
      
      // Check total length is 11
      if (val.length !== 11) return false;
      
      // Check first 4 chars are letters
      const firstFourChars = val.substring(0, 4);
      if (!/^[A-Z]{4}$/.test(firstFourChars)) return false;
      
      // Check remaining chars are numbers
      const remainingChars = val.substring(4);
      if (!/^\d+$/.test(remainingChars)) return false;
      
      return true;
    }, 'Container number must be 11 characters, starting with 4 letters followed by 7 numbers (e.g., CMAU1234567)'),
  containerType: z.string().optional().nullable().or(z.literal('')),
  loadingUnloadingReference: z.string()
    .optional()
    .nullable()
    .transform(val => val ? val.toLowerCase() : val),
  genset: z.string(),
  adr: z.enum(["YES", "NO"]).default("NO"),
  pickUpQuayId: z.string().optional().nullable(),
  dropOffQuayId: z.string().optional().nullable(),
  type: z.string().min(1, "Please select a transport type"),
  departureDate: z.string().optional().nullable(),
  returnDate: z.string().optional().nullable(),
  destinations: z.array(destinationSchema).min(1, 'At least one destination is required'),
  hasTransportOrder: z.boolean().optional(),
  transportOrderReceivedAt: z.string().nullable().optional(),
  requiresT1: z.boolean().optional(),
  t1Received: z.boolean().optional(),
}).superRefine((data, ctx) => {
  // For SHUNT transports, no quay validation is needed
  if (data.type === "SHUNT") {
    // For SHUNT transports, both quays and frequentLocationId are optional
  } else {
    // For non-SHUNT transports, validate that frequentLocationId is provided for all destinations
    for (let i = 0; i < data.destinations.length; i++) {
      const dest = data.destinations[i];
      if (!dest.frequentLocationId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Please select a location for Loading/Unloading Point ${i + 1}`,
          path: [`destinations.${i}.frequentLocationId`]
        });
        return false;
      }
    }
  }

  if (data.departureDate) {
    const departureDate = new Date(data.departureDate);
    const allDestinationDatesAfterDeparture = data.destinations.every(dest => 
      new Date(dest.destinationDate) >= departureDate
    );
    if (!allDestinationDatesAfterDeparture) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Departure date must be before all destination dates",
        path: ["departureDate"]
      });
      return false;
    }
  }
  
  if (data.returnDate) {
    const returnDate = new Date(data.returnDate);
    const allDestinationDatesBeforeReturn = data.destinations.every(dest => 
      new Date(dest.destinationDate) <= returnDate
    );
    if (!allDestinationDatesBeforeReturn) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Return date must be after all destination dates",
        path: ["returnDate"]
      });
      return false;
    }
  }
  
  if (data.departureDate && data.returnDate) {
    if (new Date(data.departureDate) >= new Date(data.returnDate)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Departure date must be before return date",
        path: ["returnDate"]
      });
      return false;
    }
  }

  return true;
});

// Veri dönüşümü ve validasyon
export const transformTransportData = (data) => {
  // Önce veriyi validate et
  const validatedData = transportSchema.parse(data);

  // Sonra dönüşümleri yap
  return {
    ...validatedData,
    clientId: parseInt(validatedData.clientId),
    pickUpQuayId: validatedData.pickUpQuayId ? parseInt(validatedData.pickUpQuayId) : null,
    dropOffQuayId: validatedData.dropOffQuayId ? parseInt(validatedData.dropOffQuayId) : null,
    loadingUnloadingReference: validatedData.loadingUnloadingReference || null,
    bookingReference: validatedData.containerBookingReference || null,
    containerNumber: validatedData.containerNumber || null,
    containerType: validatedData.containerType || null,
    departureDate: validatedData.departureDate || null,
    returnDate: validatedData.returnDate || null,
    destinations: validatedData.destinations.map((dest, index) => {
      // For SHUNT transports, frequentLocationId is optional
      const destinationData = {
        id: dest.id || undefined,
        order: index + 1, // Always use index + 1 to ensure unique order values
        destinationDate: dest.destinationDate,
        destinationTime: dest.destinationTime ? dest.destinationTime : null,
        eta: dest.eta || null
      };

      // Only include frequentLocationId if it exists
      if (dest.frequentLocationId) {
        destinationData.frequentLocationId = dest.frequentLocationId;
      }

      return destinationData;
    }),
    hasTransportOrder: data.hasTransportOrder,
    transportOrderReceivedAt: data.hasTransportOrder ? new Date().toISOString() : null,
    requiresT1: data.requiresT1 || false,
    t1Received: data.t1Received || false,
  };
}; 