# 🔄 Auto-Fallback ke Secondary API - Panduan

## Fitur
Bot akan **otomatis switch** ke secondary API jika storage primary hampir penuh.

---

## Cara Kerja

1. **Bot track** setiap file yang diupload (ukurannya)
2. **Hitung total** storage yang sudah terpakai
3. **Jika mencapai threshold** (default 9.8 GB dari 10 GB):
   - ✅ Auto-switch ke secondary API
   - 📢 Log: "Storage threshold reached! Switching to secondary API..."
4. **Upload berikutnya** pakai secondary API

---

## Setup Secondary API

### Edit file `.env`:

```env
# Primary API (FiveManage utama)
FIVEMANAGE_TOKEN=token_primary_anda
FIVEMANAGE_ENDPOINT=https://api.fivemanage.com/api/v2/image

# Storage monitoring
STORAGE_LIMIT_GB=10
STORAGE_THRESHOLD_GB=9.8

# Secondary API (backup FiveManage account atau API lain)
SECONDARY_TOKEN=token_secondary_anda
SECONDARY_ENDPOINT=https://api.fivemanage.com/api/v2/image
```

**Note:** Secondary bisa pakai:
- FiveManage account kedua
- ImgBB API
- Imgur API
- Atau image hosting lain (perlu adjust code untuk format response berbeda)

---

## Test Auto-Switch

### Cara 1: Set threshold rendah untuk testing

```env
# Set threshold sangat rendah untuk test
STORAGE_THRESHOLD_GB=0.01
```

Upload 1-2 foto, bot akan langsung switch ke secondary.

### Cara 2: Simulasi storage penuh

Edit `index.js`:
```javascript
// Di bagian storage tracking, set initial value tinggi
let currentStorageGB = 9.7; // Start dari 9.7 GB
```

Upload foto, akan langsung switch ke secondary.

---

## Monitor Storage

Bot akan log setiap upload:
```
📊 Total storage used: 9.15 GB / 10.00 GB
```

Saat threshold tercapai:
```
⚠️ Storage threshold reached! Switching to secondary API...
🔄 Using secondary API
```

Upload selanjutnya:
```
Attempt 1/3 for image.jpg [Secondary API]
✅ Uploaded to Secondary API: https://...
```

---

## Reset Storage Counter

Jika ingin reset counter (misal setelah hapus files di FiveManage):

### Option 1: Manual edit code
```javascript
// Di index.js, set kembali
let currentStorageGB = 0;
let useSecondary = false;
```

### Option 2: Restart bot
```bash
# Bot akan reset counter setiap restart
pm2 restart discord-bot
```

### Option 3: Command custom (future feature)
Bisa buat Discord command `/reset-storage` untuk admin.

---

## Tips

1. **Backup Secondary API:** Pastikan secondary token valid sebelum primary penuh
2. **Monitor Logs:** Check logs berkala untuk tau kapan switch
3. **Update Threshold:** Sesuaikan `STORAGE_THRESHOLD_GB` dengan kebutuhan
4. **Multiple Accounts:** Bisa punya beberapa FiveManage account untuk rotation

---

## Advanced: Implement API Rotation

Jika ingin lebih dari 2 API (rotation):

```env
# Tambahkan lebih banyak API
API_TOKENS=token1,token2,token3
API_ENDPOINTS=endpoint1,endpoint2,endpoint3
STORAGE_PER_API_GB=10
```

Perlu modifikasi code untuk support array of APIs.

---

## Troubleshooting

### Secondary tidak switch otomatis
- Cek `SECONDARY_TOKEN` sudah diisi
- Cek logs untuk nilai `currentStorageGB`
- Pastikan threshold tercapai

### Storage counter tidak akurat
- Counter di-reset setiap restart bot
- Tidak real-time check ke FiveManage (karena no API endpoint)
- Solusi: Track manual di database/file

### Upload gagal ke secondary
- Cek secondary token valid
- Test manual: `curl` ke secondary endpoint
- Cek logs untuk error detail

---

## Future Improvements

1. **Real Storage Check:** Query FiveManage API untuk real storage usage
2. **Database Tracking:** Save storage counter ke database
3. **Smart Rotation:** Balance load across multiple APIs
4. **Discord Command:** `/storage` untuk check current usage
5. **Auto-cleanup:** Hapus old files saat hampir penuh
