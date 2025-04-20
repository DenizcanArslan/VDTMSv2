//CACHE SIKINTISI OLUYOR  driversListPage'deki gibi kullan//

import { auth } from "@clerk/nextjs/server";

// Modül düzeyinde çağrı yerine, bu fonksiyonları istek kapsamında kullanmak için
// bir yardımcı fonksiyon olarak tanımlayalım
export async function getUserAuth() {
  const { userId, sessionClaims } = await auth();
  const role = sessionClaims?.metadata?.role;
  
  return {
    userId,
    role
  };
}

// Artık role ve currentUserId'yi direkt export etmiyoruz
// Bunları getUserAuth() fonksiyonu üzerinden alacağız