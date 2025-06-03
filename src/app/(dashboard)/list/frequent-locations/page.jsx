import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import FormModal from "@/components/FormModal";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import { ITEM_PER_PAGE } from "@/lib/settings";
import StatusButton from "@/components/StatusButton";

export const dynamic = 'force-dynamic';

const columns = [
  { header: "Name", accessor: "name" },
  { header: "Country", accessor: "country" },
  { header: "KM", accessor: "km" },
  { header: "Actions", accessor: "actions" },
];

const renderRow = (item, role) => (
  <tr
    key={item.id}
    className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-dijle-dark-blue hover:text-white transition-colors duration-200"
  >
    <td className="p-4 font-semibold">{item.name}</td>
    <td className="p-4">{item.country}</td>
    <td className="p-4">{item.km}</td>
    <td className="p-4 w-[100px] lg:w-[130px]">
      <div className="flex items-center gap-3 justify-center">
        {role === "admin" && <FormModal table="frequent-location" type="update" data={item} />}
        {role === "admin" && <StatusButton id={item.id} isActive={item.isActive} table="frequent-location" />}
      </div>
    </td>
  </tr>
);

const FrequentLocationsListPage = async ({ searchParams }) => {
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
              { name: { contains: value, mode: "insensitive" } },
              { country: { contains: value, mode: "insensitive" } },
            ];
            break;
          default:
            break;
        }
      }
    }
  }

  const [data, count] = await prisma.$transaction([
    prisma.frequentLocation.findMany({
      where: query,
      orderBy: [
        { isActive: 'desc' },
        { name: 'asc' }
      ],
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
    }),
    prisma.frequentLocation.count({ where: query }),
  ]);

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">Frequent Locations</h1>
        <div className="flex flex-col md:flex-row w-full md:w-auto items-center gap-5">
          <TableSearch />
          <div className="flex items-center gap-5">
            {role === "admin" && <FormModal table="frequent-location" type="create" />}
          </div>
        </div>
      </div>
      <div>
        <Table columns={columns} renderRow={(item) => renderRow(item, role)} data={data} />
      </div>
      <Pagination page={p} count={count} />
    </div>
  );
};

export default FrequentLocationsListPage; 