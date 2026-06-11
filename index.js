const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Usamos path.join para garantir que o caminho esteja correto em qualquer ambiente
const pathHoras = path.join(__dirname, 'dados_horas.json');
const pathPontos = path.join(__dirname, 'pontos_ativos.json');

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.DirectMessages
    ] 
});

// Funções com tratamento de erro reforçado
function carregarDados(filePath) {
    try {
        if (!fs.existsSync(filePath)) {
            console.log(`Arquivo não encontrado, criando novo: ${filePath}`);
            fs.writeFileSync(filePath, JSON.stringify({}));
            return {};
        }
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (err) {
        console.error(`Erro ao carregar ${filePath}:`, err);
        return {};
    }
}

function salvarDados(filePath, dados) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(dados, null, 2));
    } catch (err) {
        console.error(`Erro ao salvar ${filePath}:`, err);
    }
}

client.once('ready', () => {
    console.log(`Bot logado como ${client.user.tag}!`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // Log para ver no console do Render se ele está recebendo a mensagem
    console.log(`Recebido: ${message.content} de ${message.author.username}`);

    if (message.content === '!ponto') {
        const userId = message.author.id;
        let pontosAtivos = carregarDados(pathPontos);
        let bancoHoras = carregarDados(pathHoras);
        
        // ... (resto da sua lógica de ponto igual à anterior) ...
        // (Certifique-se de que os IDs dos canais no seu código estão corretos!)
        
        if (!pontosAtivos[userId]) {
            pontosAtivos[userId] = Date.now();
            salvarDados(pathPontos, pontosAtivos);
            await message.reply("✅ Ponto de entrada registrado!");
        } else {
            const inicio = pontosAtivos[userId];
            const duracaoMs = Date.now() - inicio;
            if (!bancoHoras[userId]) bancoHoras[userId] = 0;
            bancoHoras[userId] += duracaoMs;
            salvarDados(pathHoras, bancoHoras);
            delete pontosAtivos[userId];
            salvarDados(pathPontos, pontosAtivos);
            await message.reply("✅ Ponto de saída registrado!");
        }
    }
});

const http = require('http');
http.createServer((req, res) => res.end("Bot Online")).listen(process.env.PORT || 3000);

client.login(process.env.TOKEN);
