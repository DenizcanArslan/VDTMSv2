import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import FormModal from "@/components/FormModal";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import { ITEM_PER_PAGE } from "@/lib/settings";
import Image from "next/image";
import Link from "next/link";
import FilterButton from "@/components/FilterButton";
import StatusButton from "@/components/StatusButton";

export const columns = [
  { header: "Name", accessor: "name" },
  { header: "Surname", accessor: "surname" },
  { header: "Nick Name", accessor: "nickName" },
  { header: "Alpha Pass Nr", accessor: "alphaPassNumber", className: "hidden lg:table-cell" },
  { header: "Cargo Card", accessor: "cargoCard", className: "hidden lg:table-cell" },
  { header: "ADR", accessor: "adr", className: "hidden lg:table-cell" },
  { header: "Actions", accessor: "actions" }
];

//To render table's head and body
const renderRow = (item, role) => (
  <tr
    key={item.id}
    className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-dijle-dark-blue hover:text-white transition-colors duration-200"
  >
    <td className="p-4 font-semibold">{item.name}</td>
    <td className="p-4">{item.surname}</td>
    <td className="p-4">{item.nickName}</td>
    <td className="p-4 hidden lg:table-cell">{item.alphaPassNumber || "-"}</td>
    <td className="p-4 hidden lg:table-cell">{item.cargoCard}</td>
    <td className="p-4 hidden lg:table-cell">{item.adr}</td>
    <td className="p-4 w-[100px] lg:w-[130px]">
      <div className="flex items-center gap-3 justify-center">
        <Link href={`/list/drivers/${item.id}`}>
          <button className="w-7 h-7 flex items-center justify-center rounded-full bg-green-400 hover:bg-dijle-light-blue transition duration-200">
            <Image src={"/icons/view.svg"} width={16} height={16} />
          </button>
        </Link>
        {role === "admin" && <FormModal table="driver" type="update" data={item} />}
        {role === "admin" && <StatusButton id={item.id} isActive={item.isActive} />}
      </div>
    </td>
  </tr>
);

const DriversListPage = async ({ searchParams }) => {
  const { userId, sessionClaims } = await auth();
  const role = sessionClaims?.metadata?.role;

  const { page, ...queryParams } = searchParams;

  console.log(searchParams);

  const p = page ? parseInt(page) : 1;

  // URL PARAMS CONDITION
  const query = {};

  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined) {
        switch (key) {
          case "search":
            query.OR = [
              { name: { contains: value, mode: "insensitive" } },
              { surname: { contains: value, mode: "insensitive" } },
              { nickName: { contains: value, mode: "insensitive" } }
            ];
            break;
          case "adr":
            query.adr = value.toUpperCase();
            break;
          case "cargoCard":
            query.cargoCard = value.toUpperCase();
            break;
          default:
            break;
        }
      }
    }
  }

  const [data, count] = await prisma.$transaction([
    prisma.driver.findMany({
      where: query,
      orderBy: [
        { isActive: 'desc' },
        { name: 'asc' }
      ],
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
    }),
    prisma.driver.count({ where: query }),
  ]);

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP */}
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">All Drivers</h1>
        <div className="flex flex-col md:flex-row w-full md:w-auto items-center gap-5">
          <TableSearch />
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-3">
              <FilterButton 
                filterKey="adr" 
                options={[
                  { value: "NO", label: "ADR: NO" },
                  { value: "YES", label: "ADR: YES" }
                ]} 
              />
              <FilterButton 
                filterKey="cargoCard" 
                options={[
                  { value: "NO", label: "Cargo Card: NO" },
                  { value: "YES", label: "Cargo Card: YES" }
                ]} 
              />
              {(searchParams.adr || searchParams.cargoCard) && (
                <Link 
                  href="/list/drivers"
                  className="px-3 py-1.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-full transition-colors duration-200"
                >
                  Clear Filters
                </Link>
              )}
            </div>
            {role === "admin" && <FormModal table="driver" type="create" />}
          </div>
        </div>
      </div>

      {/* LIST */}
      <div>
        <Table columns={columns} renderRow={(item) => renderRow(item, role)} data={data} />
      </div>

      {/*PAGINATION */}
      <Pagination page={p} count={count} />
    </div>
  );
};

export default DriversListPage;
