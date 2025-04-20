import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";

const SingleDriverPage = async ({ params }) => {
  // Veritabanından driver'ı ID'ye göre çek
  const driver = await prisma.driver.findUnique({
    where: {
      id: parseInt(params.id)
    },
    include: {
      holidays: true  // Sadece tatil günlerini include edelim
    }
  });

  // Eğer driver bulunamadıysa 404 sayfasına yönlendir
  if (!driver) {
    notFound();
  }

  // Tarihleri formatla
  const formatDate = (date) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString('tr-TR');
  };

  return (
    <div className="m-5">
      <div id="data-card" className="flex gap-4 w-full">
        <div className="bg-white w-full shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Drivers Info
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Details and information about driver.
            </p>
          </div>
          <div className="border-t border-gray-200">
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <div className="text-sm font-medium text-gray-500">Full name:</div>
              <div className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {driver.name} {driver.surname}
              </div>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <div className="text-sm font-medium text-gray-500">Nick Name:</div>
              <div className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {driver.nickName}
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <div className="text-sm font-medium text-gray-500">Birthday:</div>
              <div className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {formatDate(driver.birthday)}
              </div>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <div className="text-sm font-medium text-gray-500">Phone Number:</div>
              <div className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {driver.phoneNumber || "-"}
              </div>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <div className="text-sm font-medium text-gray-500">Alpha Pass Number:</div>
              <div className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {driver.alphaPassNumber || "-"}
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <div className="text-sm font-medium text-gray-500">Alpha Pass Expire Date:</div>
              <div className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {formatDate(driver.alphaPassExpireDate)}
              </div>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <div className="text-sm font-medium text-gray-500">ADR:</div>
              <div className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {driver.adr}
              </div>
            </div>
            {driver.adr === "YES" && (
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <div className="text-sm font-medium text-gray-500">ADR Expire Date:</div>
                <div className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {formatDate(driver.adrExpireDate)}
                </div>
              </div>
            )}
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <div className="text-sm font-medium text-gray-500">Cargo Card:</div>
              <div className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {driver.cargoCard}
              </div>
            </div>
            {driver.cargoCard === "YES" && (
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <div className="text-sm font-medium text-gray-500">Cargo Card Expire Date:</div>
                <div className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {formatDate(driver.cargoCardExpireDate)}
                </div>
              </div>
            )}
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <div className="text-sm font-medium text-gray-500">Cargo Card Number:</div>
              <div className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {driver.cargoCardNumber || "-"}
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <div className="text-sm font-medium text-gray-500">Tachograph Expire Date:</div>
              <div className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {formatDate(driver.tachographExpireDate)}
              </div>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <div className="text-sm font-medium text-gray-500">Driver License Expire Date:</div>
              <div className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {formatDate(driver.driverLicenseExpireDate)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SingleDriverPage;