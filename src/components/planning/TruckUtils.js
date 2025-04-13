// Function to check if a truck is assigned to a slot on the current date
export const isTruckInUse = (truckId, slots, currentSlotId) => {
  // Check if the truck is assigned to any slot that is not the current one
  return slots.some(s => 
    s.id !== currentSlotId && 
    s.truckId === truckId
  );
};

// Function to get all trucks that are already assigned to slots
export const getAssignedTruckIds = (slots, currentSlotId) => {
  return slots
    .filter(s => 
      s.id !== currentSlotId && 
      s.truckId !== null
    )
    .map(s => s.truckId);
}; 