import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import FormModal from "@/components/FormModal";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import { ITEM_PER_PAGE } from "@/lib/settings";
import Image from "next/image";
import Link from "next/link";
import StatusButton from "@/components/StatusButton";

export const dynamic = 'force-dynamic';

const columns = [
  { header: "License Number", accessor: "licenseNumber" },
  { header: "Truck", accessor: "truck", className: "hidden lg:table-cell" },
  { header: "Created At", accessor: "createdAt", className: "hidden lg:table-cell" },
  { header: "Updated At", accessor: "updatedAt", className: "hidden lg:table-cell" },
  { header: "Actions", accessor: "actions" }
];

const renderRow = (item, role) => (
  <tr
    key={item.id}
    className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-dijle-dark-blue hover:text-white transition-colors duration-200"
  >
    <td className="p-4">{item.licenseNumber}</td>
    <td className="p-4 hidden lg:table-cell">{item.truck?.licensePlate || "-"}</td>
    <td className="p-4 hidden lg:table-cell">
      {new Date(item.createdAt).toLocaleDateString()}
    </td>
    <td className="p-4 hidden lg:table-cell">
      {new Date(item.updatedAt).toLocaleDateString()}
    </td>
    <td className="p-4 w-[100px] lg:w-[130px]">
      <div className="flex items-center gap-3 justify-center">
        <Link href={`/list/transport-licenses/${item.id}`}>
          <button className="w-7 h-7 flex items-center justify-center rounded-full bg-green-400 hover:bg-dijle-light-blue transition duration-200">
            <Image src={"/icons/view.svg"} width={16} height={16} alt="view" />
          </button>
        </Link>
        {role === "admin" && <FormModal table="transportLicense" type="update" data={item} />}
        {role === "admin" && <StatusButton id={item.id} isActive={item.isActive} table="transport-license" />}
        {role === "admin" && <FormModal table="transportLicense" type="delete" id={item.id} />}
      </div>
    </td>
  </tr>
);

const TransportLicensesPage = async ({ searchParams }) => {
  const { userId, sessionClaims } = await auth();
  const role = sessionClaims?.metadata?.role;

  const { page, ...queryParams } = searchParams;
  const p = page ? parseInt(page) : 1;

  const query = {};

  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined) {
        switch (key) {
          case "search":
            query.OR = [
              { licenseNumber: { contains: value, mode: "insensitive" } },
              { truck: { licensePlate: { contains: value, mode: "insensitive" } } }
            ];
            break;
          default:
            break;
        }
      }
    }
  }

  const [data, count] = await prisma.$transaction([
    prisma.transportLicense.findMany({
      where: query,
      include: {
        truck: true
      },
      orderBy: [
        { isActive: 'desc' },
        { licenseNumber: 'asc' }
      ],
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
    }),
    prisma.transportLicense.count({ where: query }),
  ]);

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">Transport Licenses</h1>
        <div className="flex flex-col md:flex-row w-full md:w-auto items-center gap-5">
          <TableSearch />
          {role === "admin" && <FormModal table="transportLicense" type="create" />}
        </div>
      </div>

      <div>
        <Table 
          columns={columns} 
          renderRow={(item) => renderRow({...item, isActive: !!item.isActive}, role)} 
          data={data} 
        />
      </div>

      <Pagination page={p} count={count} />
    </div>
  );
};

export default TransportLicensesPage; 