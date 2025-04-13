// Function to check if a driver is assigned to a slot on the current date
export const isDriverInUse = (driverId, slots, currentSlotId) => {
  // Check if the driver is assigned to any slot that is not the current one
  return slots.some(s => 
    s.id !== currentSlotId && 
    s.driverId === driverId
  );
};

// Function to get all drivers that are already assigned to slots
export const getAssignedDriverIds = (slots, currentSlotId) => {
  return slots
    .filter(s => 
      s.id !== currentSlotId && 
      s.driverId !== null
    )
    .map(s => s.driverId);
}; 