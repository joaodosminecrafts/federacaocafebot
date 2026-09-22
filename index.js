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

app.get('/', (req, res) => res.send('Bot de Notificação e Resultados Online!'));
app.listen(PORT, () => console.log(`[Express] Servidor ativo na porta ${PORT}`));

client.once('ready', () => {
  console.log(`[Discord] ✅ Bot online como: ${client.user.tag}`);
});

const ID_CANAL_JOGOS = '1463018033651122176';

// Converte apenas os números do placar sem quebrar os IDs de emojis customizados
function converterParaEmojiNumero(texto) {
  const mapaNumeros = {
    '0': ':zero:', '1': ':one:', '2': ':two:', '3': ':three:', '4': ':four:',
    '5': ':five:', '6': ':six:', '7': ':seven:', '8': ':eight:', '9': ':nine:'
  };

  return texto.replace(/(<a?:[a-zA-Z0-9_]+:\d+>)|(\d)/g, (match, emoji) => {
    if (emoji) return emoji;
    return mapaNumeros[match] || match;
  });
}

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const texto = message.content.trim();

  // =========================================================
  // COMANDO: %notificarjogo
  // =========================================================
  if (texto.toLowerCase().startsWith('%notificarjogo')) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator) && 
        !message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
      return message.reply('❌ Precisa de permissão de Administrador ou Gerir Servidor.');
    }

    const conteudo = texto.slice(14).trim();
    const partes = conteudo.split(/\s+/);

    if (partes.length < 5) {
      return message.reply(
        '❌ **Formato incorreto!** Use:\n' +
        '`%notificarjogo [EmojiSeason] [EmojiTime1] [EmojiTime2] [NickRoblox] [Link]`'
      );
    }

    const canalJogos = message.guild.channels.cache.get(ID_CANAL_JOGOS);
    if (!canalJogos) {
      return message.reply(`❌ Canal de jogos (\`${ID_CANAL_JOGOS}\`) não foi encontrado!`);
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
      console.error('[Erro Discord API]', err.message);
      return message.reply(`❌ Erro ao enviar mensagem no canal: \`${err.message}\``);
    }
  }

  // =========================================================
  // COMANDO INTERATIVO: %resultado
  // =========================================================
  if (texto.toLowerCase().startsWith('%resultado')) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator) && 
        !message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
      return message.reply('❌ Precisa de permissão de Administrador ou Gerir Servidor.');
    }

    const filter = m => m.author.id === message.author.id;
    const channel = message.channel;

    try {
      // 1. Times e Placar
      const msgPerg1 = await channel.send('1️⃣ **Quais os times e o placar?**\n*(Exemplo: `:novazelandia: 6 - 1 :holanda:`)*');
      const resp1 = await channel.awaitMessages({ filter, max: 1, time: 60000, errors: ['time'] });
      const placarEntrada = resp1.first().content;
      const placarFormatado = converterParaEmojiNumero(placarEntrada);
      await resp1.first().delete().catch(() => {});
      await msgPerg1.delete().catch(() => {});

      // 2. Estádio
      const msgPerg2 = await channel.send('2️⃣ **Qual foi o Estádio?**\n*(Exemplo: `Allianz Riviera`)*');
      const resp2 = await channel.awaitMessages({ filter, max: 1, time: 60000, errors: ['time'] });
      const estadio = resp2.first().content;
      await resp2.first().delete().catch(() => {});
      await msgPerg2.delete().catch(() => {});

      // Painel inicial
      let estruturaResultado = `# :season3: | JOGO FINALIZADO\n` +
        `-# :stadium: ${estadio}\n\n` +
        `${placarFormatado}\n\n` +
        `**Estatísticas**\n*Aguardando dados...*\n\n` +
        `**MVP's e Menções honrosas**\n*Aguardando dados...*`;

      const msgPainel = await channel.send(estruturaResultado);

      // 3. Estatísticas
      const msgPerg3 = await channel.send('3️⃣ **Cole as Estatísticas completas**:');
      const resp3 = await channel.awaitMessages({ filter, max: 1, time: 120000, errors: ['time'] });
      const estatisticas = resp3.first().content;
      await resp3.first().delete().catch(() => {});
      await msgPerg3.delete().catch(() => {});

      estruturaResultado = `# :season3: | JOGO FINALIZADO\n` +
        `-# :stadium: ${estadio}\n\n` +
        `${placarFormatado}\n\n` +
        `**Estatísticas**\n${estatisticas}\n\n` +
        `**MVP's e Menções honrosas**\n*Aguardando dados...*`;

      await msgPainel.edit(estruturaResultado);

      // 4. MVPs
      const msgPerg4 = await channel.send('4️⃣ **Quais são os MVPs?**:');
      const resp4 = await channel.awaitMessages({ filter, max: 1, time: 60000, errors: ['time'] });
      const mvps = resp4.first().content;
      await resp4.first().delete().catch(() => {});
      await msgPerg4.delete().catch(() => {});

      // 5. Juízes
      const msgPerg5 = await channel.send('5️⃣ **Quem foram os Juízes?**\n*(Exemplo: `@Jaoelega8 & @PorcoDeAsa`)*');
      const resp5 = await channel.awaitMessages({ filter, max: 1, time: 60000, errors: ['time'] });
      const juizes = resp5.first().content;
      await resp5.first().delete().catch(() => {});
      await msgPerg5.delete().catch(() => {});

      // Resultado Final
      estruturaResultado = `# :season3: | JOGO FINALIZADO\n` +
        `-# :stadium: ${estadio}\n\n` +
        `${placarFormatado}\n\n` +
        `**Estatísticas**\n${estatisticas}\n\n` +
        `**MVP's e Menções honrosas**\n${mvps}\n\n` +
        `:juizes: **JUÍZES:** ${juizes}`;

      await msgPainel.edit(estruturaResultado);

      const avisoSucesso = await channel.send('✅ **Resultado publicado com sucesso!**');
      setTimeout(() => avisoSucesso.delete().catch(() => {}), 5000);

    } catch (err) {
      console.error(err);
      return channel.send('❌ Tempo limite esgotado (60s) ou erro no preenchimento.');
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
