const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const http = require('http');

// Caminhos dos arquivos persistentes
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

// Funções de manipulação de arquivos com tratamento de erro
function carregarDados(filePath) {
    try {
        if (!fs.existsSync(filePath)) {
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

const perguntas = [
    "Qual seu nick?", "Qual sua idade?", "Qual seu ID?", "Quanto tempo joga por dia?", 
    "Tem microfone? (Sim/Não)", "Já participou de facção? Qual?", "Sabe usar Discord? (Sim/Não)",
    "Tempo após voz de assalto para atirar?", "Tempo a esperar após chamado?", 
    "Pode usar UZI ou TEC9 na favela?", "Pode voltar favela após morrer?", 
    "Pode matar vítima cooperando?", "Qual sua principal função?", "Joga sozinho ou em equipe?", 
    "Por que quer entrar na BDC?", "Pretende ficar ativo? (Sim/Não)"
];

client.once('ready', () => {
    console.log(`Bot logado como ${client.user.tag}!`);
});

// Proteção contra desconexão
client.on('error', error => console.error('Erro no Client:', error));
client.on('shardDisconnect', () => console.warn('Conexão perdida. Tentando reconectar...'));

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // Sistema de Recrutamento
    if (message.content === '!iniciar') {
        const user = message.author;
        await message.reply("📩 Verifique suas mensagens privadas (DM) para iniciar o recrutamento!");
        try {
            const dm = await user.createDM();
            let respostas = [];
            for (const pergunta of perguntas) {
                await dm.send(pergunta);
                const coletor = await dm.awaitMessages({ max: 1, time: 60000, errors: ['time'] });
                respostas.push(coletor.first().content);
            }
            const canalLogs = client.channels.cache.get('1512884063545983229');
            if (canalLogs) {
                const embed = new EmbedBuilder().setTitle('Formulário Concluído').setDescription(`Candidato: ${user.tag}`).setColor(0x00FF00);
                perguntas.forEach((p, i) => embed.addFields({ name: p, value: respostas[i] }));
                await canalLogs.send({ embeds: [embed] });
                await dm.send("✅ Formulário enviado com sucesso!");
            }
        } catch (e) { await user.send("❌ Erro ou tempo esgotado."); }
    }

    // Sistema de Ponto
    if (message.content === '!ponto') {
        const userId = message.author.id;
        let pontosAtivos = carregarDados(pathPontos);
        let bancoHoras = carregarDados(pathHoras);
        
        const canalPonto = client.channels.cache.get('1513050110873833613'); 
        const canalHoras = client.channels.cache.get('1513050211046527096');

        if (!pontosAtivos[userId]) {
            pontosAtivos[userId] = Date.now();
            salvarDados(pathPontos, pontosAtivos);
            await message.reply("✅ Ponto de entrada registrado!");
            if (canalPonto) await canalPonto.send(`${message.author} entrou em serviço.`);
        } else {
            const duracaoMs = Date.now() - pontosAtivos[userId];
            if (!bancoHoras[userId]) bancoHoras[userId] = 0;
            bancoHoras[userId] += duracaoMs;
            
            salvarDados(pathHoras, bancoHoras);
            delete pontosAtivos[userId];
            salvarDados(pathPontos, pontosAtivos);
            
            const h = Math.floor(duracaoMs / 3600000);
            const m = Math.floor((duracaoMs % 3600000) / 60000);
            await message.reply(`✅ Ponto de saída! Você trabalhou ${h}h e ${m}m.`);
            if (canalHoras) await canalHoras.send(`${message.author} encerrou o turno. Duração: ${h}h ${m}m.`);
        }
    }
});

// Servidor Keep-Alive
http.createServer((req, res) => {
    res.writeHead(200);
    res.end("Bot Online");
}).listen(process.env.PORT || 3000);

client.login(process.env.TOKEN);
