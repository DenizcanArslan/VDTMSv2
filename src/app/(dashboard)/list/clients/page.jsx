import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import FormModal from "@/components/FormModal";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import Image from "next/image";
import { ITEM_PER_PAGE } from "@/lib/settings";
import StatusButton from "@/components/StatusButton";
import Link from "next/link";








// To render table's head and body
const renderRow = (item, role) => (
  <tr
    key={item.id}
    className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-dijle-dark-blue hover:text-white transition-colors duration-200"
  >
    <td className="p-4 font-semibold">{item.name}</td>
    <td className="p-4 hidden lg:table-cell">{item.vatNumber || "-"}</td>
    <td className="p-4 hidden lg:table-cell">
      {item.invoiceMails?.length > 0 
        ? item.invoiceMails.map(mail => mail.email).join(", ") 
        : "-"}
    </td>
    <td className="p-4 w-[100px] lg:w-[130px]">
      <div className="flex items-center gap-3 justify-center">
        <Link href={`/list/clients/${item.id}`}>
          <button className="w-7 h-7 flex items-center justify-center rounded-full bg-green-400 hover:bg-dijle-light-blue transition duration-200">
            <Image src={"/icons/view.svg"} width={16} height={16} />
          </button>
        </Link>
        {role === "admin" && <FormModal table="client" type="update" data={item} />}
        {role === "admin" && <StatusButton id={item.id} isActive={item.isActive} table="client" />}
      </div>
    </td>
  </tr>
);



const ClientsListPage = async({searchParams}) => {

  const { userId, sessionClaims } = await auth(); // Role dinamik olarak alınıyor
const role = sessionClaims?.metadata?.role;


const columns = [
  { header: "Client Name", accessor: "name" },
  { header: "VAT Number", accessor: "vatNumber", className: "hidden lg:table-cell" },
  { header: "Invoice Mails", accessor: "invoiceMails", className: "hidden lg:table-cell" },
  { header: "Actions", accessor: "actions" },
];


  const { page, ...queryParams } = searchParams;
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
            ];
            break;
          default:
            break;
        }
      }
    }
  }

  const [data, count] = await prisma.$transaction([
    prisma.client.findMany({
      where: query,
      orderBy: [
        { isActive: 'desc' },
        { name: 'asc' }
      ],
      include: {
        emergencyContacts: true,
        invoiceMails: true
      },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
    }),
    prisma.client.count({ where: query }),
  ]);
  
    return (
      <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
        <div className="flex items-center justify-between">
          <h1 className="hidden md:block text-lg font-semibold">All Clients</h1>
          <div className="flex flex-col md:flex-row w-full md:w-auto items-center gap-5">
            <TableSearch />
            <div className="flex items-center gap-5">
              <button className="w-8 h-8 flex items-center justify-center rounded-full border-dijle-light-blue border-2 hover:border-dijle-dark-blue transition-colors duration-300">
                <Image src={"/icons/filter.png"} width={14} height={14} />
              </button>
              {role === "admin" && <FormModal table="client" type="create" />}
            </div>
          </div>
        </div>
        <div>
          <Table columns={columns} renderRow={(item) => renderRow(item, role)} data={data} />
        </div>
        <Pagination page={p} count={count} />
      </div>
  )
}


export default ClientsListPage
