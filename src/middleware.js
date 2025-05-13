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

// Önbellekleme kontrolü ve CORS için helper fonksiyonu
function addCachingAndCorsHeaders(req, res) {
  // Gelen istek bir API isteği mi?
  const isApiRequest = req.nextUrl.pathname.startsWith('/api/');
  
  if (isApiRequest) {
    // API rotaları için header'lar ekleniyor
    res.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
    res.headers.set('Pragma', 'no-cache');
    res.headers.set('Expires', '0');
    
    // CORS için header'lar ekleniyor
    const origin = req.headers.get('origin');
    
    // Vercel preview ve production origin'lere izin vermek için regex
    const vercelPreviewRegex = /^https:\/\/[\w\-]+\.vercel\.app$/;
    const allowedOrigins = [
      'http://localhost:3000', 
      'https://vdtms.vercel.app',
      'https://vdtms-git-main-denizcans-projects.vercel.app',
      'https://vdtms-bfjkno1ta-denizcans-projects.vercel.app'
    ];
    
    // Origin header'ı varsa ve ya izin verilen bir origin ya da Vercel preview domain ise
    if (origin && (allowedOrigins.includes(origin) || vercelPreviewRegex.test(origin))) {
      res.headers.set('Access-Control-Allow-Origin', origin);
      
      // Preflight OPTIONS istekleri için gerekli header'lar
      if (req.method === 'OPTIONS') {
        res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.headers.set('Access-Control-Max-Age', '86400'); // 24 saat
      }
    }
  }
  
  return res;
}

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
  
  // Preflight OPTIONS istekleri için özel yanıt
  if (req.method === 'OPTIONS' && req.nextUrl.pathname.startsWith('/api/')) {
    const res = NextResponse.next();
    return addCachingAndCorsHeaders(req, res);
  }
  
  // Diğer istekler için devam et, ancak cache-control ve CORS header'larını ekle
  const res = NextResponse.next();
  return addCachingAndCorsHeaders(req, res);
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
