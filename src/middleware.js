// Gerekli modüller ve ayarlar içe aktarılıyor.
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'; // Clerk middleware ve route matcher fonksiyonu içe aktarılıyor.
import { routeAccessMap } from './lib/settings'; // Rota erişim izinlerinin tanımlandığı ayar dosyası içe aktarılıyor.
import { NextResponse } from 'next/server'; // Next.js özel cevap (response) sınıfı içe aktarılıyor.

// routeAccessMap'teki tüm rotalar üzerinden geçiliyor ve her bir rota için bir matcher ve izin verilen roller tanımlanıyor.
const matchers = Object.keys(routeAccessMap).map(route => ({
  matcher: createRouteMatcher([route]), // Her rota için bir route matcher (eşleştirici) oluşturuluyor.
  allowedRoles: routeAccessMap[route], // Rota için izin verilen roller alınıyor.
}));

// Matchers dizisi, matcher ve rollerin kontrolü için konsola yazdırılıyor.
//console.log(matchers);

// Clerk middleware oluşturuluyor. Bu middleware, kullanıcı oturumunu doğrulamak ve rolleri kontrol etmek için kullanılıyor.
export default clerkMiddleware(async (auth, req) => {
  const { sessionClaims } = await auth(); // Clerk oturum bilgileri asenkron bir şekilde alınıyor.
  //console.log(sessionClaims); // Oturum bilgileri konsola yazdırılıyor.

  const role = sessionClaims?.metadata?.role; // Kullanıcının rolü oturum bilgileri içindeki metadata'dan alınıyor.

  // Tanımlanan tüm matcher'lar (rotalar) üzerinde döngü yapılıyor.
  for (const { matcher, allowedRoles } of matchers) {
    // Eğer istek bir route ile eşleşiyor ve kullanıcının rolü bu route için izin verilen roller arasında değilse:
    if (matcher(req) && !allowedRoles.includes(role)) {
      // Kullanıcı, sign-in sayfasina yonlendiriliyor
      return NextResponse.redirect(new URL(`/`, req.url));
    }
  }
});

// Middleware yapılandırması (hangi rotalarda çalışacağı belirtiliyor).
export const config = {
  matcher: [
    // Next.js dahili dosyalarını ve statik dosyaları atla (html, css, js, resimler vb. hariç tutuluyor).
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // API rotaları için middleware'i her zaman çalıştır.
    '/(api|trpc)(.*)',
  ],
};
