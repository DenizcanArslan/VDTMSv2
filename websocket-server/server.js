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
  transports: ['websocket', 'polling'],
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

// API endpoint - bildirim gönder
app.post('/api/notify', async (req, res) => {
  try {
    const { event, data } = req.body;
    
    if (!event || !data) {
      return res.status(400).json({ success: false, message: 'Event ve data alanları zorunludur' });
    }
    
    // Event formatı: "transport:create", "slot:update" gibi
    const [type, action] = event.split(':');
    
    console.log(`Bildirim alındı: ${type}/${action}`, {
      event,
      dataType: typeof data, 
      hasSlots: !!data.slots,
      slotCount: data.slots ? Object.values(data.slots).flat().length : 0
    });
    
    // Özel olaylar için tüm kanallara bildirim gönder
    const globalEvents = ['slots:reorder', 'driver:assign', 'truck:assign'];
    if (globalEvents.includes(event)) {
      console.log(`${event} olayı tüm bağlantılara gönderiliyor...`);
      // Tüm bağlantılara bildirim gönder
      io.emit(event, data);
    } else {
      // İlgili kanalda bildirim gönder
      io.to(`${type}-updates`).emit(event, data);
    }
    
    return res.json({ success: true, message: `WebSocket mesajı gönderildi: ${type}/${action}` });
  } catch (error) {
    console.error('API hatası:', error);
    return res.status(500).json({ success: false, message: `Hata: ${error.message}` });
  }
});

// Sağlık kontrolü
app.get('/health', (req, res) => {
  res.json({ status: 'up', timestamp: new Date() });
});

// Sunucuyu başlat
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`WebSocket sunucusu port ${PORT} üzerinde çalışıyor`);
}); 