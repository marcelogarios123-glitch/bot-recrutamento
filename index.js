const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
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

// Funções de manipulação de arquivos
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

function formatarTempo(ms) {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return `${h}h e ${m}m`;
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

// Tratamento de Interações (Cliques de Botão)
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    if (interaction.customId === 'iniciar_recrutamento') {
        const user = interaction.user;
        await interaction.reply({ content: "📩 Verifique suas mensagens privadas (DM) para iniciar o recrutamento!", ephemeral: true });

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
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // Comando para enviar o botão (Apenas administradores)
    if (message.content === '!setup' && message.member.permissions.has('Administrator')) {
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('iniciar_recrutamento')
                    .setLabel('Iniciar Recrutamento')
                    .setStyle(ButtonStyle.Primary)
            );

        await message.channel.send({
            content: 'Clique no botão abaixo para iniciar o seu recrutamento:',
            components: [row]
        });
    }

    if (message.content === '!horas') {
        const bancoHoras = carregarDados(pathHoras);
        const totalMs = bancoHoras[message.author.id] || 0;
        await message.reply(`📊 Você tem um total de ${formatarTempo(totalMs)} trabalhadas.`);
    }

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
            
            await message.reply(`✅ Ponto de saída! Turno: ${formatarTempo(duracaoMs)}. Total acumulado: ${formatarTempo(bancoHoras[userId])}.`);
            if (canalHoras) await canalHoras.send(`${message.author} encerrou o turno. Turno: ${formatarTempo(duracaoMs)}. Total: ${formatarTempo(bancoHoras[userId])}.`);
        }
    }
});

http.createServer((req, res) => {
    res.writeHead(200);
    res.end("Bot Online");
}).listen(process.env.PORT || 3000);

client.login(process.env.TOKEN);
