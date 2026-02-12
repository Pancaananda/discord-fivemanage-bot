require('dotenv').config();
const { Client, GatewayIntentBits, Partials, AttachmentBuilder } = require('discord.js');
const axios = require('axios');
const FormData = require('form-data');
const sharp = require('sharp');
const http = require('http');

// Simple HTTP server untuk Railway health check
const PORT = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
    if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
            status: 'ok', 
            bot: client.user ? client.user.tag : 'starting',
            uptime: process.uptime()
        }));
    } else {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Discord Bot is running!');
    }
});

server.listen(PORT, () => {
    console.log(`🌐 HTTP Server running on port ${PORT}`);
});

// Inisialisasi Discord client dengan Partials untuk DM
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
    ],
    partials: [
        Partials.Channel, // Required untuk DM channels
        Partials.Message, // Required untuk DM messages
    ]
});

// Konfigurasi
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const FIVEMANAGE_TOKEN = process.env.FIVEMANAGE_TOKEN;

// Multi-Channel Support: Comma-separated channel IDs
const CHANNEL_IDS = process.env.CHANNEL_ID 
    ? process.env.CHANNEL_ID.split(',').map(id => id.trim())
    : null;

const FIVEMANAGE_ENDPOINT = process.env.FIVEMANAGE_ENDPOINT || 'https://api.fivemanage.com/api/v2/image';
const FIVEMANAGE_VIDEO_ENDPOINT = process.env.FIVEMANAGE_VIDEO_ENDPOINT || 'https://api.fivemanage.com/api/v2/video';

// Whitelist Role configuration: Comma-separated role IDs (works across all servers)
const ALLOWED_ROLES = process.env.ALLOWED_ROLES 
    ? process.env.ALLOWED_ROLES.split(',').map(id => id.trim())
    : null;

// DM Whitelist User IDs configuration
const DM_WHITELIST = process.env.DM_WHITELIST 
    ? process.env.DM_WHITELIST.split(',').map(id => id.trim())
    : [];

// Secondary API configuration
const SECONDARY_TOKEN = process.env.SECONDARY_TOKEN;
const SECONDARY_ENDPOINT = process.env.SECONDARY_ENDPOINT || 'https://api.fivemanage.com/api/v2/image';
const STORAGE_LIMIT_GB = parseFloat(process.env.STORAGE_LIMIT_GB || 10);
const STORAGE_THRESHOLD_GB = parseFloat(process.env.STORAGE_THRESHOLD_GB || 9.8);

// Storage tracking
let currentStorageGB = 0;
let useSecondary = false;

// Validasi environment variables
if (!DISCORD_TOKEN || !FIVEMANAGE_TOKEN) {
    console.error(' Error: DISCORD_TOKEN dan FIVEMANAGE_TOKEN harus diisi di file .env');
    process.exit(1);
}

// Fungsi check storage usage FiveManage
async function checkStorageUsage(token) {
    try {
        // FiveManage API untuk cek storage (jika ada endpoint-nya)
        // Karena belum ada official endpoint, kita track secara manual
        return currentStorageGB;
    } catch (error) {
        console.error(' Error checking storage:', error.message);
        return currentStorageGB;
    }
}

// Fungsi untuk track file size yang diupload
function trackUploadSize(fileSizeMB) {
    currentStorageGB += fileSizeMB / 1024;
    console.log(`📊 Total storage used: ${currentStorageGB.toFixed(2)} GB / ${STORAGE_LIMIT_GB} GB`);
    
    // Auto-switch ke secondary jika hampir penuh
    if (currentStorageGB >= STORAGE_THRESHOLD_GB && !useSecondary && SECONDARY_TOKEN) {
        console.log(` Storage threshold reached! Switching to secondary API...`);
        useSecondary = true;
    }
}

// Fungsi compress gambar
async function compressImage(imageBuffer, fileName) {
    const originalSize = imageBuffer.length;
    console.log(` Original size: ${(originalSize / 1024 / 1024).toFixed(2)} MB`);
    
    // Deteksi format gambar dari nama file
    const ext = fileName.toLowerCase().split('.').pop();
    
    // Skip compression untuk GIF (animated)
    if (ext === 'gif') {
        console.log(` Skipping compression for GIF (animated image)`);
        return imageBuffer;
    }
    
    let compressedBuffer;
    
    try {
        const image = sharp(imageBuffer);
        const metadata = await image.metadata();
        
        // Target: kompress minimal 30%
        // Quality setting: 70 biasanya kasih kompresi ~40-50%
        if (ext === 'png') {
            compressedBuffer = await image
                .png({ 
                    quality: 70,
                    compressionLevel: 9,
                    effort: 10
                })
                .toBuffer();
        } else if (ext === 'webp') {
            compressedBuffer = await image
                .webp({ quality: 70 })
                .toBuffer();
        } else {
            // JPG/JPEG atau format lain convert ke JPEG
            compressedBuffer = await image
                .jpeg({ 
                    quality: 70,
                    mozjpeg: true 
                })
                .toBuffer();
        }
        
        const compressedSize = compressedBuffer.length;
        const reduction = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
        
        console.log(` Compressed size: ${(compressedSize / 1024 / 1024).toFixed(2)} MB`);
        console.log(` Size reduced by: ${reduction}%`);
        
        // Jika kompresi kurang dari 30%, coba lebih agresif
        if (reduction < 30) {
            console.log(`⚠️ Kompresi kurang dari 30%, trying aggressive compression...`);
            const image2 = sharp(imageBuffer);
            
            if (ext === 'png') {
                compressedBuffer = await image2
                    .png({ quality: 50, compressionLevel: 9 })
                    .toBuffer();
            } else {
                compressedBuffer = await image2
                    .jpeg({ quality: 50, mozjpeg: true })
                    .toBuffer();
            }
            
            const newSize = compressedBuffer.length;
            const newReduction = ((originalSize - newSize) / originalSize * 100).toFixed(1);
            console.log(` Final compressed: ${(newSize / 1024 / 1024).toFixed(2)} MB (${newReduction}% reduced)`);
        }
        
        return compressedBuffer;
        
    } catch (error) {
        console.error(' Compression error, using original:', error.message);
        return imageBuffer; // Fallback ke original jika gagal
    }
}

// Fungsi untuk detect file type dari magic bytes
function detectFileType(buffer) {
    const header = buffer.slice(0, 12);
    
    // Check video signatures (MP4, WebM, AVI, etc)
    if (header[4] === 0x66 && header[5] === 0x74 && header[6] === 0x79 && header[7] === 0x70) {
        return 'video'; // MP4 signature: "ftyp"
    }
    if (header[0] === 0x1A && header[1] === 0x45 && header[2] === 0xDF && header[3] === 0xA3) {
        return 'video'; // WebM/MKV signature
    }
    if (header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46 &&
        header[8] === 0x41 && header[9] === 0x56 && header[10] === 0x49) {
        return 'video'; // AVI signature
    }
    
    // Check audio signatures
    if (header[0] === 0xFF && (header[1] & 0xE0) === 0xE0) {
        return 'audio'; // MP3 signature
    }
    if (header[0] === 0x49 && header[1] === 0x44 && header[2] === 0x33) {
        return 'audio'; // MP3 with ID3
    }
    if (header[0] === 0x4F && header[1] === 0x67 && header[2] === 0x67 && header[3] === 0x53) {
        return 'audio'; // OGG signature
    }
    
    // Check image signatures
    if (header[0] === 0xFF && header[1] === 0xD8 && header[2] === 0xFF) {
        return 'image'; // JPEG
    }
    if (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47) {
        return 'image'; // PNG
    }
    if (header[0] === 0x47 && header[1] === 0x49 && header[2] === 0x46) {
        return 'image'; // GIF
    }
    if (header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46 &&
        header[8] === 0x57 && header[9] === 0x45 && header[10] === 0x42 && header[11] === 0x50) {
        return 'image'; // WebP
    }
    
    return 'unknown';
}

// Fungsi upload ke FiveManage dengan retry dan auto-fallback
async function uploadToFiveManage(fileUrl, fileName, retries = 3) {
    // Pilih API berdasarkan storage status
    let apiToken = FIVEMANAGE_TOKEN;
    let apiEndpoint = FIVEMANAGE_ENDPOINT;
    let apiLabel = 'Primary';
    
    if (useSecondary && SECONDARY_TOKEN) {
        apiToken = SECONDARY_TOKEN;
        apiEndpoint = SECONDARY_ENDPOINT;
        apiLabel = 'Secondary';
        console.log(` Using secondary API`);
    }
    
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            console.log(`Attempt ${attempt}/${retries} for ${fileName} [${apiLabel} API]`);
            
            // Download file dari Discord dengan timeout
            const response = await axios.get(fileUrl, {
                responseType: 'arraybuffer',
                timeout: 30000 // 30 detik timeout
            });
            
            // Detect actual file type from magic bytes
            const fileType = detectFileType(response.data);
            console.log(` Detected file type: ${fileType}`);
            
            // Block video files
            if (fileType === 'video') {
                throw new Error('Video files are not allowed (detected by file signature)');
            }

            // Compress gambar sebelum upload
            console.log(` Compressing ${fileName}...`);
            const processedFile = await compressImage(response.data, fileName);

            // Check ukuran file setelah kompresi (FiveManage limit biasanya 10MB)
            const fileSizeMB = processedFile.length / (1024 * 1024);
            
            if (fileSizeMB > 10) {
                throw new Error('File terlalu besar (max 10MB) even after compression');
            }

            // Buat form data dengan file yang sudah diproses
            const formData = new FormData();
            formData.append('file', processedFile, fileName);
            
            // Tambahkan metadata untuk exempt from retention
            formData.append('metadata', JSON.stringify({
                name: fileName,
                exemptFromRetention: true
            }));

            // Upload ke FiveManage dengan timeout lebih panjang
            const uploadResponse = await axios.post(
                apiEndpoint,
                formData,
                {
                    headers: {
                        ...formData.getHeaders(),
                        'Authorization': apiToken
                    },
                    timeout: 120000, // 2 menit timeout untuk file besar
                    maxBodyLength: Infinity,
                    maxContentLength: Infinity
                }
            );

            // Response format: { data: { id, url }, status: "ok" }
            if (uploadResponse.data.status === 'ok' && uploadResponse.data.data?.url) {
                // Track storage usage
                trackUploadSize(fileSizeMB);
                
                console.log(`✅ Uploaded to ${apiLabel} API: ${uploadResponse.data.data.url}`);
                return uploadResponse.data.data.url;
            }
            
            throw new Error('Invalid response format from FiveManage');
            
            
        } catch (error) {
            const isLastAttempt = attempt === retries;
            
            // Log error details
            if (error.response) {
                console.error(`Error ${error.response.status}:`, error.response.data);
            } else if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
                console.error(`Network error (${error.code}):`, error.message);
            } else {
                console.error('Error:', error.message);
            }
            
            // Jika masih ada attempt, tunggu sebentar sebelum retry
            if (!isLastAttempt) {
                const waitTime = attempt * 2000; // 2s, 4s, 6s...
                console.log(`Waiting ${waitTime/1000}s before retry...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            } else {
                throw error; // Throw di attempt terakhir
            }
        }
    }
}

// Event: Bot ready
client.on('ready', () => {
    console.log('🚀 Bot siap!');
    console.log(`Logged in as ${client.user.tag}`);
    
    if (CHANNEL_IDS && CHANNEL_IDS.length > 0) {
        console.log(`📺 Monitoring ${CHANNEL_IDS.length} channel(s):`);
        CHANNEL_IDS.forEach(id => console.log(`   - ${id}`));
    } else {
        console.log('📺 Monitoring: ALL CHANNELS in all servers');
    }
    
    console.log(`💾 Storage threshold: ${STORAGE_THRESHOLD_GB} GB / ${STORAGE_LIMIT_GB} GB`);
    
    if (SECONDARY_TOKEN) {
        console.log(`🔄 Secondary API configured (auto-switch at threshold)`);
    } else {
        console.log(`⚠️  No secondary API configured`);
    }
    
    if (ALLOWED_ROLES && ALLOWED_ROLES.length > 0) {
        console.log(`🔐 Role whitelist: ${ALLOWED_ROLES.length} role IDs (across all servers)`);
    } else {
        console.log(`🌍 No role restrictions (all users allowed)`);
    }
});

// Event: Message create
client.on('messageCreate', async (message) => {
    // Ignore bot messages
    if (message.author.bot) return;

    // Check apakah message dari DM atau guild channel
    const isDM = !message.guild;
    
    // === HANDLE DM MESSAGES ===
    if (isDM) {
        console.log(`📨 DM from ${message.author.username} (${message.author.id})`);
        
        // Check apakah user ada dalam DM whitelist
        const isWhitelisted = DM_WHITELIST.includes(message.author.id);
        
        // Filter attachments untuk DM: image, gif, dan video (khusus DM)
        const dmAttachments = message.attachments.filter(attachment => {
            if (!attachment.contentType) return false;
            const contentType = attachment.contentType.toLowerCase();
            return contentType.startsWith('image/') || contentType.startsWith('video/');
        });
        
        // Jika tidak ada attachment (text only)
        if (dmAttachments.size === 0) {
            await message.reply('DM bisa mengupload foto dan gif. tolong jangan SPAM');
            return;
        }
        
        // Ada attachment tapi tidak whitelist
        if (!isWhitelisted) {
            await message.reply(
                '❌ **KAMU TIDAK DALAM DAFTAR WHITELIST**\n\n' +
                'Jika kamu ingin masuk whitelist, kamu harus membayar **Rp 50.000 / $3 USD**\n' +
                'Hubungi: **@inipanekuk**'
            );
            return;
        }
        
        // Whitelist user - Check file size (max 10MB)
        for (const [id, attachment] of dmAttachments) {
            const fileSizeMB = attachment.size / (1024 * 1024);
            if (fileSizeMB > 10) {
                await message.reply(`❌ File **${attachment.name}** terlalu besar (${fileSizeMB.toFixed(2)} MB). Maksimal 10MB per file.`);
                return;
            }
        }
        
        // Process upload untuk whitelist user
        await message.react('⏳');
        
        try {
            const uploadedUrls = [];
            
            for (const [id, attachment] of dmAttachments) {
                console.log(`  Uploading DM: ${attachment.name}`);
                
                // Untuk video, gunakan endpoint video
                const isVideo = attachment.contentType.toLowerCase().startsWith('video/');
                const endpoint = isVideo ? FIVEMANAGE_VIDEO_ENDPOINT : FIVEMANAGE_ENDPOINT;
                
                // Download file
                const response = await axios.get(attachment.url, {
                    responseType: 'arraybuffer',
                    timeout: 30000
                });
                
                // Upload ke FiveManage (no compression untuk DM)
                const formData = new FormData();
                formData.append('file', response.data, attachment.name);
                formData.append('metadata', JSON.stringify({
                    name: attachment.name,
                    exemptFromRetention: true
                }));
                
                const uploadResponse = await axios.post(endpoint, formData, {
                    headers: {
                        ...formData.getHeaders(),
                        'Authorization': FIVEMANAGE_TOKEN
                    },
                    timeout: 120000,
                    maxBodyLength: Infinity,
                    maxContentLength: Infinity
                });
                
                if (uploadResponse.data.status === 'ok' && uploadResponse.data.data?.url) {
                    uploadedUrls.push(uploadResponse.data.data.url);
                    console.log(`  Uploaded: ${uploadResponse.data.data.url}`);
                }
            }
            
            // Skip removeAll() di DM - Discord API tidak support
            // Reactions akan tetap ada di DM
            
            // Reply dengan hasil upload
            const uploadMessages = uploadedUrls.map(url => 
                `✅ **MEDIA BERHASIL TERUPLOAD**\nURL: ${url}`
            ).join('\n\n');
            
            await message.reply(uploadMessages);
            
        } catch (error) {
            console.error('DM Upload Error:', error);
            // Skip removeAll() di DM - Discord API tidak support
            await message.react('❌');
            await message.reply('❌ Gagal upload media ke FiveManage.');
        }
        
        return; // Stop processing untuk DM
    }
    
    // === HANDLE GUILD CHANNEL MESSAGES ===
    // Jika bukan DM, check apakah channel termasuk dalam whitelist (jika diset)
    if (CHANNEL_IDS && CHANNEL_IDS.length > 0) {
        if (!CHANNEL_IDS.includes(message.channel.id)) return;
    }

    // Filter attachments: HANYA IMAGE (termasuk GIF)
    // FiveManage hanya support /api/v2/image untuk gambar
    const allowedAttachments = message.attachments.filter(attachment => {
        if (!attachment.contentType) return false;
        
        const contentType = attachment.contentType.toLowerCase();
        
        // Allow: HANYA image (termasuk gif)
        return contentType.startsWith('image/');
    });

    // Check apakah ada video atau audio yang di-upload
    const hasVideo = message.attachments.some(attachment =>
        attachment.contentType && attachment.contentType.toLowerCase().startsWith('video/')
    );
    
    const hasAudio = message.attachments.some(attachment =>
        attachment.contentType && attachment.contentType.toLowerCase().startsWith('audio/')
    );
    
    // Tolak video
    if (hasVideo) {
        await message.delete();
        await message.channel.send(`❌ **VIDEO TIDAK DIPERBOLEHKAN!** (${message.author.username})\nHanya boleh: Foto dan GIF`);
        return;
    }
    
    // Tolak audio (FiveManage tidak punya endpoint untuk audio)
    if (hasAudio) {
        await message.delete();
        await message.channel.send(`❌ **AUDIO TIDAK DIPERBOLEHKAN!** (${message.author.username})\nFiveManage tidak support upload audio.\nHanya boleh: Foto dan GIF`);
        return;
    }

    // Jika tidak ada attachment yang diizinkan (text only atau file lain)
    if (allowedAttachments.size === 0) {
        // Hapus message dan kasih warning
        await message.delete();
        await message.channel.send(
            `**NO NO YA DISINI BUKAN TEMPAT CHAT HANYA BOLEH KASIH FOTO DAN GIF YA**\n(${message.author.username})`
        );
        return;
    }

    // Check role whitelist jika diset (skip untuk DM)
    if (!isDM && ALLOWED_ROLES && ALLOWED_ROLES.length > 0) {
        const member = message.member;
        
        // Check apakah user punya salah satu role yang diizinkan
        const hasAllowedRole = member.roles.cache.some(role => 
            ALLOWED_ROLES.includes(role.id)
        );
        
        if (!hasAllowedRole) {
            await message.react('❌');
            await message.reply({
                content: '❌ Anda tidak memiliki permission untuk upload media.',
                allowedMentions: { repliedUser: false }
            });
            return;
        }
    }

    // React untuk menandakan sedang memproses
    await message.react('⏳');

    try {
        const uploadedUrls = [];

        // Upload setiap image/gif
        for (const [id, attachment] of allowedAttachments) {
            console.log(` Uploading: ${attachment.name}`);
            const uploadedUrl = await uploadToFiveManage(attachment.url, attachment.name);
            uploadedUrls.push(uploadedUrl);
            console.log(` Uploaded: ${uploadedUrl}`);
        }

        // Remove processing reaction
        await message.reactions.removeAll();

        // Hapus pesan original dari user
        await message.delete();

        // Send pesan baru dengan format sederhana
        const uploadMessages = uploadedUrls.map(url => 
            `**Image berhasil diupload** (${message.author.username})\nURL: ${url}`
        ).join('\n\n');
        
        await message.channel.send(uploadMessages);

    } catch (error) {
        console.error('Error:', error);
        await message.reactions.removeAll();
        
        // Check if it's a disguised video file
        if (error.message && error.message.includes('Video files are not allowed')) {
            await message.delete();
            await message.channel.send(`❌ **FILE VIDEO TERDETEKSI!** (${message.author.username})\nFile yang diupload adalah video meskipun ekstensinya bukan video.\nHanya boleh: Foto asli dan GIF.`);
        } else {
            await message.react('❌');
            await message.reply({
                content: '❌ Gagal upload image ke FiveManage. Cek console untuk detail error.',
                allowedMentions: { repliedUser: false }
            });
        }
    }
});

// Login bot
client.login(DISCORD_TOKEN);
