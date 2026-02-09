# 🚀 Deploy ke Railway.app - Panduan Lengkap

## Persiapan

### 1. Install Git (jika belum ada)
Download dari: https://git-scm.com/download/win

### 2. Buat akun Railway
1. Buka https://railway.app/
2. Klik "Login" → Pilih "Login with GitHub"
3. Authorize Railway ke GitHub account Anda

---

## Langkah Deploy

### Step 1: Init Git Repository

```bash
# Di folder project ini
git init
git add .
git commit -m "Initial commit"
```

### Step 2: Push ke GitHub

**Option A: Buat repo baru di GitHub website**
1. Buka https://github.com/new
2. Nama repo: `discord-fivemanage-bot`
3. Set **Private** (jangan public karena ada token)
4. Jangan centang "Initialize with README"
5. Klik "Create repository"
6. Copy command yang muncul, lalu jalankan:

```bash
git remote add origin https://github.com/USERNAME/discord-fivemanage-bot.git
git branch -M main
git push -u origin main
```

**Option B: Pakai GitHub CLI (jika sudah install)**
```bash
gh repo create discord-fivemanage-bot --private --source=. --push
```

### Step 3: Deploy di Railway

1. **Buka Railway Dashboard**
   - Pergi ke https://railway.app/dashboard

2. **Create New Project**
   - Klik "New Project"
   - Pilih "Deploy from GitHub repo"
   - Pilih repository `discord-fivemanage-bot`
   - Klik "Deploy Now"

3. **Setup Environment Variables**
   - Klik project yang baru dibuat
   - Klik tab "Variables"
   - Add variable satu per satu:
   
   ```
   DISCORD_TOKEN=your_discord_token_here
   FIVEMANAGE_TOKEN=your_fivemanage_token_here
   FIVEMANAGE_ENDPOINT=https://api.fivemanage.com/api/v2/image
   CHANNEL_ID=your_channel_id_here
   ```

4. **Deploy!**
   - Railway akan otomatis build & deploy
   - Tunggu hingga status "Deployed"
   - Bot akan langsung aktif 24/7!

---

## Cara Update Bot

Setiap kali ada perubahan code:

```bash
git add .
git commit -m "Update bot"
git push
```

Railway akan **otomatis re-deploy**! 🎉

---

## Monitoring

### Lihat Logs
1. Buka Railway dashboard
2. Klik project
3. Tab "Deployments" → Klik deployment terbaru
4. Lihat logs real-time

### Restart Bot
1. Klik project di Railway
2. Tab "Settings"
3. Scroll ke bawah → "Restart"

---

## Troubleshooting

### Bot tidak online?
- Cek logs di Railway dashboard
- Pastikan semua environment variables sudah benar
- Pastikan Discord token valid

### Deploy gagal?
- Cek logs untuk error message
- Pastikan `package.json` dan `node_modules` tidak corrupt
- Coba redeploy: Settings → Redeploy

### Kehabisan credit?
- Railway free tier: $5/bulan
- Bot Discord biasanya pakai $1-2/bulan
- Bisa upgrade ke Hobby plan ($5/bulan unlimited)

---

## Command Cepat

```bash
# Lihat status git
git status

# Push perubahan
git add .
git commit -m "Your message"
git push

# Lihat history
git log --oneline
```

---

## Tips

1. ✅ Selalu test di local dulu sebelum push
2. ✅ Commit message yang jelas
3. ✅ Jangan commit file `.env` (sudah di .gitignore)
4. ✅ Gunakan environment variables di Railway untuk token
5. ✅ Monitor logs secara berkala

---

## Support

- Railway Docs: https://docs.railway.app/
- Discord: https://discord.gg/railway
- GitHub Issues: Buat issue di repo Anda
