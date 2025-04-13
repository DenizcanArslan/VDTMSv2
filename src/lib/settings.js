export const ITEM_PER_PAGE=10


export const routeAccessMap={
    "/home(.*)": ["admin","accountant"],
    "/planning(.*)": ["admin","accountant"],
    "/list/drivers(.*)": ["admin","accountant"],
    "/list/trucks(.*)": ["admin","accountant"],
    "/list/trailers(.*)": ["admin","accountant"],
    "/list/destinations(.*)": ["admin"],
    "/list/frequent-locations(.*)": ["admin","accountant"],
    "/list/quays(.*)": ["admin"],
    "/list/clients(.*)": ["admin","accountant"],
    "/list/maintenances(.*)": ["admin","accountant"],
    "/list/prices(.*)": ["admin","accountant"],
   
    //SONRADAN EKLENEN SAYFALAR ICIN URL KORUMASI -->
    "/list/vehicle-inspections(.*)": ["admin","accountant"],
    "/list/vehicle-maintenances(.*)": ["admin","accountant"],
    "/list/driver-holidays(.*)": ["admin","accountant"],
    "/list/transport-licenses(.*)": ["admin","accountant"],

}