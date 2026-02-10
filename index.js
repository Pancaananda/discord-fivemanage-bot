require('dotenv').config();
const { Client, GatewayIntentBits, AttachmentBuilder } = require('discord.js');
const axios = require('axios');
const FormData = require('form-data');
const sharp = require('sharp');

// Inisialisasi Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ]
});

// Konfigurasi
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const FIVEMANAGE_TOKEN = process.env.FIVEMANAGE_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID || null;
const FIVEMANAGE_ENDPOINT = process.env.FIVEMANAGE_ENDPOINT || 'https://api.fivemanage.com/api/v2/image';

// Whitelist Role configuration
const ALLOWED_ROLES = process.env.ALLOWED_ROLES 
    ? process.env.ALLOWED_ROLES.split(',').map(id => id.trim())
    : null;

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

// Fungsi upload ke FiveManage dengan retry dan auto-fallback
async function uploadToFiveManage(imageUrl, fileName, retries = 3) {
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
            
            // Download gambar dari Discord dengan timeout
            const response = await axios.get(imageUrl, {
                responseType: 'arraybuffer',
                timeout: 30000 // 30 detik timeout
            });

            // Compress gambar sebelum upload
            console.log(` Compressing ${fileName}...`);
            const compressedImage = await compressImage(response.data, fileName);

            // Check ukuran file setelah kompresi (FiveManage limit biasanya 10MB)
            const fileSizeMB = compressedImage.length / (1024 * 1024);
            
            if (fileSizeMB > 10) {
                throw new Error('File terlalu besar (max 10MB) even after compression');
            }

            // Buat form data dengan gambar yang sudah dikompres
            const formData = new FormData();
            formData.append('file', compressedImage, fileName);
            
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
    console.log(' Bot siap!');
    console.log(`Logged in as ${client.user.tag}`);
    if (CHANNEL_ID) {
        console.log(` Monitoring channel ID: ${CHANNEL_ID}`);
    } else {
        console.log('Monitoring semua channel');
    }
    console.log(` Storage threshold: ${STORAGE_THRESHOLD_GB} GB / ${STORAGE_LIMIT_GB} GB`);
    if (SECONDARY_TOKEN) {
        console.log(`Secondary API configured (will auto-switch at ${STORAGE_THRESHOLD_GB} GB)`);
    } else {
        console.log(` No secondary API configured`);
    }
    if (ALLOWED_ROLES && ALLOWED_ROLES.length > 0) {
        console.log(` Role whitelist enabled (${ALLOWED_ROLES.length} roles allowed)`);
    } else {
        console.log(` No role restriction (all users can upload)`);
    }
});

// Event: Message create
client.on('messageCreate', async (message) => {
    // Ignore bot messages
    if (message.author.bot) return;

    // Check channel ID jika diset
    if (CHANNEL_ID && message.channel.id !== CHANNEL_ID) return;

    // Check apakah ada attachment gambar
    const imageAttachments = message.attachments.filter(attachment =>
        attachment.contentType && attachment.contentType.startsWith('image/')
    );

    if (imageAttachments.size === 0) return;

    // Check role whitelist jika diset
    if (ALLOWED_ROLES && ALLOWED_ROLES.length > 0) {
        const member = message.member;
        
        // Check apakah user punya salah satu role yang diizinkan
        const hasAllowedRole = member.roles.cache.some(role => 
            ALLOWED_ROLES.includes(role.id)
        );
        
        if (!hasAllowedRole) {
            await message.react('❌');
            await message.reply({
                content: '❌ Anda tidak memiliki permission untuk upload gambar.',
                allowedMentions: { repliedUser: false }
            });
            return;
        }
    }

    // React untuk menandakan sedang memproses
    await message.react('⏳');

    try {
        const uploadedUrls = [];

        // Upload setiap gambar
        for (const [id, attachment] of imageAttachments) {
            console.log(`📤 Uploading: ${attachment.name}`);
            const uploadedUrl = await uploadToFiveManage(attachment.url, attachment.name);
            uploadedUrls.push(uploadedUrl);
            console.log(`✅ Uploaded: ${uploadedUrl}`);
        }

        // Remove processing reaction
        await message.reactions.removeAll();

        // Hapus pesan original dari user
        await message.delete();

        // Send pesan baru dengan format sederhana
        const uploadMessages = uploadedUrls.map(url => 
            `**Gambar berhasil diupload** (${message.author.username})\nURL: ${url}`
        ).join('\n\n');
        
        await message.channel.send(uploadMessages);

    } catch (error) {
        console.error('Error:', error);
        await message.reactions.removeAll();
        await message.react('❌');
        await message.reply({
            content: '❌ Gagal upload gambar ke FiveManage. Cek console untuk detail error.',
            allowedMentions: { repliedUser: false }
        });
    }
});

// Login bot
client.login(DISCORD_TOKEN);
