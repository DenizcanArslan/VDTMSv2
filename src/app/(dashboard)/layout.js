import { currentUser } from "@clerk/nextjs/server";

import Image from "next/image";
import Link from "next/link";
import Menu from "@/components/Menu";
import Navbar from "@/components/Navbar";
import DashboardRealTimeWrapper from "@/components/DashboardRealTimeWrapper";

export const metadata = {
  title: "Van Dijle",
  description: "Transport Management System",
};

export default async function DashboardLayout({ children }) {
  // Kullanıcı bilgilerini server-side alıyoruz
  const user = await currentUser();
  const role = user?.publicMetadata.role || null;

  return (
    <div className="h-screen flex">
      {/* LEFT SIDE OF SCREEN (Vertical Menu) */}
      <div className="w-[10%] md:w-[8%] lg:w-[16%] xl:w-[10%] 2xl:w-[8%] p-2 md:p-3 lg:p-4 flex flex-col">
        {/* Logo container with fixed height and z-index to stay on top */}
        <div className="relative h-[64px] w-full mb-4 z-10 bg-white">
          <Link
            href={"/home"}
            className="flex items-center justify-center lg:justify-start gap-2 w-full h-full"
          >
            <Image
              src="/logo/vd-transport-logo.png"
              alt="logo"
              layout="fill"
              objectFit="contain"
              className="h-auto"
            />
          </Link>
        </div>

        {/* Menu with overflow handling */}
        <div className="flex-1 overflow-y-auto">
          <Menu role={role}/>
        </div>
      </div>

      {/* RIGHT SIDE OF SCREEN (Horizontal Menu + Main section) */}
      <div className="w-[90%] md:w-[92%] lg:w-[84%] xl:w-[90%] 2xl:w-[92%] bg-[#F7F8FA] overflow-scroll flex flex-col">
        <Navbar />
        <DashboardRealTimeWrapper>
          {children}
        </DashboardRealTimeWrapper>
      </div>
    </div>
  );
}
