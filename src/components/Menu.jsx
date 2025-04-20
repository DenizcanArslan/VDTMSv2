"use client"
import { usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSocket } from '@/context/SocketContext';
import { FiWifi, FiWifiOff } from 'react-icons/fi';



const menuItems = [
  {
    title: "MENU",
    items: [
      {
        icon: "/icons/home.png",
        label: "Home",
        href: "/home",
        visible: ["admin","accountant"],
      },
      {
        icon: "/icons/planning.png",
        label: "Planning",
        href: "/planning",
        visible: ["admin","accountant"],
      },
      {
        icon: "/icons/trailer-container-cut.png",
        label: "Cut Transports",
        href: "/cut-transports",
        visible: ["admin","accountant"],
      },
      {
        icon: "/icons/driver.png",
        label: "Drivers",
        href: "/list/drivers",
        visible: ["admin","accountant"],
      },
      {
        icon: "/icons/truck.png",
        label: "Trucks",
        href: "/list/trucks",
        visible: ["admin","accountant"],
      },
      {
        icon: "/icons/trailer.png",
        label: "Trailers",
        href: "/list/trailers",
        visible: ["admin","accountant"],
      },
      {
        icon: "/icons/destination.png",
        label: "Frequent Locations",
        href: "/list/frequent-locations",
        visible: ["admin"],
      },
      {
        icon: "/icons/quay.png",
        label: "Quays",
        href: "/list/quays",
        visible: ["admin"],
      },
      {
        icon: "/icons/client.png",
        label: "Clients",
        href: "/list/clients",
        visible: ["admin","accountant"],
      },
      {
        icon: "/icons/price.png",
        label: "Prices",
        href: "/list/prices",
        visible: ["admin","accountant"],
      },
    ],
  },
  {
    title: "OTHER SERVICES",
    isCollapsible: true,
    items: [
      {
        icon: "/icons/inspection.png",
        label: "Vehicle Inspections",
        href: "/list/vehicle-inspections",
        visible: ["admin", "accountant"],
      },
      {
        icon: "/icons/maintenance.png",
        label: "Vehicle Maintenances",
        href: "/list/vehicle-maintenances",
        visible: ["admin"],
      },
      {
        icon: "/icons/holiday.png",
        label: "Driver Holidays",
        href: "/list/driver-holidays",
        visible: ["admin", "accountant"],
      },
      {
        icon: "/icons/transport-license.png",
        label: "Transport Licenses",
        href: "/list/transport-licenses",
        visible: ["admin", "accountant"],
      },
    ],
  },
  {
    title: "OTHER",
    items: [
      {
        icon: "/icons/profile.png",
        label: "Profile",
        href: "/profile",
        visible: ["admin","accountant"],
      },
      {
        icon: "/icons/setting.png",
        label: "Settings",
        href: "/settings",
        visible: ["admin","accountant"],
      },
      {
        icon: "/icons/logout.png",
        label: "Logout",
        href: "/logout",
        visible: ["admin","accountant"],
      },
    ],
  },
];

const Menu = ({role}) => {
  const pathname = usePathname();
 const { signOut } = useClerk();
  const router = useRouter();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [expandedSection, setExpandedSection] = useState(null);
  const { isConnected } = useSocket();

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  return (
    <>
      <div className="mt-2 text-xs">
        {menuItems.map((i) => (
          <div className="flex flex-col gap-1.5" key={i.title}>
            <div 
              className={`hidden lg:flex items-center gap-1.5 text-gray-400 my-2 cursor-pointer ${i.isCollapsible ? 'hover:text-gray-300' : ''}`}
              onClick={() => i.isCollapsible && setExpandedSection(expandedSection === i.title ? null : i.title)}
            >
              <span className="text-xs font-medium">{i.title}</span>
              {i.isCollapsible && (
                <svg
                  className={`w-3 h-3 transition-transform duration-300 ${expandedSection === i.title ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </div>
            <div 
              className={`flex flex-col gap-1 overflow-hidden transition-all duration-300 ease-in-out ${
                i.isCollapsible 
                  ? expandedSection === i.title 
                    ? 'max-h-96 opacity-100' 
                    : 'max-h-0 opacity-0'
                  : ''
              }`}
            >
              {i.items.map((item) => {
                if (item.visible.includes(role)) {
                  const isActive = pathname === item.href;

                  if (item.label === "Logout") {
                    return (
                      <button
                        key={item.label}
                        onClick={() => setShowLogoutModal(true)}
                        className={`flex items-center justify-center lg:justify-start text-gray-500 gap-2 px-1 md:px-1.5 lg:px-2 py-1.5 rounded-md transition-colors duration-300
                          ${isActive ? "bg-dijle-dark-blue text-white" : "hover:bg-dijle-light-blue hover:text-white"}`}
                      >
                        <div className="flex items-center gap-1.5">
                          <Image
                            src={item.icon}
                            width={16}
                            height={16}
                            alt={item.label}
                            className="min-w-[16px]"
                          />
                          <span className="hidden lg:block text-xs">{item.label}</span>
                        </div>
                      </button>
                    );
                  }

                  return (
                    <Link
                      href={item.href}
                      key={item.label}
                      className={`flex items-center justify-center lg:justify-start text-gray-500 gap-2 px-1 md:px-1.5 lg:px-2 py-1.5 rounded-md transition-colors duration-300
                        ${isActive ? "bg-dijle-dark-blue text-white" : "hover:bg-dijle-light-blue hover:text-white"}`}
                    >
                      <div className="flex items-center gap-1.5">
                        <Image
                          src={item.icon}
                          width={16}
                          height={16}
                          alt={item.label}
                          className="min-w-[16px]"
                        />
                        <span className="hidden lg:block text-xs">{item.label}</span>
                      </div>
                    </Link>
                  );
                }
                return null;
              })}
            </div>
          </div>
        ))}
        
        {/* Socket Connection Status */}
        <div className="mt-2 pt-2 border-t border-gray-200">
          <div className="hidden lg:flex items-center gap-1.5 text-gray-400 my-2">
            <span className="text-xs font-medium">SOCKET STATUS</span>
          </div>
          <div className="flex items-center justify-center lg:justify-start text-gray-500 gap-2 px-1 md:px-1.5 lg:px-2 py-1.5 rounded-md">
            <div className="flex items-center gap-1.5">
              <div className={`${isConnected ? 'text-green-500' : 'text-red-500'}`}>
                {isConnected ? <FiWifi size={16} /> : <FiWifiOff size={16} />}
              </div>
              <span className={`hidden lg:block text-xs ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
              <span className={`block lg:hidden text-[8px] ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                {isConnected ? 'ON' : 'OFF'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Logout Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-[90%] max-w-md">
            <h2 className="text-xl font-semibold mb-4">Confirm Logout</h2>
            <p className="text-gray-600 mb-6">Are you sure you want to log out?</p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors duration-200"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Menu;
