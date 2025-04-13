// Function to check if a trailer is assigned to an ongoing transport or cut transport
export const isTrailerInUse = (trailerId, transports, currentTransportId) => {
  // Check if the trailer is assigned to any ongoing transport that is not the current one
  // Or if it's assigned to a cut transport that hasn't been restored or deleted
  return transports.some(t => 
    (
      // Regular check for ongoing transports
      (t.currentStatus === 'ONGOING' && t.id !== currentTransportId && t.trailer && t.trailer.id === trailerId)
      ||
      // Check for cut transports
      (t.isCut === true && t.isRestored !== true && t.isDeleted !== true && 
        (
          // Check if cut type includes trailer
          (t.cutInfo?.cutType === 'TRAILER' || t.cutInfo?.cutType === 'BOTH') && 
          t.id !== currentTransportId && 
          t.trailer && 
          t.trailer.id === trailerId
        )
      )
    )
  );
};

// Function to get all trailers that are already assigned to ongoing transports or cut transports
export const getAssignedTrailerIds = (transports, currentTransportId) => {
  return transports
    .filter(t => 
      // Regular check for ongoing transports
      (t.currentStatus === 'ONGOING' && t.id !== currentTransportId && t.trailer !== null)
      ||
      // Check for cut transports
      (t.isCut === true && t.isRestored !== true && t.isDeleted !== true && 
       (t.cutInfo?.cutType === 'TRAILER' || t.cutInfo?.cutType === 'BOTH') && 
       t.id !== currentTransportId && 
       t.trailer !== null)
    )
    .map(t => t.trailer.id);
};

// Function to check if a trailer is in a cut transport
export const isTrailerInCutTransport = (trailerId, transports) => {
  return transports.some(t => 
    t.isCut === true && 
    t.isRestored !== true && 
    t.isDeleted !== true && 
    (t.cutInfo?.cutType === 'TRAILER' || t.cutInfo?.cutType === 'BOTH') && 
    t.trailer && 
    t.trailer.id === trailerId
  );
};

// Function to check if a trailer is assigned to any ongoing transport on a specific date
// Or if it's assigned to a cut transport that hasn't been restored or deleted
export const isTrailerInUseOnDate = (trailerId, transports, currentTransportId, date) => {
  // Format date to YYYY-MM-DD
  const formattedDate = typeof date === 'string' ? date : new Date(date).toISOString().split('T')[0];
  
  // Check if the trailer is assigned to any ongoing transport on the specified date
  // Or if it's assigned to a cut transport that hasn't been restored or deleted
  return transports.some(t => {
    // Skip the current transport
    if (t.id === currentTransportId) return false;
    
    // Check for cut transports first - if cut and contains this trailer, it's in use regardless of date
    if (t.isCut === true && t.isRestored !== true && t.isDeleted !== true && 
        (t.cutInfo?.cutType === 'TRAILER' || t.cutInfo?.cutType === 'BOTH') && 
        t.trailer && t.trailer.id === trailerId) {
      return true;
    }
    
    // Skip if not ongoing or doesn't have the trailer
    if (t.currentStatus !== 'ONGOING' || !t.trailer || t.trailer.id !== trailerId) return false;
    
    // Get the dates of the other transport
    const otherTransportDates = [];
    
    if (t.departureDate) {
      otherTransportDates.push(new Date(t.departureDate).toISOString().split('T')[0]);
    }
    
    if (t.returnDate) {
      otherTransportDates.push(new Date(t.returnDate).toISOString().split('T')[0]);
    }
    
    if (t.destinations && t.destinations.length > 0) {
      t.destinations.forEach(dest => {
        if (dest.destinationDate) {
          otherTransportDates.push(new Date(dest.destinationDate).toISOString().split('T')[0]);
        }
      });
    }
    
    // If no dates found, use today's date
    if (otherTransportDates.length === 0) {
      otherTransportDates.push(new Date().toISOString().split('T')[0]);
    }
    
    // Check if the specified date is in the other transport's dates
    return otherTransportDates.includes(formattedDate);
  });
}; 