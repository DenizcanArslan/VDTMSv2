import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";

const SingleTruckPage = async ({ params }) => {
  // Fetch truck data by ID from the database
  const truck = await prisma.truck.findUnique({
    where: {
      id: parseInt(params.id),
    },
    include: {
      transportLicense: true
    }
  });

  // If truck not found, redirect to 404 page
  if (!truck) {
    notFound();
  }

  return (
    <div className="m-5">
      <div id="data-card" className="flex gap-4 w-full">
        <div className="bg-white w-full shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Truck's info
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Details and information about the truck.
            </p>
          </div>
          <div className="border-t border-gray-200">
            <dl>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <div className="text-sm font-medium text-gray-500">
                  License Plate:
                </div>
                <div className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {truck.licensePlate}
                </div>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <div className="text-sm font-medium text-gray-500">
                  Nick Name:
                </div>
                <div className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {truck.nickName}
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <div className="text-sm font-medium text-gray-500">Model:</div>
                <div className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {truck.model}
                </div>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <div className="text-sm font-medium text-gray-500">Model Year:</div>
                <div className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {truck.modelYear}
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <div className="text-sm font-medium text-gray-500">GENSET:</div>
                <div className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {truck.genset}
                </div>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <div className="text-sm font-medium text-gray-500">
                  Chasis Number:
                </div>
                <div className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {truck.chasisNumber}
                </div>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <div className="text-sm font-medium text-gray-500">
                  Transport License:
                </div>
                <div className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {truck.transportLicense 
                    ? `${truck.transportLicense.licenseNumber} ${!truck.transportLicense.isActive ? '(Inactive)' : ''}`
                    : "No License Assigned"
                  }
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <div className="text-sm font-medium text-gray-500">Insurance Expire Date:</div>
                <div className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {truck.insuranceExpireDate ? new Date(truck.insuranceExpireDate).toLocaleDateString('tr-TR') : "-"}
                </div>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SingleTruckPage;
