import { toast } from 'react-toastify';
import { createRoot } from 'react-dom/client';
import ConfirmationModal from '@/components/common/ConfirmationModal';
import { BsSnow2 } from 'react-icons/bs';
import { FiAlertTriangle } from 'react-icons/fi';

const ValidationResult = {
  VALID: 'VALID',
  WARNING: 'WARNING',
  ERROR: 'ERROR'
};

export const planningValidations = {
  // Driver atama kontrolü
  async validateDriverAssignment(driver, slot, transports) {
    const validations = [];
    
    console.log('Validation Check:', {
      driver: driver.nickName,
      driverAdr: driver.adr,
      transports: transports.map(t => ({
        id: t.transport.id,
        adr: t.transport.adr
      }))
    });
    
    // ADR Kontrolü
    const hasAdrTransport = transports.some(t => t.transport?.adr === 'YES');
    if (hasAdrTransport && driver.adr === 'NO') {
      validations.push({
        type: ValidationResult.WARNING,
        message: <div className="flex items-center gap-1.5"><FiAlertTriangle className="text-red-500" /> ADR License Warning</div>,
        details: {
          driverId: driver.id,
          driverName: driver.nickName,
          slotId: slot.id,
          requiresConfirmation: true,
          confirmationMessage: <><div className="flex items-center gap-1.5 mb-2"><FiAlertTriangle className="text-red-500" /> ADR Required</div>This slot contains ADR transport(s), but driver <span className="font-bold">{driver.nickName}</span> does not have an ADR license. Do you want to proceed anyway?</>
        }
      });
    }

    return validations;
  },

  // Transport atama kontrolü
  async validateTransportAssignment(transport, slot, driver) {
    const validations = [];
    
    // ADR Kontrolü
    if (transport.adr === 'YES' && driver?.adr === 'NO') {
      validations.push({
        type: ValidationResult.WARNING,
        message: <div className="flex items-center gap-1.5"><FiAlertTriangle className="text-red-500" /> ADR License Warning</div>,
        details: {
          transportId: transport.id,
          driverId: driver?.id,
          driverName: driver?.nickName,
          slotId: slot.id,
          requiresConfirmation: true,
          confirmationMessage: <><div className="flex items-center gap-1.5 mb-2"><FiAlertTriangle className="text-red-500" /> ADR Required</div>This transport requires ADR, but driver <span className="font-bold">{driver?.nickName}</span> does not have an ADR license. Do you want to proceed anyway?</>
        }
      });
    }

    return validations;
  },
  
  // Trailer atama kontrolü - Genset için
  async validateGensetRequirement(transport, trailer) {
    const validations = [];
    
    // Genset Kontrolü
    if (transport.genset === 'YES' && trailer.genset === 'NO') {
      validations.push({
        type: ValidationResult.WARNING,
        message: <div className="flex items-center gap-1.5"><BsSnow2 className="text-blue-500" /> Genset Requirement Warning</div>,
        details: {
          transportId: transport.id,
          trailerId: trailer.id,
          requiresConfirmation: true,
          confirmationMessage: <><div className="flex items-center gap-1.5 mb-2"><BsSnow2 className="text-blue-500" /> Genset Required</div>This transport requires a genset, but the selected trailer <span className="font-bold">{trailer.nickName || trailer.licensePlate}</span> does not have a genset. Do you want to proceed anyway?</>
        }
      });
    }
    
    return validations;
  },
  
  // Truck atama kontrolü - Genset için
  async validateTruckGensetRequirement(slot, truck) {
    const validations = [];
    
    // Slot'ta genset gerektiren transport var mı?
    const hasGensetTransport = slot.transports?.some(ts => ts.transport?.genset === 'YES');
    
    // Transportların trailer'larında genset var mı?
    const allTransportsHaveGensetTrailer = slot.transports
      .filter(ts => ts.transport?.genset === 'YES')
      .every(ts => ts.transport?.trailer?.genset === 'YES');
    
    // Eğer genset gerektiren transport varsa, trailer'da genset yoksa ve truck'ta da genset yoksa uyarı göster
    if (hasGensetTransport && !allTransportsHaveGensetTrailer && truck.genset === 'NO') {
      validations.push({
        type: ValidationResult.WARNING,
        message: <div className="flex items-center gap-1.5"><BsSnow2 className="text-blue-500" /> Genset Requirement Warning</div>,
        details: {
          truckId: truck.id,
          slotId: slot.id,
          requiresConfirmation: true,
          confirmationMessage: <><div className="flex items-center gap-1.5 mb-2"><BsSnow2 className="text-blue-500" /> Genset Required</div>This slot contains transport(s) that require a genset, but the selected truck <span className="font-bold">{truck.nickName || truck.licensePlate}</span> does not have a genset. Do you want to proceed anyway?</>
        }
      });
    }
    
    return validations;
  },
  
  // Transport'un slot'a atanması sırasında genset kontrolü
  async validateTransportGensetRequirement(transport, slot) {
    const validations = [];
    
    // Transport genset gerektiriyor mu?
    if (transport.genset !== 'YES') {
      return validations; // Genset gerekmiyor, kontrol etmeye gerek yok
    }
    
    // Eğer slot'a henüz truck atanmamışsa kontrol yapma
    if (!slot.truck && !slot.truckId) {
      return validations; // Henüz truck atanmamış, kontrol etmeye gerek yok
    }
    
    // Transport'un trailer'ında genset var mı?
    const hasGensetTrailer = transport.trailer && transport.trailer.genset === 'YES';
    
    // Slot'un truck'ında genset var mı?
    const hasGensetTruck = slot.truck && slot.truck.genset === 'YES';
    
    // Eğer transport genset gerektiriyorsa, trailer'da genset yoksa ve truck'ta da genset yoksa uyarı göster
    if (!hasGensetTrailer && !hasGensetTruck) {
      validations.push({
        type: ValidationResult.WARNING,
        message: <div className="flex items-center gap-1.5"><BsSnow2 className="text-blue-500" /> Genset Requirement Warning</div>,
        details: {
          transportId: transport.id,
          truckId: slot.truck?.id,
          slotId: slot.id,
          requiresConfirmation: true,
          confirmationMessage: <><div className="flex items-center gap-1.5 mb-2"><BsSnow2 className="text-blue-500" /> Genset Required</div>This transport requires a genset, but neither the trailer nor the truck <span className="font-bold">{slot.truck?.nickName || slot.truck?.licensePlate}</span> has a genset. Do you want to proceed anyway?</>
        }
      });
    }
    
    return validations;
  }
};

// Modal gösterme ve sonuç alma
export const handleValidationResults = async (validations) => {
  if (!validations || validations.length === 0) return true;

  // Hata varsa direkt reddet
  if (validations.some(v => v.type === ValidationResult.ERROR)) {
    const errorMsg = validations.find(v => v.type === ValidationResult.ERROR).message;
    toast.error(errorMsg);
    return false;
  }

  // Uyarı varsa modal göster
  const warnings = validations.filter(v => v.type === ValidationResult.WARNING);
  if (warnings.length > 0) {
    try {
      return new Promise((resolve) => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        const root = createRoot(container);
        
        const warning = warnings[0];
        
        const closeModal = (result) => {
          root.unmount();
          container.remove();
          resolve(result);
        };
        
        root.render(
          <ConfirmationModal
            isOpen={true}
            onClose={() => closeModal(false)}
            onConfirm={() => closeModal(true)}
            title={warning.message}
            message={warning.details.confirmationMessage}
          />
        );
      });
    } catch (error) {
      console.error('Error showing modal:', error);
      return false;
    }
  }

  return true;
}; 