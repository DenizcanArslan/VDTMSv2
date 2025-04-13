import { UserButton } from "@clerk/nextjs";
import {currentUser} from "@clerk/nextjs/server"
import Image from "next/image";
import React from "react";


const Navbar =async () => {

   const user=await currentUser()
//  console.log(user);


  return (
    <div className="flex items-center justify-between p-4">

      {/*SEARCH BAR*/}
      {/* <div className="hidden md:flex items-center gap-2 text-xs rounded-full ring-[1.5px] ring-gray-300 px-2">
        <Image src="/icons/search.png" width={14} height={14} />
        <input
          type="text"
          placeholder="Search..."
          className="w-[200px] p-2 bg-transparent outline-none"
        />
      </div>*/}


     {/*ICONS AND USER*/}
     <div className="flex  items-center gap-6  w-full  justify-end">
       

        <div className=" flex flex-col">
          <span className="text-xs leading-3 font-medium">{user?.firstName} {user?.lastName}</span>
          <span className="text-[10px] text-right text-gray-500">{user?.publicMetadata.role}</span>
        </div>
        {/* <Image
          src={"/icons/profile.png"}
          width={36}
          height={36}
          className="rounded-full"
        /> */}
        <UserButton/>
      </div>


    </div>
  );
};

export default Navbar;
