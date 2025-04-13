"use client";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { useRouter } from "next/navigation";
import React from "react";

const Pagination = ({ page, count }) => {


  const router = useRouter(); // Next.js router'ını kullanmak için useRouter hook'unu çağır

  const hasPrev = ITEM_PER_PAGE * (page - 1) > 0; // Önceki sayfaya geçiş yapılıp yapılamayacağını kontrol et
  const hasNext = ITEM_PER_PAGE * (page - 1) + ITEM_PER_PAGE < count; // Sonraki sayfaya geçiş yapılıp yapılamayacağını kontrol et

  const changePage = (newPage) => { // Sayfa değişim fonksiyonu
    const params = new URLSearchParams(window.location.search); // Mevcut URL'deki sorgu parametrelerini al
    params.set("page", newPage.toString()); // Yeni sayfa numarasını sorgu parametrelerine ekle
    router.push(`${window.location.pathname}?${params}`); // URL'yi güncelle ve yeni sayfaya yönlendir
  };

  return (
    <div className="p-4 flex items-center justify-between text-gray-500">
      <button className="py-2 px-4 rounded-md bg-slate-200 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed" disabled={!hasPrev} onClick={() => {
                  changePage(page-1);
                }}>
        Prev
      </button>
      <div className="flex items-center gap-2 text-sm">
        {Array.from({ length: Math.ceil(count / ITEM_PER_PAGE) }).map(
          (_, index) => {
            const pageIndex = index + 1;
            return (
              <button
                key={pageIndex}
                className={`px-2 rounded-sm ${
                  page === pageIndex ? "bg-dijle-dark-blue text-white  " : ""
                }`}
                onClick={() => {
                  changePage(pageIndex);
                }}
              >
                {pageIndex}
              </button>
            );
          }
        )}
      </div>
      <button className="py-2 px-4 rounded-md bg-slate-200 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed" disabled={!hasNext} onClick={() => {
                  changePage(page+1);
                }}>
        Next
      </button>
    </div>
  )
}

export default Pagination