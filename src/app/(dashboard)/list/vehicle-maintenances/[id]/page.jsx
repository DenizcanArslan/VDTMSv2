import CompletionButton from "@/components/CompletionButton";
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";

const SingleMaintenancePage = async ({ params }) => {
  const maintenance = await prisma.vehicleMaintenance.findUnique({
    where: {
      id: parseInt(params.id)
    },
    include: {
      truck: true,
      trailer: true
    }
  });

  if (!maintenance) {
    notFound();
  }

  return (
    <div className="m-5">
      <div id="data-card" className="flex gap-4 w-full">
        <div className="bg-white w-full shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Vehicle Maintenance Info
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Details and information about the maintenance.
            </p>
          </div>
          <div className="border-t border-gray-200">
            <dl>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Vehicle Type</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {maintenance.truck ? "Truck" : "Trailer"}
                </dd>
              </div>

              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Vehicle</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {maintenance.truck?.licensePlate || maintenance.trailer?.licensePlate} ({maintenance.truck?.nickName || maintenance.trailer?.nickName})
                </dd>
              </div>

              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Maintenance Type</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  <div className="flex">
                    {maintenance.isGensetMaintenance ? (
                      <span className="px-2 py-1 bg-cyan-600 text-white text-xs rounded-full flex items-center gap-1">
                        <span>❄️</span>
                        <span>Genset Maintenance</span>
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded-full">
                        Vehicle Maintenance
                      </span>
                    )}
                  </div>
                </dd>
              </div>

              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Maintenance Date</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {new Date(maintenance.maintenanceDate).toLocaleDateString('tr-TR')}
                </dd>
              </div>

              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Cost</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {maintenance.cost ? `€${Number(maintenance.cost).toFixed(2)}` : "-"}
                </dd>
              </div>

              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Notes</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {maintenance.notes || "-"}
                </dd>
              </div>

              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Created At</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {new Date(maintenance.createdAt).toLocaleDateString('tr-TR')}
                </dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                <CompletionButton 
                      id={maintenance.id}
                      status={maintenance.status}
                      table="vehicle-maintenances"
                    />
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SingleMaintenancePage; 