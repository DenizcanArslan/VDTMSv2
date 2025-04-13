import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import FormModal from "@/components/FormModal";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import FilterButton from "@/components/FilterButton";
import { ITEM_PER_PAGE } from "@/lib/settings";
import Link from "next/link";
import StatusButton from "@/components/StatusButton";
import Image from "next/image";

const columns = [
  { header: "Name", accessor: "name" },
  { header: "Quay Number", accessor: "quayNumber" },
  { header: "Lo/Ro", accessor: "isLoRo", className: "hidden lg:table-cell" },
  { header: "Actions", accessor: "actions" },
];

const renderRow = (item, role) => (
  <tr
    key={item.id}
    className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-dijle-dark-blue hover:text-white transition-colors duration-200"
  >
    <td className="p-4 font-semibold">{item.name}</td>
    <td className="p-4">{item.quayNumber || "-"}</td>
    <td className="p-4">{item.isLoRo || "-"}</td>
    <td className="p-4 w-[100px] lg:w-[130px]">
      <div className="flex items-center gap-3 justify-center">
        <Link href={`/list/quays/${item.id}`}>
          <button className="w-7 h-7 flex items-center justify-center rounded-full bg-green-400 hover:bg-dijle-light-blue transition duration-200">
            <Image src={"/icons/view.svg"} width={16} height={16} />
          </button>
        </Link>
        {role === "admin" && <FormModal table="quay" type="update" data={item} />}
        {role === "admin" && <StatusButton id={item.id} isActive={item.isActive} table="quay" />}
      </div>
    </td>
  </tr>
);

const QuaysListPage = async ({ searchParams }) => {
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
              { name: { contains: value, mode: "insensitive" } }
            ];
            
            if (/^\d+$/.test(value)) {
              query.OR.push({ quayNumber: parseInt(value) });
            }
            break;
          case "isLoRo":
            query.isLoRo = value.toUpperCase();
            break;
          default:
            break;
        }
      }
    }
  }

  const [data, count] = await prisma.$transaction([
    prisma.quay.findMany({
      where: query,
      orderBy: [
        { isActive: 'desc' },
        { name: 'asc' }
      ],
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
    }),
    prisma.quay.count({ where: query }),
  ]);

  const serializedData = data.map(quay => ({
    ...quay,
    terminalFee: quay.terminalFee ? quay.terminalFee.toString() : null
  }));

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">All Quays</h1>
        <div className="flex flex-col md:flex-row w-full md:w-auto items-center gap-5">
          <TableSearch />
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-3">
              <FilterButton 
                filterKey="isLoRo" 
                options={[
                  { value: "LO", label: "LO" },
                  { value: "RO", label: "RO" }
                ]} 
              />
              {searchParams.isLoRo && (
                <Link 
                  href="/list/quays"
                  className="px-3 py-1.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-full transition-colors duration-200"
                >
                  Clear Filters
                </Link>
              )}
            </div>
            {role === "admin" && <FormModal table="quay" type="create" />}
          </div>
        </div>
      </div>
      <div>
        <Table columns={columns} renderRow={(item) => renderRow(item, role)} data={serializedData} />
      </div>
      <Pagination page={p} count={count} />
    </div>
  );
};

export default QuaysListPage; 