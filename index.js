const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs-extra');
const chalk = require('chalk');
const path = require('path');
const config = require('./config');

const app = express();

// --- MODIFIKASI UNTUK VERCEL (WEBHOOK MODE) ---
const bot = new TelegramBot(config.BOT_TOKEN); 

app.use(bodyParser.json({ limit: '50mb' }));

// Handler Webhook agar bot "bangun" saat ada chat
app.post(`/bot${config.BOT_TOKEN}`, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
});

// --- SERVE STATIC FILES FROM PUBLIC FOLDER ---
const publicDir = path.join(__dirname, 'public');
fs.ensureDirSync(publicDir);
console.log(chalk.green(`[✓] Public folder siap: ${publicDir}`));

app.use(express.static(publicDir));

// --- REDIRECT ROOT KE PUBLIC FOLDER ---
app.get('/', (req, res) => {
    const indexHtml = path.join(publicDir, 'index.html');
    if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
    } else {
        res.json({
            status: 'online',
            message: 'Ikhsanprotect API Server',
            note: 'Upload file HTML Anda ke folder public/index.html untuk melihat halaman website',
            endpoints: {
                report: `/api/report/key=${config.SECRET_KEY}?YOUR_TOKEN?YOUR_OWNER_ID`,
                database: `/api/:name?key=${config.SECRET_KEY}`,
                health: '/health'
            },
            public_folder: '/public - Tempatkan file HTML/CSS/JS Anda disini'
        });
    }
});

// --- DATABASE ENGINE (FIXED LOGIC) ---
const DB_DIR = './database';
fs.ensureDirSync(DB_DIR);
const roles = ['owner', 'staff', 'asis', 'modz', 'pt', 'seller', 'reseller', 'support', 'token', 'buyer', 'bltoken', 'blown'];

roles.forEach(role => {
    const file = path.join(DB_DIR, `${role}.json`);
    if (!fs.existsSync(file)) {
        if (role === 'token' || role === 'bltoken') {
            fs.writeJsonSync(file, { tokens: [] });
        } else if (role === 'support' || role === 'buyer' || role === 'blown') {
            fs.writeJsonSync(file, []);
        } else {
            fs.writeJsonSync(file, []);
        }
    }
});

const getDb = (name) => {
    try {
        const data = fs.readJsonSync(path.join(DB_DIR, `${name}.json`));
        if ((name === 'token' || name === 'bltoken') && !data.tokens) {
            return { tokens: [] };
        }
        return data;
    } catch (error) {
        console.error(`Error reading ${name}.json:`, error);
        if (name === 'token' || name === 'bltoken') return { tokens: [] };
        return [];
    }
};

const saveDb = (name, data) => {
    try {
        fs.writeJsonSync(path.join(DB_DIR, `${name}.json`), data, { spaces: 2 });
    } catch (error) {
        console.error(`Error saving ${name}.json:`, error);
    }
};

// --- MIDDLEWARE & SECURITY ---
const getRole = (id) => {
    if (id == config.OWNER_ID) return 'owner';
    for (let r of roles.filter(x => x !== 'token' && x !== 'bltoken' && x !== 'support' && x !== 'buyer' && x !== 'blown')) {
        const dbData = getDb(r);
        if (Array.isArray(dbData) && dbData.includes(id)) return r;
    }
    return 'user';
};

// --- UI COMPONENTS ---
const UI = {
    header: "━━━━━━━( 𝗜𝗸𝗵𝘀𝗮𝗻𝗽𝗿𝗼𝘁𝗲𝗰𝘁 )━━━━═⬡\n",
    footer: "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━═⬡"
};

const getThanksSection = () => {
    const supports = getDb('support');
    let thanks = `━━━━━━━( 𝗧𝗵𝗮𝗻𝗸𝘀 𝗧𝗼 )━━━━═⬡\n`;
    thanks += `║⚊▣ @Ikhsanproject ( Developer )\n`;
    thanks += `║⚊▣ @dizzajawoy ( Developer )\n`;
    if (Array.isArray(supports) && supports.length > 0) {
        supports.forEach(s => { 
            if (s && s.text && s.desc) {
                thanks += `║⚊▣ ${s.text} ( ${s.desc} )\n`; 
            }
        });
    }
    thanks += `━━━━━━━━━━━━━━━━━━━━━━━━━━━═⬡`;
    return thanks;
};

const getMenuByRole = (role) => {
    let menu = `║  ALL ROLE  \n║ • /start - Restart Bot\n║ • /cekrole <id> - Cek Rank User\n`;
    if (['reseller', 'seller', 'pt', 'modz', 'asis', 'staff', 'owner'].includes(role)) {
        menu += `║\n║  RESELLER+  \n║ • /addtoken <fulltoken>\n║ • /deltoken <token>\n║ • /listtoken\n`;
    }
    if (['seller', 'pt', 'modz', 'asis', 'staff', 'owner'].includes(role)) {
        menu += `║\n║  SELLER+  \n║ • /addreseller <id>\n║ • /delreseller <id>\n║ • /listreseller\n`;
    }
    if (['pt', 'modz', 'asis', 'staff', 'owner'].includes(role)) {
        menu += `║\n║  PT+  \n║ • /addseller <id>\n║ • /delseller <id>\n║ • /listseller\n`;
    }
    if (['modz', 'asis', 'staff', 'owner'].includes(role)) {
        menu += `║\n║  MODZ+  \n║ • /addpt <id>\n║ • /delpt <id>\n║ • /listpt\n`;
    }
    if (['asis', 'staff', 'owner'].includes(role)) {
        menu += `║\n║  ASIS+  \n║ • /addmodz <id>\n║ • /delmodz <id>\n║ • /listmodz\n`;
    }
    if (['staff', 'owner'].includes(role)) {
        menu += `║\n║  STAFF+  \n║ • /addasis <id>\n║ • /delasis <id>\n║ • /listasis\n`;
    }
    if (role === 'owner') {
        menu += `║\n║  OWNER ONLY  \n`;
        menu += `║ • /addstaff <id>\n║ • /delstaff <id>\n║ • /liststaff\n`;
        menu += `║ • /addbltoken <fulltoken> - Blacklist Token\n`;
        menu += `║ • /delbltoken <token>\n║ • /listbltoken\n`;
        menu += `║ • /addblown <owner_id> - Blacklist Owner\n`;
        menu += `║ • /delblown <owner_id>\n║ • /listblown\n`;
        menu += `║ • /listbuyer - Data Buyer\n`;
        menu += `║ • /listakses - Log Monitor\n`;
        menu += `║ • /listlink - Link Yang Ada\n`;
        menu += `║ • /addsupport <text>,<desc>\n`;
        menu += `║ • /listsupport\n`;
        menu += `║ • /delsupport <index>\n`;
    }
    return menu;
};

// --- TELEGRAM COMMANDS ---
bot.onText(/\/start/, async (msg) => {
    const role = getRole(msg.from.id);
    const chatId = msg.chat.id;
    const name = msg.from.first_name;

    try {
        await bot.sendPhoto(chatId, config.IMG_MENU);
        const text = `${UI.header}║ 👤 User: ${name}\n║ 🎖️ Role: ${role.toUpperCase()}\n║ 🛠️ Status: ONLINE\n║\n${getMenuByRole(role)}${UI.footer}\n\n${getThanksSection()}`;
        await bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
        await bot.sendAudio(chatId, config.AUDIO_MENU);
    } catch (e) {
        console.error("Error Start Menu:", e.message);
    }
});

bot.on('message', async (msg) => {
    const text = msg.text || "";
    const chatId = msg.chat.id;
    if (!text.startsWith('/')) return;
    const args = text.split(' ');
    const cmd = args[0].toLowerCase();
    const role = getRole(msg.from.id);

    if (cmd === '/addtoken' && ['reseller', 'seller', 'pt', 'modz', 'asis', 'staff', 'owner'].includes(role)) {
        const fullToken = args[1];
        if (!fullToken) return bot.sendMessage(chatId, "❌ Format: /addtoken <token>");
        let dbToken = getDb('token');
        if (dbToken.tokens.includes(fullToken)) return bot.sendMessage(chatId, "⚠️ Token sudah ada!");
        dbToken.tokens.push(fullToken);
        saveDb('token', dbToken);
        bot.sendMessage(chatId, `✅ Token \`${fullToken.split(':')[0]}\` berhasil ditambahkan.`);
    }

    if (cmd === '/deltoken' && ['reseller', 'seller', 'pt', 'modz', 'asis', 'staff', 'owner'].includes(role)) {
        const fullToken = args[1];
        if (!fullToken) return bot.sendMessage(chatId, "❌ Format: /deltoken <token>");
        let dbToken = getDb('token');
        const index = dbToken.tokens.indexOf(fullToken);
        if (index === -1) return bot.sendMessage(chatId, "⚠️ Token tidak ditemukan!");
        dbToken.tokens.splice(index, 1);
        saveDb('token', dbToken);
        bot.sendMessage(chatId, `✅ Token \`${fullToken.split(':')[0]}\` berhasil dihapus.`);
    }

    if (cmd === '/listtoken' && ['reseller', 'seller', 'pt', 'modz', 'asis', 'staff', 'owner'].includes(role)) {
        const dbToken = getDb('token');
        let out = `${UI.header}║ REGISTERED BOTS\n`;
        if (!dbToken.tokens || dbToken.tokens.length === 0) out += "║ ( Kosong )\n";
        else {
            dbToken.tokens.forEach((t, i) => { 
                const tokenId = t.split(':')[0] || t;
                out += `║ ${i+1}. ID: \`${tokenId}\`\n`; 
            });
        }
        bot.sendMessage(chatId, out + UI.footer, { parse_mode: 'Markdown' });
    }

    if (cmd === '/addbltoken' && role === 'owner') {
        const fullToken = args[1];
        if (!fullToken) return bot.sendMessage(chatId, "❌ Format: /addbltoken <token>");
        let dbBlToken = getDb('bltoken');
        if (dbBlToken.tokens.includes(fullToken)) return bot.sendMessage(chatId, "⚠️ Token sudah ada di blacklist!");
        dbBlToken.tokens.push(fullToken);
        saveDb('bltoken', dbBlToken);
        bot.sendMessage(chatId, `✅ Token \`${fullToken.split(':')[0]}\` berhasil ditambahkan ke blacklist.`);
    }

    if (cmd === '/delbltoken' && role === 'owner') {
        const fullToken = args[1];
        if (!fullToken) return bot.sendMessage(chatId, "❌ Format: /delbltoken <token>");
        let dbBlToken = getDb('bltoken');
        const index = dbBlToken.tokens.indexOf(fullToken);
        if (index === -1) return bot.sendMessage(chatId, "⚠️ Token tidak ditemukan di blacklist!");
        dbBlToken.tokens.splice(index, 1);
        saveDb('bltoken', dbBlToken);
        bot.sendMessage(chatId, `✅ Token \`${fullToken.split(':')[0]}\` berhasil dihapus dari blacklist.`);
    }

    if (cmd === '/listbltoken' && role === 'owner') {
        const dbBlToken = getDb('bltoken');
        let out = `${UI.header}║ BLACKLISTED TOKENS\n`;
        if (!dbBlToken.tokens || dbBlToken.tokens.length === 0) out += "║ ( Kosong )\n";
        else {
            dbBlToken.tokens.forEach((t, i) => { 
                const tokenId = t.split(':')[0] || t;
                out += `║ ${i+1}. ID: \`${tokenId}\`\n`; 
            });
        }
        bot.sendMessage(chatId, out + UI.footer, { parse_mode: 'Markdown' });
    }

    if (cmd === '/addblown' && role === 'owner') {
        const ownerId = args[1];
        if (!ownerId || !/^\d+$/.test(ownerId)) return bot.sendMessage(chatId, "❌ Format: /addblown <owner_id>");
        let dbBlOwn = getDb('blown');
        if (dbBlOwn.includes(parseInt(ownerId))) return bot.sendMessage(chatId, "⚠️ Owner ID sudah ada di blacklist!");
        dbBlOwn.push(parseInt(ownerId));
        saveDb('blown', dbBlOwn);
        bot.sendMessage(chatId, `✅ Owner ID \`${ownerId}\` berhasil ditambahkan ke blacklist.`);
    }

    if (cmd === '/delblown' && role === 'owner') {
        const ownerId = args[1];
        if (!ownerId || !/^\d+$/.test(ownerId)) return bot.sendMessage(chatId, "❌ Format: /delblown <owner_id>");
        let dbBlOwn = getDb('blown');
        const index = dbBlOwn.indexOf(parseInt(ownerId));
        if (index === -1) return bot.sendMessage(chatId, "⚠️ Owner ID tidak ditemukan di blacklist!");
        dbBlOwn.splice(index, 1);
        saveDb('blown', dbBlOwn);
        bot.sendMessage(chatId, `✅ Owner ID \`${ownerId}\` berhasil dihapus dari blacklist.`);
    }

    if (cmd === '/listblown' && role === 'owner') {
        const dbBlOwn = getDb('blown');
        let out = `${UI.header}║ BLACKLISTED OWNERS\n`;
        if (!Array.isArray(dbBlOwn) || dbBlOwn.length === 0) out += "║ ( Kosong )\n";
        else {
            dbBlOwn.forEach((id, i) => { 
                out += `║ ${i+1}. ID: \`${id}\`\n`; 
            });
        }
        bot.sendMessage(chatId, out + UI.footer, { parse_mode: 'Markdown' });
    }

    if (cmd === '/listlink' && role === 'owner') {
        let out = `${UI.header}║ 🔗 DATABASE LINKS\n`;
        roles.forEach(r => {
            const fullUrl = `${config.Link}/api/${r}?key=${config.SECRET_KEY}`;
            out += `║ • ${r.toUpperCase()}:\n║ \`${fullUrl}\`\n║\n`;
        });
        bot.sendMessage(chatId, out + UI.footer, { parse_mode: 'Markdown' });
    }

    if (cmd === '/listbuyer' && role === 'owner') {
        const buyers = getDb('buyer');
        let out = `${UI.header}║ 👥 DATABASE BUYER\n`;
        if (buyers.length === 0) out += "║ ( Kosong )\n";
        else {
            buyers.forEach(b => {
                const tokenId = b.token ? (b.token.split(':')[0] || b.token) : 'Unknown';
                out += `║ No: ${b.no || '?'} | ID: ${b.ID || '?'}\n║ Log: ${b.log || 0} | Bot: ${tokenId}\n║\n`;
            });
        }
        bot.sendMessage(chatId, out + UI.footer);
    }
});

// --- HEALTH CHECK ENDPOINT ---
app.get('/health', (req, res) => {
    res.json({
        status: 'online',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: '1.0.0'
    });
});

// --- API REPORT ENGINE ---
app.get('/api/report/key=:key', (req, res) => {
    const secretKey = req.params.key;
    const rawParams = req.url.split('?');

    if (secretKey !== config.SECRET_KEY) return res.status(403).json({ status: "error", message: "Invalid Key" });
    if (rawParams.length < 3) return res.status(400).json({ status: "error", message: "Invalid Parameters" });

    const token_bot = rawParams[1];
    const owner_id = rawParams[2];

    let dbToken = getDb('token');
    let dbBlToken = getDb('bltoken');
    let dbBlOwn = getDb('blown');
    
    const isTokenBlacklisted = dbBlToken.tokens.includes(token_bot);
    const isOwnerBlacklisted = dbBlOwn.includes(parseInt(owner_id));

    if (isTokenBlacklisted || isOwnerBlacklisted) {
        return res.json({ 
            status: "error", 
            access: false,
            message: "Access Denied - Blacklisted"
        });
    }

    if (!dbToken.tokens.includes(token_bot)) {
        return res.json({ 
            status: "error", 
            access: false,
            message: "Token Not Registered"
        });
    }

    let dbBuyer = getDb('buyer');
    const existingIdx = dbBuyer.findIndex(t => t.token === token_bot);
    if (existingIdx !== -1) {
        dbBuyer[existingIdx].log = (parseInt(dbBuyer[existingIdx].log) || 0) + 1;
        dbBuyer[existingIdx].ID = owner_id;
    } else {
        dbBuyer.push({
            no: dbBuyer.length + 1,
            ID: owner_id,
            token: token_bot,
            log: 1
        });
        bot.sendMessage(config.OWNER_ID, `⚠️ *NEW BUYER DETECTED*\nID: \`${owner_id}\`\nBot: \`${token_bot.split(':')[0]}\``, { parse_mode: 'Markdown' })
            .catch(e => console.error("Notify fail:", e.message));
    }
    saveDb('buyer', dbBuyer);

    res.json({ 
        status: "success", 
        access: true,
        message: "Access Granted"
    });
});

app.get('/api/:name', (req, res) => {
    if (req.query.key !== config.SECRET_KEY) return res.status(403).json({ error: "Invalid Key" });
    const name = req.params.name;
    if (!roles.includes(name)) return res.status(404).json({ error: "DB Not Found" });
    res.json(getDb(name));
});

// --- SERVER EXPORT FOR VERCEL ---
module.exports = app;

// Tetap ada listener buat lokal
if (require.main === module) {
    app.listen(config.PORT, () => {
        console.log(chalk.blue.bold(`\n[!] Ikhsanprotect Brain System Online`));
        console.log(chalk.green(`[✓] Port: ${config.PORT}`));
    });
}
