# 🔒 Role Whitelist - Panduan Setup

## Fitur
Bot hanya akan process upload gambar dari user yang memiliki **role tertentu**. User tanpa role yang diizinkan akan ditolak dengan pesan error.

---

## Cara Mendapatkan Role ID

### 1. Aktifkan Developer Mode di Discord
1. Discord → User Settings (⚙️)
2. Advanced → **Developer Mode** (ON)

### 2. Copy Role ID
1. Buka Server Settings → Roles
2. Klik role yang ingin diizinkan
3. Klik kanan nama role → **Copy ID**
4. Save ID tersebut (contoh: `1234567890123456789`)

---

## Setup Role Whitelist

### Edit `.env` file:

```env
# Contoh 1: Hanya 1 role
ALLOWED_ROLES=1234567890123456789

# Contoh 2: Multiple roles (separated by comma)
ALLOWED_ROLES=1234567890123456789,9876543210987654321,1111111111111111111

# Contoh 3: Disable whitelist (semua user bisa upload)
ALLOWED_ROLES=
```

**Note:** Jika `ALLOWED_ROLES` kosong atau tidak diisi, **semua user** bisa upload.

---

## Test Role Whitelist

### Scenario 1: User dengan role yang benar
1. User upload gambar
2. Bot process upload ✅
3. Gambar berhasil diupload

### Scenario 2: User tanpa role yang benar
1. User upload gambar
2. Bot react dengan ❌
3. Bot reply: "Anda tidak memiliki permission untuk upload gambar..."

---

## Contoh Setup

### Setup 1: Only Admin & Moderator
```env
# Get Role IDs from Server Settings
ALLOWED_ROLES=123456789012345678,987654321098765432
# Role 1: Admin
# Role 2: Moderator
```

### Setup 2: Premium Members Only
```env
ALLOWED_ROLES=555555555555555555
# Only users with "Premium" role
```

### Setup 3: Multiple Tiers
```env
ALLOWED_ROLES=111111111111111111,222222222222222222,333333333333333333
# Gold, Silver, Bronze members
```

---

## Log Information

Bot akan show di startup:

**Jika whitelist enabled:**
```
🔒 Role whitelist enabled (3 roles allowed)
```

**Jika whitelist disabled:**
```
🌐 No role restriction (all users can upload)
```

---

## Troubleshooting

### Bot tolak upload tapi user punya role
- **Cek Role ID** sudah benar di `.env`
- **Restart bot** setelah edit `.env`
- Pastikan user benar-benar punya role tersebut di server

### Bot allow semua user padahal sudah set ALLOWED_ROLES
- Cek format: pastikan **tidak ada spasi** kecuali setelah comma
- Format benar: `123,456,789`
- Format salah: `123 , 456 , 789`

### Cara cek role ID user sudah benar?
Klik kanan user → Copy ID, lalu compare dengan role member list.

---

## Advanced: Dynamic Role Check

Jika ingin check role name instead of ID (flexible tapi slower):

Edit `index.js`:
```javascript
// Check by role name
const hasAllowedRole = member.roles.cache.some(role => 
    ['Admin', 'Moderator', 'Premium'].includes(role.name)
);
```

**Trade-off:**
- ✅ Lebih flexible (tidak perlu role ID)
- ❌ Role bisa direname, whitelist jadi invalid
- ❌ Slightly slower

---

## Best Practices

1. ✅ **Use role IDs** (lebih reliable)
2. ✅ **Document** role names di comment `.env`
3. ✅ **Test** dengan dummy account
4. ✅ **Notify users** tentang role requirement
5. ✅ **Backup** role IDs sebelum delete/edit roles

---

## Future Improvements

1. **Discord Command:** `/check-permission` untuk test role
2. **Custom Error Message:** Per-role custom message
3. **Temporary Access:** Grant temporary upload permission
4. **Upload Quota:** Different quota per role tier
5. **Audit Log:** Track who uploaded what
