require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const express = require('express');

// Dummy server for Render Web Service port binding
const app = express();
const port = process.env.PORT || 10000;
app.get('/', (req, res) => res.send('Discord Bot is running!'));
app.listen(port, () => {
    console.log(`Dummy server listening on port ${port}`);
    // Uyku modunu engellemek iin kendi kendine HTTP isteYi at (Her 5 dakikada bir)
    setInterval(() => {
        const url = process.env.RENDER_EXTERNAL_URL || `http://localhost:${port}`;
        fetch(url).then(res => res.text()).then(body => console.log("Keep-alive ping atld:", body)).catch(err => console.error(err));
    }, 5 * 60 * 1000);
});

// Initialize Discord Client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers, // Yeni üyeleri görebilmek için eklendi
    ],
});

// Initialize Gemini Client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: "Sen Discord'da bir kullanıcının arkadaşı gibi davranan, kısa, öz ve gündelik hayattaki gibi sohbet eden bir yapay zeka botusun. Uzun uzun cevaplar verme, insanların internette mesajlaştığı gibi kısa (örneğin en fazla 1-2 cümle) ve samimi yanıtlar ver. Sana 'nasılsın' denildiğinde 'iyiyim sen nasılsın' gibi doğal bir tepki ver."
});

client.once('ready', () => {
    console.log(`Bot giriş yaptı: ${client.user.tag}`);
});

// Yeni üye katıldığında çalışacak olay (GuildMemberAdd)
client.on('guildMemberAdd', async member => {
    try {
        const welcomeChannel = member.guild.channels.cache.find(ch => ch.name === '💬┃chat');
        if (!welcomeChannel) return; // Eğer '💬┃chat' kanalı yoksa hiçbir şey yapma

        // Yeni gelen kullanıcıyı etiketleyerek hoş geldin mesajı at
        await welcomeChannel.send(`Hoş geldin <@${member.user.id}>! Sunucuya katıldığın için sevindik. 🎉`);
    } catch (error) {
        console.error("Karşılama mesajı hatası:", error);
    }
});

client.on('messageCreate', async (message) => {
    // Kendi mesajlarımızı veya diğer botların mesajlarını görmezden gel
    if (message.author.bot) return;

    // Sadece #💬┃chat kanalındaki mesajlara yanıt ver
    if (message.channel.name !== '💬┃chat') return;

    // Sadece bot etiketlendiğinde veya botun kendi mesajı yanıtlandığında cevap ver
    const isMentioned = message.mentions.has(client.user.id);
    const isReplyToBot = message.reference && message.reference.messageId && (await message.channel.messages.fetch(message.reference.messageId)).author.id === client.user.id;

    if (!isMentioned && !isReplyToBot) return;

    // Botun yazıyor efekti vermesi
    await message.channel.sendTyping();

    // Etiket ve bot adını mesaj içeriğinden temizle ki AI daha saf bir prompt alsın
    const cleanContent = message.content.replace(`<@${client.user.id}>`, '').trim();

    try {
        const chat = model.startChat({
            history: [],
        });

        const result = await chat.sendMessage(cleanContent || "Merhaba");
        const response = await result.response;
        const text = response.text();

        await message.reply(text);
    } catch (error) {
        console.error("Gemini API Hatası:", error);
        await message.reply("Şu an bir hata oluştu, üzgünüm :(");
    }
});

// Hata ayıklama: Çevresel değişkenleri kontrol et
if (!process.env.DISCORD_TOKEN || process.env.DISCORD_TOKEN === "Senin_Discord_Bot_Tokenin_Buraya") {
    console.error("Lütfen .env dosyasındaki DISCORD_TOKEN değerini ayarlayın.");
    process.exit(1);
}

if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "Senin_Gemini_API_Anahtarin_Buraya") {
    console.error("Lütfen .env dosyasındaki GEMINI_API_KEY değerini ayarlayın.");
    process.exit(1);
}

client.login(process.env.DISCORD_TOKEN);
