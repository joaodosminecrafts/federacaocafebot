const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');
const express = require('express');

// 1. Instância do Bot
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// 2. Servidor Web Express (Render 24/7)
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('Bot de Notificação Online!'));
app.listen(PORT, () => {
  console.log(`[Express] Servidor Web ativo na porta ${PORT}`);
});

// 3. Eventos de Conexão do Discord
client.once('ready', () => {
  console.log(`[Discord] ✅ BOT ONLINE E CONECTADO COMO: ${client.user.tag}`);
});

client.on('error', (err) => {
  console.error('[Discord] ❌ Erro de Conexão:', err.message);
});

// ID do Canal onde a notificação será enviada
const ID_CANAL_JOGOS = '1463018033651122176';

// 4. Comando %notificarjogo
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const texto = message.content.trim();

  if (texto.toLowerCase().startsWith('%notificarjogo')) {
    // Permissão: Administrador ou Gestor
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator) && 
        !message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
      return message.reply('❌ Precisa de ter permissão de Administrador ou Gerir Servidor.');
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

// 5. Autenticação
const token = process.env.TOKEN ? process.env.TOKEN.trim() : null;
if (!token) {
  console.error('[Discord] ❌ ERRO: Variável TOKEN não configurada no Render!');
} else {
  console.log('[Discord] Autenticando com o token...');
  client.login(token).catch(err => {
    console.error('[Discord] ❌ Falha no login:', err.message);
  });
}
