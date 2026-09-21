const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');
const express = require('express');

// 1. Instância do Client do Discord
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// 2. Servidor Express para manter o bot online no Render
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('Bot de Notificação Online!'));

app.listen(PORT, () => {
  console.log(`Servidor Web ativo na porta ${PORT}`);
  
  const token = process.env.TOKEN ? process.env.TOKEN.trim() : null;
  if (!token) {
    console.error('❌ ERRO: Variável TOKEN não encontrada nas Environment Variables do Render!');
    return;
  }

  console.log('Tentando conectar ao Discord...');
  client.login(token).catch(err => {
    console.error('❌ ERRO AO CONECTAR AO DISCORD:', err.message);
  });
});

client.once('ready', () => {
  console.log(`✅ BOT ONLINE E CONECTADO COMO: ${client.user.tag}`);
});

// ID do Canal onde a notificação será enviada
const ID_CANAL_JOGOS = '1463018033651122176';

// 3. Comando %notificarjogo
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const texto = message.content.trim();

  if (texto.toLowerCase().startsWith('%notificarjogo')) {
    // Permissão: Apenas Administradores ou quem tem permissão de Gerenciar Servidor
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator) && 
        !message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
      return message.reply('❌ Você precisa ter permissão de Administrador ou Gerenciar Servidor.');
    }

    const conteudo = texto.slice(14).trim();
    const partes = conteudo.split(/\s+/);

    if (partes.length < 5) {
      return message.reply(
        '❌ **Formato incorreto!** Use o formato:\n' +
        '`%notificarjogo [EmojiSeason] [EmojiTime1] [EmojiTime2] [NickRoblox] [Link]`\n\n' +
        '**Exemplo:**\n' +
        '`%notificarjogo 🏆 ⚽ 🇧🇷 MeuNick https://roblox.com/share?code=123`'
      );
    }

    const canalJogos = message.guild.channels.cache.get(ID_CANAL_JOGOS);
    if (!canalJogos) {
      return message.reply(`❌ Canal de jogos (\`${ID_CANAL_JOGOS}\`) não foi encontrado neste servidor!`);
    }

    const mensagemJogo = `# ${partes[0]} | ${partes[1]} VS${partes[2]}\n\n` +
      `**Server Aberto!**\n` +
      `Nick: \`${partes[3]}\`\n` +
      `Link: ${partes[4]}\n\n` +
      `||@here||`;

    try {
      await canalJogos.send({ 
        content: mensagemJogo,
        allowedMentions: { parse: ['everyone'] }
      });
      return message.reply('✅ Notificação enviada com sucesso para o canal!');
    } catch (err) {
      return message.reply(`❌ Erro ao enviar mensagem no canal: \`${err.message}\``);
    }
  }
});
