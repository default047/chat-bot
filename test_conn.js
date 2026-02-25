require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes } = require('discord.js');

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

async function testConnection() {
    try {
        console.log('Testing REST connection to Discord...');
        const currentUser = await rest.get(Routes.user('@me'));
        console.log(`Success! Logged in as: ${currentUser.username}#${currentUser.discriminator}`);
    } catch (error) {
        console.error('REST connection failed:', error);
    }
}

testConnection();
