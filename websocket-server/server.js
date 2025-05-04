const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { Pool } = require('pg');

// Express uygulaması oluştur
const app = express();

// CORS yapılandırması
const frontendUrls = (process.env.FRONTEND_URL || 'http://localhost:3000').split(',');
app.use(cors({
  origin: frontendUrls, // Birden fazla origin'e izin ver
  methods: ['GET', 'POST'],
  credentials: true
}));

app.use(express.json());

// HTTP sunucusu oluştur
const server = http.createServer(app);

// Socket.IO sunucusu
const io = new Server(server, {
  cors: {
    origin: frontendUrls, // Birden fazla origin'e izin ver
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['polling', 'websocket'],
  allowEIO3: true, // Socket.IO 2.x istemcileri için eski protokol desteği
});

// PostgreSQL veritabanı bağlantısı
const pool = new Pool({
  user: process.env.POSTGRES_USER || 'Denizcan',
  host: process.env.POSTGRES_HOST || 'host.docker.internal',
  database: process.env.POSTGRES_DB || 'transport',
  password: process.env.POSTGRES_PASSWORD || 'Denizcan07',
  port: process.env.POSTGRES_PORT || 5432,
});

// Aktif bağlantılar
const activeConnections = new Map();

// Socket.IO olaylarını dinleme
io.on('connection', (socket) => {
  console.log('Yeni kullanıcı bağlandı', socket.id);
  activeConnections.set(socket.id, { socket });
  
  // Bağlantı kapat
  socket.on('disconnect', () => {
    console.log('Kullanıcı ayrıldı', socket.id);
    activeConnections.delete(socket.id);
  });
  
  // Transport ile ilgili bağlantılar
  socket.on('transport:subscribe', () => {
    socket.join('transport-updates');
    console.log(`${socket.id} transport güncellemelerine abone oldu`);
  });
  
  socket.on('transport:unsubscribe', () => {
    socket.leave('transport-updates');
    console.log(`${socket.id} transport güncellemelerinden aboneliği kaldırdı`);
  });
  
  // Slot ile ilgili bağlantılar
  socket.on('slot:subscribe', () => {
    socket.join('slot-updates');
    console.log(`${socket.id} slot güncellemelerine abone oldu`);
  });
  
  socket.on('slot:unsubscribe', () => {
    socket.leave('slot-updates');
    console.log(`${socket.id} slot güncellemelerinden aboneliği kaldırdı`);
  });
});

// Debounce mekanizması için slot-driver-note-updates nesnesi oluştur
const slotDriverNoteDebounce = {};

// API notifikasyon ve slot güncellemeleri için POST endpoint
app.post('/api/notify', async (req, res) => {
  try {
    const { event, data } = req.body;
    console.log('Bildirim alındı:', event, {
      event,
      dataType: typeof data,
      data: JSON.stringify(data).substring(0, 200) // Veriyi logla (maksimum 200 karakter)
    });

    // Driver start note güncellemeleri için özel işlem
    if (event === 'planning:slot:updated' && data?.updateType === 'driver-start-note') {
      // id veya slotId'yi kontrol et - her ikisi de olabilir
      const slotId = data.slotId || data.id;
      const driverStartNote = data.driverStartNote; 
      const date = data.date;

      if (!slotId) {
        console.error('Driver start note güncellemesi için slotId eksik:', data);
        return res.status(400).json({ error: 'Missing slotId in driver start note update' });
      }

      console.log('Driver start note güncellemesi alındı:', {
        slotId,
        driverStartNote,
        date,
        rawData: data
      });
      
      // Debounce işlemini uygula - aynı slot için önceki zamanlayıcıyı temizle
      if (slotDriverNoteDebounce[slotId]) {
        clearTimeout(slotDriverNoteDebounce[slotId]);
      }
      
      // DAHA AZ BEKLET: 500ms debounce uygula - kullanıcının yazma işlemini bitirmesini bekle
      // Bu asıl uygulamamızda 1 saniyeydi, test için 500ms yapalım
      slotDriverNoteDebounce[slotId] = setTimeout(() => {
        // Standart slot güncelleme eventini emisyon yap
        // Önemli: Client tarafında bu formata uygun veri yapısını bekleyecek
        io.to('slot-updates').emit('slot:update', {
          id: slotId, // Client'ın beklediği formatta ID
          driverStartNote, 
          date,
          updateType: 'driver-start-note'
        });
        
        console.log(`Driver start note güncellemesi yayınlandı: Slot #${slotId}, Değer: "${driverStartNote}"`);
        
        // Timeout referansını temizle
        delete slotDriverNoteDebounce[slotId];
      }, 500);
      
      return res.json({ success: true });
    }
    
    // Transport, slot, ve diğer event tipleri için ayrı ayrı kanallardan yayın yap
    if (event.startsWith('transport:')) {
      io.to('transport-updates').emit(event, data);
    } else if (event.startsWith('slot:')) {
      io.to('slot-updates').emit(event, data);
    } else if (event.startsWith('driver:')) {
      io.to('slot-updates').emit(event, data);
    } else if (event.startsWith('truck:')) {
      io.to('slot-updates').emit(event, data);
    } else if (event.startsWith('planning:')) {
      // planning:slot:updated eventi özel işleme için format dönüşümü
      if (event === 'planning:slot:updated') {
        console.log('Slot güncelleme eventi alındı, slot:update olarak iletiyor', data);
        
        // DÜZELTME: slot:update formatını düzelt - ID alanını garanti et
        const fixedData = { ...data };
        if (fixedData.slotId && !fixedData.id) {
          fixedData.id = fixedData.slotId;
        }
        
        io.to('slot-updates').emit('slot:update', fixedData);
      } else {
        io.to('slot-updates').emit('planning:update', data);
      }
    } else {
      // Standart generic event
      io.emit(event, data);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Bildirim gönderirken hata oluştu:', error);
    res.status(500).json({ error: 'Bildirim gönderilemedi' });
  }
});

// Sağlık kontrolü
app.get('/health', (req, res) => {
  res.json({ status: 'up', timestamp: new Date() });
});

// Sunucuyu başlat
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Socket.IO sunucusu port ${PORT} üzerinde çalışıyor`);
}); 