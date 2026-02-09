# Discord Bot - FiveManage Image Uploader

Bot Discord yang otomatis mengupload gambar yang dikirim di channel ke FiveManage.com dan memberikan link hasil upload.

## 📋 Fitur

- ✅ Otomatis detect gambar di Discord
- ✅ Upload ke FiveManage.com
- ✅ Reply dengan link hasil upload
- ✅ Support multiple images sekaligus
- ✅ Bisa filter specific channel saja

## 🚀 Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Discord Bot

1. Buka [Discord Developer Portal](https://discord.com/developers/applications)
2. Klik "New Application" dan beri nama
3. Pergi ke tab "Bot" → Klik "Add Bot"
4. **Aktifkan Privileged Gateway Intents:**
   - ✅ MESSAGE CONTENT INTENT
5. Copy token bot (akan digunakan di .env)

### 3. Invite Bot ke Server

1. Pergi ke tab "OAuth2" → "URL Generator"
2. Pilih scopes: `bot`
3. Pilih permissions:
   - ✅ Read Messages/View Channels
   - ✅ Send Messages
   - ✅ Read Message History
   - ✅ Add Reactions
4. Copy URL dan buka di browser untuk invite bot

### 4. Setup FiveManage API

1. Buka [FiveManage.com](https://fivemanage.com/)
2. Login/Register
3. Dapatkan API token dari dashboard
4. Copy token (akan digunakan di .env)

### 5. Konfigurasi Environment

1. Copy file `.env.example` menjadi `.env`:
```bash
copy .env.example .env
```

2. Edit file `.env` dan isi:
```env
DISCORD_TOKEN=token_bot_discord_kamu
FIVEMANAGE_TOKEN=token_fivemanage_kamu
CHANNEL_ID=  # opsional: isi dengan channel ID jika ingin filter channel tertentu
```

**Tips mendapatkan Channel ID:**
- Aktifkan Developer Mode di Discord: Settings → Advanced → Developer Mode
- Klik kanan channel → Copy ID

### 6. Jalankan Bot

```bash
npm start
```

Atau untuk development:
```bash
npm run dev
```

## 💡 Cara Pakai

1. Upload gambar di channel Discord yang dipantau bot
2. Bot akan react dengan ⏳ saat memproses
3. Setelah selesai, bot akan:
   - React dengan ✅
   - Reply dengan link FiveManage hasil upload

## 🔧 Troubleshooting

### Bot tidak respond

- Pastikan `MESSAGE CONTENT INTENT` sudah diaktifkan di Discord Developer Portal
- Pastikan bot sudah di-invite dengan permissions yang benar
- Check console untuk error messages

### Error upload ke FiveManage

- Pastikan FIVEMANAGE_TOKEN valid
- Check quota FiveManage account kamu
- Pastikan file size tidak melebihi limit

## 📦 Deploy

### Deploy ke Railway.app

1. Push code ke GitHub
2. Buka [Railway.app](https://railway.app/)
3. Klik "New Project" → "Deploy from GitHub repo"
4. Pilih repository
5. Add environment variables di Settings
6. Deploy otomatis berjalan

### Deploy ke Render.com

1. Push code ke GitHub
2. Buka [Render.com](https://render.com/)
3. Klik "New +" → "Background Worker"
4. Connect repository
5. Set environment variables
6. Deploy

### Deploy ke VPS

1. SSH ke VPS kamu
2. Clone repository
3. Install Node.js dan npm
4. Setup .env file
5. Install PM2: `npm install -g pm2`
6. Jalankan: `pm2 start index.js --name discord-bot`
7. Save: `pm2 save`
8. Auto-start: `pm2 startup`

## 📝 License

MIT
