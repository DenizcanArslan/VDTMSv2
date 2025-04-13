"use client";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";

const FilterButton = ({ filterKey, options }) => {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const router = useRouter();
  const params = useSearchParams();
  const currentFilter = params.get(filterKey);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsFilterOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleFilter = (value) => {
    const newParams = new URLSearchParams(params.toString());
    if (value) {
      newParams.set(filterKey, value);
    } else {
      newParams.delete(filterKey);
    }
    newParams.delete("page");
    router.push(`?${newParams.toString()}`);
    setIsFilterOpen(false);
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          className="w-8 h-8 flex items-center justify-center rounded-full border-dijle-light-blue border-2 hover:border-dijle-dark-blue transition-colors duration-300"
        >
          <Image src={"/icons/filter.png"} width={14} height={14} alt="filter" />
        </button>

        {isFilterOpen && (
          <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
            <div className="py-1">
              <button
                onClick={() => handleFilter("")}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                All
              </button>
              {options.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleFilter(option.value)}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {currentFilter && (
        <span className="px-3 py-1.5 text-sm font-semibold bg-dijle-light-blue text-white rounded-full">
          {currentFilter}
        </span>
      )}
    </div>
  );
};

export default FilterButton; 