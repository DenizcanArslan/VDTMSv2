"use client"
import Image from "next/image";
import { useRouter } from "next/navigation";
import React from "react";

const TableSearch = () => {

  const router=useRouter();

  const handleSubmit=(e)=>{
    e.preventDefault();

    const value=e.currentTarget[0].value;
    const params = new URLSearchParams(window.location.search); // Mevcut URL'deki sorgu parametrelerini al
    params.set("search",value);
    params.delete("page"); // Sayfa parametresini kaldır, her zaman ilk sayfadan başla
    router.push(`${window.location.pathname}?${params}`); // URL'yi güncelle ve yeni sayfaya yönlendir


  }

  return (
    <form onSubmit={handleSubmit} className="w-full flex md:w-auto items-center  gap-2 text-xs rounded-full ring-[1.5px] ring-gray-300 px-2">
      <Image src="/icons/search.png" width={14} height={14} alt="search" />
      <input
        type="text"
        placeholder="Search..."
        className="w-[200px] p-2 bg-transparent outline-none"
      />
    </form>
  );
};

export default TableSearch;
