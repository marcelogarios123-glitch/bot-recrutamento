const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');

// Caminhos dos arquivos
const pathHoras = './dados_horas.json';
const pathPontos = './pontos_ativos.json';

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.DirectMessages
    ] 
});

// Funções de manipulação de arquivos
function carregarDados(path) {
    if (!fs.existsSync(path)) return {};
    try { return JSON.parse(fs.readFileSync(path, 'utf8')); } 
    catch (err) { return {}; }
}

function salvarDados(path, dados) {
    fs.writeFileSync(path, JSON.stringify(dados, null, 2));
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

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // Sistema de Recrutamento
    if (message.content === '!iniciar') {
        const user = message.author;
        await message.reply("📩 Verifique suas mensagens privadas (DM) para iniciar o recrutamento!");
        
        let respostas = [];
        try {
            const dm = await user.createDM();
            for (const pergunta of perguntas) {
                await dm.send(pergunta);
                const coletor = await dm.awaitMessages({ max: 1, time: 60000, errors: ['time'] });
                respostas.push(coletor.first().content);
            }
            
            const canalLogs = client.channels.cache.get('1512884063545983229');
            if (canalLogs) {
                const embed = new EmbedBuilder()
                    .setTitle('Formulário Concluído')
                    .setDescription(`Candidato: ${user.tag} (${user.id})`)
                    .setColor(0x00FF00);
                perguntas.forEach((p, i) => embed.addFields({ name: p, value: respostas[i] }));
                await canalLogs.send({ embeds: [embed] });
                await dm.send("✅ Formulário enviado com sucesso!");
            }
        } catch (e) {
            await user.send("❌ O tempo acabou ou houve um erro. Tente novamente com !iniciar");
        }
    }

    // Sistema de Ponto (Persistente)
    if (message.content === '!ponto') {
        const userId = message.author.id;
        let pontosAtivos = carregarDados(pathPontos);
        let bancoHoras = carregarDados(pathHoras);
        
        const canalPonto = client.channels.cache.get('1513050110873833613'); 
        const canalHoras = client.channels.cache.get('1513050211046527096');
        
        if (!canalPonto || !canalHoras) return message.reply("Erro: Canais não configurados.");

        if (!pontosAtivos[userId]) {
            // ENTRADA
            pontosAtivos[userId] = Date.now();
            salvarDados(pathPontos, pontosAtivos);
            
            const agora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
            const embed = new EmbedBuilder()
                .setTitle('🕒 Registro de Entrada')
                .setColor(0x00FF00)
                .setDescription(`${message.author} iniciou o serviço.`)
                .addFields({ name: 'Horário', value: agora });
            
            await canalPonto.send({ embeds: [embed] });
            await message.reply("✅ Ponto de entrada registrado!");
        } else {
            // SAÍDA
            const inicio = pontosAtivos[userId];
            const duracaoMs = Date.now() - inicio;
            
            if (!bancoHoras[userId]) bancoHoras[userId] = 0;
            bancoHoras[userId] += duracaoMs;
            salvarDados(pathHoras, bancoHoras);

            // Remover do registro de ativos
            delete pontosAtivos[userId];
            salvarDados(pathPontos, pontosAtivos);

            const totalMs = bancoHoras[userId];
            const totalHoras = Math.floor(totalMs / 3600000);
            const totalMinutos = Math.floor((totalMs % 3600000) / 60000);
            const horasSessao = Math.floor(duracaoMs / 3600000);
            const minSessao = Math.floor((duracaoMs % 3600000) / 60000);
            
            const embedHoras = new EmbedBuilder()
                .setTitle('📊 Relatório de Horas')
                .setColor(0x0099FF)
                .setDescription(`${message.author} completou seu turno.`)
                .addFields(
                    { name: 'Duração da sessão', value: `${horasSessao}h ${minSessao}m`, inline: true },
                    { name: 'Total Acumulado', value: `${totalHoras}h ${totalMinutos}m`, inline: true }
                );
            
            await canalHoras.send({ embeds: [embedHoras] });
            await message.reply("✅ Ponto de saída registrado e horas somadas!");
        }
    }
});

// Servidor para manter o bot ativo (ex: no Render)
const http = require('http');
http.createServer((req, res) => res.end("Bot BDC Online!")).listen(process.env.PORT || 3000);

client.login(process.env.TOKEN);
