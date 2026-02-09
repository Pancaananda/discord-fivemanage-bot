# 🖥️ Deploy Discord Bot di RDP Windows

## Spesifikasi Minimum
✅ **Spek Anda sudah cukup:**
- CPU: 1 Core
- RAM: 1GB (bot hanya pakai ~100-200MB)
- Storage: 40GB (bot + Node.js hanya ~500MB)

---

## Port & Network Requirements

### ❌ Port TIDAK perlu dibuka
Discord bot **tidak butuh port inbound** karena:
- Bot connect **keluar** ke Discord API (outbound)
- Tidak ada yang connect **masuk** ke bot

### ✅ Yang perlu diizinkan Firewall
**Outbound connections ke:**
- `discord.com` (port 443 - HTTPS)
- `api.fivemanage.com` (port 443 - HTTPS)
- `cdn.discordapp.com` (port 443 - HTTPS)

Windows Firewall biasanya **sudah allow** outbound connections by default.

---

## Langkah Setup di RDP Windows

### 1. Install Node.js
1. Remote Desktop ke Windows RDP
2. Download Node.js LTS: https://nodejs.org/
3. Install dengan default settings
4. Restart Command Prompt/PowerShell setelah install

**Cek instalasi:**
```powershell
node --version
npm --version
```

### 2. Clone Project dari GitHub

**Option A: Dengan Git (Recommended)**
```powershell
# Install Git dulu jika belum
# Download: https://git-scm.com/download/win

# Clone repository
cd C:\
git clone https://github.com/Pancaananda/discord-fivemanage-bot.git
cd discord-fivemanage-bot
```

**Option B: Download ZIP Manual**
1. Download dari: https://github.com/Pancaananda/discord-fivemanage-bot/archive/refs/heads/main.zip
2. Extract ke `C:\discord-fivemanage-bot`
3. Buka PowerShell di folder tersebut

### 3. Setup Environment Variables

Buat file `.env`:
```powershell
Copy-Item .env.example .env
notepad .env
```

Edit isi file `.env`:
```env
DISCORD_TOKEN=your_discord_token_here
FIVEMANAGE_TOKEN=your_fivemanage_token_here
FIVEMANAGE_ENDPOINT=https://api.fivemanage.com/api/v2/image
CHANNEL_ID=your_channel_id_here
STORAGE_THRESHOLD_GB=9.8
```

Save dan close.

### 4. Install Dependencies

```powershell
npm install
```

### 5. Test Run Bot

```powershell
npm start
```

Jika muncul `✅ Bot siap!` berarti **berhasil!**

---

## Setup Auto-Start dengan PM2

Agar bot **jalan terus** bahkan setelah close PowerShell:

### Install PM2
```powershell
npm install -g pm2
npm install -g pm2-windows-startup
```

### Setup PM2 Windows Service
```powershell
pm2-startup install
```

### Start Bot dengan PM2
```powershell
# Di folder project
pm2 start index.js --name discord-bot

# Save agar auto-start saat reboot
pm2 save
```

### Command PM2 Berguna
```powershell
# Lihat status bot
pm2 status

# Lihat logs
pm2 logs discord-bot

# Restart bot
pm2 restart discord-bot

# Stop bot
pm2 stop discord-bot

# Start bot lagi
pm2 start discord-bot

# Hapus dari PM2
pm2 delete discord-bot
```

---

## Troubleshooting

### Bot tidak jalan setelah reboot
```powershell
pm2 resurrect
```

### Check apakah PM2 service running
```powershell
Get-Service PM2*
```

### Restart PM2 service
```powershell
Restart-Service PM2
```

### Bot offline terus
1. Cek logs: `pm2 logs discord-bot`
2. Cek token Discord masih valid
3. Cek internet connection RDP

### Memory usage tinggi
```powershell
# Restart bot setiap hari jam 3 pagi
pm2 start index.js --name discord-bot --cron-restart="0 3 * * *"
```

---

## Firewall Configuration (Jika Diperlukan)

### Allow Outbound di Windows Firewall

1. **Buka Windows Defender Firewall**
   - Search "Windows Defender Firewall"
   - Klik "Advanced settings"

2. **Outbound Rules** (biasanya sudah allow by default)
   - Klik "Outbound Rules" → "New Rule"
   - Pilih "Program" → Next
   - Browse ke `C:\Program Files\nodejs\node.exe`
   - Allow the connection
   - Apply to all profiles (Domain, Private, Public)
   - Name: "Node.js Discord Bot"

**Note:** Biasanya step ini **TIDAK perlu** karena Windows allow outbound by default.

---

## Update Bot

Jika ada update di GitHub:

```powershell
# Stop bot
pm2 stop discord-bot

# Pull update
git pull origin main

# Install dependencies baru (jika ada)
npm install

# Restart bot
pm2 restart discord-bot
```

---

## Performance Monitoring

### Resource Usage
```powershell
# Lihat CPU & Memory usage
pm2 monit
```

**Expected usage:**
- CPU: 0-5% (idle), 10-20% (active)
- Memory: 100-200MB
- Disk: ~500MB total

### Bot uptime
```powershell
pm2 status
```

---

## Backup & Restore

### Backup
```powershell
# Backup folder project
Copy-Item -Recurse C:\discord-fivemanage-bot C:\Backup\discord-bot-backup
```

### Restore
```powershell
# Copy kembali folder backup
Copy-Item -Recurse C:\Backup\discord-bot-backup C:\discord-fivemanage-bot

# Restart bot
cd C:\discord-fivemanage-bot
pm2 restart discord-bot
```

---

## Security Best Practices

1. ✅ **Jangan share file `.env`**
2. ✅ **Gunakan RDP dengan password kuat**
3. ✅ **Update Node.js secara berkala**
4. ✅ **Backup `.env` di tempat aman**
5. ✅ **Monitor logs untuk aktivitas aneh**

---

## Summary Checklist

- [ ] Install Node.js LTS
- [ ] Clone/Download project dari GitHub
- [ ] Buat file `.env` dengan token yang benar
- [ ] Run `npm install`
- [ ] Test: `npm start`
- [ ] Install PM2: `npm install -g pm2 pm2-windows-startup`
- [ ] Setup startup: `pm2-startup install`
- [ ] Start with PM2: `pm2 start index.js --name discord-bot`
- [ ] Save: `pm2 save`
- [ ] Test reboot: Restart RDP dan cek `pm2 status`

---

## Keuntungan RDP vs Railway

| Feature | RDP Windows | Railway |
|---------|-------------|---------|
| Biaya | Fixed monthly | Pay per usage |
| Control | Full control | Limited control |
| Setup | Manual | Auto deployment |
| Updates | Manual git pull | Auto on push |
| Monitoring | PM2 manual | Built-in dashboard |
| Port needed | None | None |

**Rekomendasi:** RDP bagus jika sudah punya/murah dan ingin full control!

---

## Support

Jika ada masalah:
1. Cek logs: `pm2 logs discord-bot`
2. Cek internet: `ping discord.com`
3. Cek service: `Get-Service PM2*`
4. Restart bot: `pm2 restart discord-bot`
