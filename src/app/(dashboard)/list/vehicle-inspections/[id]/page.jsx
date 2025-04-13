import CompletionButton from "@/components/CompletionButton";
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";

const SingleVehicleInspectionPage = async ({ params }) => {
  const inspection = await prisma.vehicleInspection.findUnique({
    where: {
      id: parseInt(params.id),
    },
    include: {
      truck: true,
      trailer: true,
    },
  });

  if (!inspection) {
    notFound();
  }

  return (
    <div className="m-5">
      <div id="data-card" className="flex gap-4 w-full">
        <div className="bg-white w-full shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Vehicle Inspection Info
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Details and information about the inspection.
            </p>
          </div>
          <div className="border-t border-gray-200">
            <dl>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">
                  Vehicle Type
                </dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {inspection.truck ? "Truck" : "Trailer"}
                </dd>
              </div>

              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Vehicle</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {inspection.truck?.licensePlate ||
                    inspection.trailer?.licensePlate}{" "}
                  ({inspection.truck?.nickName || inspection.trailer?.nickName})
                </dd>
              </div>

              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">
                  Inspection Date
                </dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {new Date(inspection.inspectionDate).toLocaleDateString(
                    "tr-TR"
                  )}
                </dd>
              </div>

              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Cost</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {inspection.cost
                    ? `€${Number(inspection.cost).toFixed(2)}`
                    : "-"}
                </dd>
              </div>

              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Notes</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {inspection.notes || "-"}
                </dd>
              </div>

              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">
                  Created At
                </dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {new Date(inspection.createdAt).toLocaleDateString("tr-TR")}
                </dd>
              </div>
            </dl>

            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Status</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                <CompletionButton
                  id={inspection.id}
                  status={inspection.status}
                  table="vehicle-inspections"
                />
              </dd>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SingleVehicleInspectionPage;
