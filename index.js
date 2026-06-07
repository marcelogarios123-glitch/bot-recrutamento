const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.DirectMessages] 
});

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
});

// Servidor simples para o UptimeRobot "pingar" e o bot não dormir
const http = require('http');
http.createServer((req, res) => {
  res.write("Bot BDC Online!");
  res.end();
}).listen(process.env.PORT || 3000);

// A senha agora é lida pelo sistema de variáveis de ambiente do Render
client.login(process.env.TOKEN);
