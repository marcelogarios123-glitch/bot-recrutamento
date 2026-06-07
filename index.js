const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.DirectMessages] 
});

// Armazena o status dos membros (Quem está logado no ponto)
const pontos = new Map();

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
                
                perguntas.forEach((p, i) => {
                    embed.addFields({ name: p, value: respostas[i] });
                });

                await canalLogs.send({ embeds: [embed] });
                await dm.send("✅ Formulário enviado com sucesso!");
            }
        } catch (e) {
            console.error(e);
            await user.send("❌ O tempo acabou ou houve um erro. Tente novamente com !iniciar");
        }
    }

    // Sistema de Ponto
    if (message.content === '!ponto') {
        const userId = message.author.id;
        const canalPonto = client.channels.cache.get('1513061287741886627'); // <--- COLOQUE O ID DO CANAL AQUI
        
        if (!canalPonto) return message.reply("Erro: Canal de ponto não configurado.");

        const agora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

        if (!pontos.has(userId)) {
            pontos.set(userId, new Date());
            const embed = new EmbedBuilder()
                .setTitle('🕒 Registro de Entrada')
                .setColor(0x00FF00)
                .setDescription(`${message.author} iniciou o serviço.`)
                .addFields({ name: 'Horário', value: agora });
            
            await canalPonto.send({ embeds: [embed] });
            await message.reply("✅ Ponto de entrada registrado!");
        } else {
            const inicio = pontos.get(userId);
            const fim = new Date();
            const duracaoMs = fim - inicio;
            const horas = Math.floor(duracaoMs / 3600000);
            const minutos = Math.floor((duracaoMs % 3600000) / 60000);
            
            const embed = new EmbedBuilder()
                .setTitle('🕒 Registro de Saída')
                .setColor(0xFF0000)
                .setDescription(`${message.author} finalizou o serviço.`)
                .addFields(
                    { name: 'Entrada', value: inicio.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) },
                    { name: 'Saída', value: agora },
                    { name: 'Tempo total', value: `${horas}h ${minutos}m` }
                );
            
            await canalPonto.send({ embeds: [embed] });
            pontos.delete(userId);
            await message.reply("✅ Ponto de saída registrado!");
        }
    }
});

// Servidor simples para o UptimeRobot "pingar" e o bot não dormir
const http = require('http');
http.createServer((req, res) => {
  res.write("Bot BDC Online!");
  res.end();
}).listen(process.env.PORT || 3000);

client.login(process.env.TOKEN);
