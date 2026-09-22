const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');
const express = require('express');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  rest: {
    timeout: 15000
  }
});

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('Bot de Notificação Online!'));
app.listen(PORT, () => console.log(`[Express] Servidor ativo na porta ${PORT}`));

client.once('ready', () => {
  console.log(`[Discord] ✅ Bot online como: ${client.user.tag}`);
});

const ID_CANAL_JOGOS = '1463018033651122176';

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  console.log(`[Mensagem Recebida] de ${message.author.tag}: "${message.content}"`);

  const texto = message.content.trim();

  if (texto.toLowerCase().startsWith('%notificarjogo')) {
    console.log('[Comando Detectado] Executando %notificarjogo...');

    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator) && 
        !message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
      console.log('[Erro] Usuário sem permissão.');
      return message.reply('❌ Precisa de ter permissão de Administrador ou Gerir Servidor.');
    }

    const conteudo = texto.slice(14).trim();
    const partes = conteudo.split(/\s+/);

    if (partes.length < 5) {
      console.log('[Erro] Argumentos insuficientes.');
      return message.reply(
        '❌ **Formato incorreto!** Use o formato:\n' +
        '`%notificarjogo [EmojiSeason] [EmojiTime1] [EmojiTime2] [NickRoblox] [Link]`\n\n' +
        '**Exemplo:**\n' +
        '`%notificarjogo 🏆 ⚽ 🇧🇷 MeuNick https://roblox.com/share?code=123`'
      );
    }

    const canalJogos = message.guild.channels.cache.get(ID_CANAL_JOGOS);
    if (!canalJogos) {
      console.log(`[Erro] Canal ${ID_CANAL_JOGOS} não encontrado no servidor.`);
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
      console.log('[Sucesso] Notificação enviada para o canal!');
      return message.reply('✅ Notificação enviada com sucesso para o canal!');
    } catch (err) {
      console.error('[Erro Discord API]', err.message);
      return message.reply(`❌ Erro ao enviar mensagem no canal: \`${err.message}\``);
    }
  }
});

async function iniciarBot() {
  const token = process.env.TOKEN ? process.env.TOKEN.trim() : null;

  if (!token) {
    console.error('[ERRO CRÍTICO] A variável TOKEN não foi encontrada no Render!');
    return;
  }

  console.log('[Discord] Tentando autenticar com o token...');
  try {
    await client.login(token);
  } catch (err) {
    console.error('[Erro no Login do Discord]:', err.message);
  }
}

iniciarBot();
