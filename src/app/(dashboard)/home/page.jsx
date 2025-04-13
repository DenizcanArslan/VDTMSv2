import prisma from "@/lib/prisma";
import { addDays, format, isBefore, addMonths } from "date-fns";
import Link from "next/link";
import FormModal from "@/components/FormModal";
import CompletionButton from "@/components/CompletionButton";
import { headers } from "next/headers";
import RefreshButton from "@/components/RefreshButton";

// Sayfanın her istekte yeniden oluşturulmasını sağlar
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const HomePage = async () => {
  // Önbelleği önlemek için rastgele bir değer oluştur
  const headersList = headers();
  const referer = headersList.get('referer') || '';
  const timestamp = Date.now();
  const cacheKey = `${referer}-${timestamp}`;
  
  const today = new Date();
  const nextWeek = addDays(today, 7);
  const nextMonth = addMonths(today, 1);

  // Tatil sorgusu için tarih değişkenleri
  const todayStart = new Date(today);
  todayStart.setHours(0, 0, 0, 0);
  
  const todayEnd = new Date(today);
  todayEnd.setHours(23, 59, 59, 999);
  
  const nextWeekEnd = new Date(nextWeek);
  nextWeekEnd.setHours(23, 59, 59, 999);

  // Yaklaşan araç muayeneleri
  const upcomingInspections = await prisma.vehicleInspection.findMany({
    where: {
      OR: [
        {
          // Önümüzdeki 1 hafta içinde olanlar
          inspectionDate: {
            gte: today,
            lte: nextWeek,
          },
        },
        {
          // Tarihi geçmiş ama tamamlanmamış olanlar
          inspectionDate: {
            lt: today,
          },
        }
      ],
      status: 'NOT_COMPLETED',  // Sadece tamamlanmamış olanları getir
      OR: [
        {
          truck: {
            isActive: true
          }
        },
        {
          trailer: {
            isActive: true
          }
        }
      ]
    },
    include: {
      truck: true,
      trailer: true,
    },
    orderBy: {
      inspectionDate: 'asc',
    },
  });

  // Yaklaşan araç bakımları
  const upcomingMaintenances = await prisma.vehicleMaintenance.findMany({
    where: {
      OR: [
        {
          // Önümüzdeki 1 hafta içinde olanlar
          maintenanceDate: {
            gte: today,
            lte: nextWeek,
          },
        },
        {
          // Tarihi geçmiş ama tamamlanmamış olanlar
          maintenanceDate: {
            lt: today,
          },
        }
      ],
      status: 'NOT_COMPLETED',
      OR: [
        {
          truck: {
            isActive: true
          }
        },
        {
          trailer: {
            isActive: true
          }
        }
      ]
    },
    include: {
      truck: true,
      trailer: true,
    },
    orderBy: {
      maintenanceDate: 'asc',
    },
  });

  // Yaklaşan sigorta süreleri
  const [trucks, trailers] = await prisma.$transaction([
    prisma.truck.findMany({
      where: {
        OR: [
          {
            // Önümüzdeki 1 hafta içinde bitecekler
            insuranceExpireDate: {
              gte: today,
              lte: nextWeek,
            },
          },
          {
            // Süresi geçmiş olanlar
            insuranceExpireDate: {
              lt: today,
            },
          }
        ],
        isActive: true,
      },
    }),
    prisma.trailer.findMany({
      where: {
        OR: [
          {
            // Önümüzdeki 1 hafta içinde bitecekler
            insuranceExpireDate: {
              gte: today,
              lte: nextWeek,
            },
          },
          {
            // Süresi geçmiş olanlar
            insuranceExpireDate: {
              lt: today,
            },
          }
        ],
        isActive: true,
      },
    }),
  ]);

  // Her araca bir vehicleType ekleyelim
  const expiringInsurances = [
    ...trucks.map(truck => ({ ...truck, vehicleType: 'truck' })),
    ...trailers.map(trailer => ({ ...trailer, vehicleType: 'trailer' }))
  ];

  // Sürücü belgeleri kontrolleri
  const expiringDriverDocuments = await prisma.driver.findMany({
    where: {
      isActive: true,
      OR: [
        {
          OR: [
            {
              // Önümüzdeki 1 hafta içinde bitecek ehliyet
              driverLicenseExpireDate: {
                gte: today,
                lte: nextWeek,
              },
            },
            {
              // Süresi geçmiş ehliyet
              driverLicenseExpireDate: {
                lt: today,
              },
            }
          ],
        },
        {
          OR: [
            {
              // Önümüzdeki 1 hafta içinde bitecek alpha pass
              alphaPassExpireDate: {
                gte: today,
                lte: nextWeek,
              },
            },
            {
              // Süresi geçmiş alpha pass
              alphaPassExpireDate: {
                lt: today,
              },
            }
          ],
        },
        {
          OR: [
            {
              // Önümüzdeki 1 hafta içinde bitecek takograf
              tachographExpireDate: {
                gte: today,
                lte: nextWeek,
              },
            },
            {
              // Süresi geçmiş takograf
              tachographExpireDate: {
                lt: today,
              },
            }
          ],
        },
        {
          OR: [
            {
              // Önümüzdeki 1 hafta içinde bitecek ADR belgesi
              adrExpireDate: {
                gte: today,
                lte: nextWeek,
              },
            },
            {
              // Süresi geçmiş ADR belgesi
              adrExpireDate: {
                lt: today,
              },
            }
          ],
        },
        {
          OR: [
            {
              // Önümüzdeki 1 hafta içinde bitecek Cargo Card
              cargoCardExpireDate: {
                gte: today,
                lte: nextWeek,
              },
            },
            {
              // Süresi geçmiş Cargo Card
              cargoCardExpireDate: {
                lt: today,
              },
            }
          ],
        },
      ],
    },
    orderBy: [
      { driverLicenseExpireDate: 'asc' },
      { alphaPassExpireDate: 'asc' },
      { tachographExpireDate: 'asc' },
      { adrExpireDate: 'asc' },
      { cargoCardExpireDate: 'asc' },
    ],
  });

  // Yaklaşan sürücü tatilleri
  const upcomingDriverHolidays = await prisma.driverHoliday.findMany({
    where: {
      OR: [
        {
          // Bugün başlayacak tatiller
          startDate: {
            gte: todayStart,
            lt: todayEnd,
          },
        },
        {
          // Önümüzdeki 1 hafta içinde başlayacak tatiller
          startDate: {
            gt: todayEnd,
            lte: nextWeekEnd,
          },
        },
        {
          // Devam eden tatiller (başlangıç tarihi geçmiş ama bitiş tarihi gelmemiş)
          AND: [
            {
              startDate: {
                lt: todayStart,
              },
            },
            {
              endDate: {
                gte: todayStart,
              },
            },
          ],
        },
      ],
    },
    include: {
      driver: {
        select: {
          id: true,
          name: true,
          surname: true,
          nickName: true,
        }
      },
    },
    orderBy: {
      startDate: 'asc',
    },
  });

  // Debug için tarih ve tatil bilgilerini yazdır
  console.log('Tarih Bilgileri:', {
    today: today.toISOString(),
    todayStart: todayStart.toISOString(),
    todayEnd: todayEnd.toISOString(),
    nextWeekEnd: nextWeekEnd.toISOString(),
  });
  
  console.log('Yaklaşan Tatiller:', upcomingDriverHolidays.map(h => ({
    id: h.id,
    driverName: `${h.driver.name} ${h.driver.surname}`,
    startDate: new Date(h.startDate).toISOString(),
    endDate: new Date(h.endDate).toISOString(),
    reason: h.reason
  })));

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <RefreshButton />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Muayene Uyarıları */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Upcoming Vehicle Inspections</h2>
            <Link href="/list/vehicle-inspections" className="text-sm text-dijle-dark-blue hover:underline">
              View All
            </Link>
          </div>
          
          {upcomingInspections.length > 0 ? (
            <div className="space-y-4">
              {upcomingInspections.map((inspection) => {
                const vehicle = inspection.truck || inspection.trailer;
                return (
                  <div key={inspection.id} className="flex items-center justify-between p-4 bg-orange-50 rounded-lg">
                    <div>
                      <p className="font-medium">{vehicle.licensePlate} ({vehicle.nickName})</p>
                      <p className="text-sm text-gray-600">
                        {format(new Date(inspection.inspectionDate), 'dd MMM yyyy')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <CompletionButton 
                        id={inspection.id}
                        status={inspection.status}
                        table="vehicle-inspections"
                      />
                      <Link 
                        href={`/list/vehicle-inspections/${inspection.id}`}
                        className="text-sm px-3 py-1 bg-dijle-dark-blue text-white rounded hover:bg-opacity-90"
                      >
                        Details
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500">No upcoming inspections in the next week</p>
          )}
        </div>

        {/* Bakım Uyarıları */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Upcoming Vehicle Maintenances</h2>
            <Link href="/list/vehicle-maintenances" className="text-sm text-dijle-dark-blue hover:underline">
              View All
            </Link>
          </div>
          
          {upcomingMaintenances.length > 0 ? (
            <div className="space-y-4">
              {upcomingMaintenances.map((maintenance) => {
                const vehicle = maintenance.truck || maintenance.trailer;
                return (
                  <div key={maintenance.id} className={`flex items-center justify-between p-4 ${maintenance.isGensetMaintenance ? 'bg-cyan-50' : 'bg-blue-50'} rounded-lg`}>
                    <div>
                      <p className="font-medium flex items-center flex-wrap">
                        <span>{vehicle.licensePlate} ({vehicle.nickName})</span>
                        {maintenance.isGensetMaintenance && (
                          <span className="ml-2 px-2 py-0.5 bg-cyan-600 text-white text-xs rounded-full flex items-center gap-1">
                            <span>❄️</span>
                            <span>Genset Maintenance</span>
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-gray-600">
                        {format(new Date(maintenance.maintenanceDate), 'dd MMM yyyy')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <CompletionButton 
                        id={maintenance.id}
                        status={maintenance.status}
                        table="vehicle-maintenances"
                      />
                      <Link 
                        href={`/list/vehicle-maintenances/${maintenance.id}`}
                        className="text-sm px-3 py-1 bg-dijle-dark-blue text-white rounded hover:bg-opacity-90"
                      >
                        Details
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500">No upcoming maintenances in the next week</p>
          )}
        </div>

        {/* Sigorta Uyarıları */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Expiring Insurance Documents</h2>
          </div>
          
          {expiringInsurances
            // Tarihe göre sıralama yapalım
            .sort((a, b) => new Date(a.insuranceExpireDate) - new Date(b.insuranceExpireDate))
            .map((vehicle) => (
              <div key={`${vehicle.id}-${vehicle.licensePlate}`} className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
                <div>
                  <p className="font-medium">{vehicle.licensePlate} ({vehicle.nickName})</p>
                  <p className="text-sm text-gray-600">
                    Expires: {format(new Date(vehicle.insuranceExpireDate), 'dd MMM yyyy')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <FormModal 
                    table={vehicle.vehicleType}
                    type="update" 
                    data={vehicle}
                  />
                  <Link 
                    href={`/list/${vehicle.vehicleType}s/${vehicle.id}`}
                    className="text-sm px-3 py-1 bg-dijle-dark-blue text-white rounded hover:bg-opacity-90"
                  >
                    Details
                  </Link>
                </div>
              </div>
            ))}
        </div>

        {/* Sürücü Belgeleri Uyarıları */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Expiring Driver Documents</h2>
            <Link href="/list/drivers" className="text-sm text-dijle-dark-blue hover:underline">
              View All Drivers
            </Link>
          </div>
          
          {expiringDriverDocuments.length > 0 ? (
            <div className="space-y-4">
              {expiringDriverDocuments.map((driver) => {
                // Süresi dolacak belgeleri bir diziye alıp tarihe göre sıralayalım
                const documents = [
                  driver.alphaPassExpireDate && {
                    type: 'Alpha Pass',
                    date: new Date(driver.alphaPassExpireDate)
                  },
                  driver.tachographExpireDate && {
                    type: 'Tachograph',
                    date: new Date(driver.tachographExpireDate)
                  },
                  driver.driverLicenseExpireDate && {
                    type: 'Driver License',
                    date: new Date(driver.driverLicenseExpireDate)
                  },
                  driver.adr === "YES" && driver.adrExpireDate && {
                    type: 'ADR',
                    date: new Date(driver.adrExpireDate)
                  },
                  driver.cargoCard === "YES" && driver.cargoCardExpireDate && {
                    type: 'Cargo Card',
                    date: new Date(driver.cargoCardExpireDate)
                  }
                ]
                .filter(doc => doc)
                .sort((a, b) => a.date - b.date);

                return (
                  <div key={driver.id} className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg">
                    <div>
                      <p className="font-medium">{driver.name} {driver.surname}</p>
                      <div className="mt-2 space-y-1 text-sm">
                        {documents.map((doc, index) => (
                          <p key={index} className="text-gray-600">
                            {doc.type}: {format(doc.date, 'dd MMM yyyy')}
                          </p>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <FormModal 
                        table="driver" 
                        type="update" 
                        data={driver}
                      />
                      <Link 
                        href={`/list/drivers/${driver.id}`}
                        className="text-sm px-3 py-1 bg-dijle-dark-blue text-white rounded hover:bg-opacity-90"
                      >
                        Details
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500">No driver documents expiring in the next month</p>
          )}
        </div>

        {/* Yaklaşan Sürücü Tatilleri */}
        <div className="bg-white p-6 rounded-lg shadow mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Upcoming Driver Holidays</h2>
            <Link href="/list/driver-holidays" className="text-sm text-dijle-dark-blue hover:underline">
              View All Holidays
            </Link>
          </div>
          
          {upcomingDriverHolidays.length > 0 ? (
            <div className="space-y-4">
              {upcomingDriverHolidays.map((holiday) => {
                const startDate = new Date(holiday.startDate);
                const endDate = new Date(holiday.endDate);
                const isOngoing = startDate < todayStart && endDate >= todayStart;
                const isToday = startDate >= todayStart && startDate < todayEnd;
                
                return (
                  <div 
                    key={holiday.id} 
                    className={`flex items-center justify-between p-4 rounded-lg ${
                      isOngoing ? 'bg-green-50' : isToday ? 'bg-yellow-50' : 'bg-blue-50'
                    }`}
                  >
                    <div>
                      <p className="font-medium">{holiday.driver.name} {holiday.driver.surname}</p>
                      <div className="mt-2 space-y-1 text-sm">
                        <p className="text-gray-600">
                          {format(startDate, 'dd MMM yyyy')} - {format(endDate, 'dd MMM yyyy')}
                        </p>
                        <p className="text-gray-600">
                          Status: {isOngoing ? 'Ongoing' : isToday ? 'Starting Today' : 'Upcoming'}
                        </p>
                        <p className="text-gray-600">
                          Reason: {holiday.reason.replace(/_/g, ' ')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link 
                        href={`/list/driver-holidays/${holiday.id}`}
                        className="text-sm px-3 py-1 bg-dijle-dark-blue text-white rounded hover:bg-opacity-90"
                      >
                        Details
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500">No upcoming driver holidays in the next week</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomePage;