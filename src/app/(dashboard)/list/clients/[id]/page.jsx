import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";

const SingleClientPage = async ({ params }) => {
  const client = await prisma.client.findUnique({
    where: {
      id: parseInt(params.id)
    },
    include: {
      emergencyContacts: true,
      invoiceMails: true,
      transports: true
    }
  });

  if (!client) {
    notFound();
  }

  return (
    <div className="m-5">
      <div id="data-card" className="flex gap-4 w-full">
        <div className="bg-white w-full shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Client's Info
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Details and information about client.
            </p>
          </div>
          <div className="border-t border-gray-200">
            <dl>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Name</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {client.name}
                </dd>
              </div>

              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Address</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {client.address || "-"}
                </dd>
              </div>

              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">VAT Number</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {client.vatNumber || "-"}
                </dd>
              </div>

              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Emergency Contacts</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {client.emergencyContacts.length > 0 ? (
                    <ul className="divide-y divide-gray-200">
                      {client.emergencyContacts.map((contact, index) => (
                        <li key={index} className="py-2">
                          <div>Name: {contact.name || "-"}</div>
                          <div>Phone: {contact.phoneNumber || "-"}</div>
                        </li>
                      ))}
                    </ul>
                  ) : "-"}
                </dd>
              </div>

              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Invoice Emails</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {client.invoiceMails.length > 0 ? (
                    <ul className="divide-y divide-gray-200">
                      {client.invoiceMails.map((mail, index) => (
                        <li key={index} className="py-2">
                          {mail.email || "-"}
                        </li>
                      ))}
                    </ul>
                  ) : "-"}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {client.transports.length > 0 && (
        <div className="mt-8 bg-white p-4 rounded-lg shadow">
          <h4 className="text-lg font-medium mb-4">Transport History</h4>
          {/* Transport listesi buraya eklenebilir */}
        </div>
      )}
    </div>
  );
};

export default SingleClientPage; 