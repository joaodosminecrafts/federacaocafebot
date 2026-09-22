const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');
const express = require('express');

// Configuração dos Intencionais do Cliente
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

// Servidor Web para manter o Render ativo
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('Bot de Notificação e Resultados Online!'));
app.listen(PORT, () => console.log(`[Express] Servidor ativo na porta ${PORT}`));

client.once('ready', () => {
  console.log(`[Discord] ✅ Bot online como: ${client.user.tag}`);
});

// ID do Canal de Notificações de Jogos
const ID_CANAL_JOGOS = '1463018033651122176';

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const texto = message.content.trim();

  // =========================================================
  // COMANDO: %notificarjogo
  // =========================================================
  if (texto.toLowerCase().startsWith('%notificarjogo')) {
    console.log('[Comando Detectado] Executando %notificarjogo...');

    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator) && 
        !message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
      return message.reply('❌ Você precisa de permissão de Administrador ou Gerenciar Servidor.');
    }

    const conteudo = texto.slice(14).trim();
    const partes = conteudo.split(/\s+/);

    if (partes.length < 5) {
      return message.reply(
        '❌ **Formato incorreto!** Use:\n' +
        '`%notificarjogo [EmojiSeason] [EmojiTime1] [EmojiTime2] [NickRoblox] [Link]`\n\n' +
        '**Exemplo:**\n' +
        '`%notificarjogo 🏆 ⚽ 🇧🇷 MeuNick https://roblox.com/share?code=123`'
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
    console.log('[Comando Detectado] Executando %resultado...');

    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator) && 
        !message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
      return message.reply('❌ Você precisa de permissão de Administrador ou Gerenciar Servidor.');
    }

    const filter = m => m.author.id === message.author.id;
    const channel = message.channel;

    try {
      // Step 1: Placar e Emojis dos Times
      const msgPerg1 = await channel.send('1️⃣ **Quais times e placar?**\n*(Exemplo: `:novazelandia: 3 - 4 :holanda:`)');
      const resp1 = await channel.awaitMessages({ filter, max: 1, time: 60000, errors: ['time'] });
      const placar = resp1.first().content;
      await resp1.first().delete().catch(() => {});
      await msgPerg1.delete().catch(() => {});

      // Step 2: Estádio
      const msgPerg2 = await channel.send('2️⃣ **Qual foi o Estádio?**\n*(Exemplo: `Allianz Riviera`)');
      const resp2 = await channel.awaitMessages({ filter, max: 1, time: 60000, errors: ['time'] });
      const estadio = resp2.first().content;
      await resp2.first().delete().catch(() => {});
      await msgPerg2.delete().catch(() => {});

      // Envia a mensagem base inicial que será editada em tempo real
      let estruturaResultado = `🏆 | **JOGO FINALIZADO**\n` +
        `🏟️ ${estadio}\n\n` +
        `${placar}\n\n` +
        `**Estatísticas**\n*Aguardando dados...*\n\n` +
        `**MVP's e Menções honrosas**\n*Aguardando dados...*`;

      const msgPainel = await channel.send(estruturaResultado);

      // Step 3: Estatísticas de Gols e Assistências
      const msgPerg3 = await channel.send('3️⃣ **Cole as Estatísticas completas** (pode colar várias linhas de uma vez):');
      const resp3 = await channel.awaitMessages({ filter, max: 1, time: 120000, errors: ['time'] });
      const estatisticas = resp3.first().content;
      await resp3.first().delete().catch(() => {});
      await msgPerg3.delete().catch(() => {});

      // Edição intermediária do painel
      estruturaResultado = `🏆 | **JOGO FINALIZADO**\n` +
        `🏟️ ${estadio}\n\n` +
        `${placar}\n\n` +
        `**Estatísticas**\n${estatisticas}\n\n` +
        `**MVP's e Menções honrosas**\n*Aguardando dados...*`;

      await msgPainel.edit(estruturaResultado);

      // Step 4: MVPs e Menções
      const msgPerg4 = await channel.send('4️⃣ **Quais são os MVPs?**\n*(Exemplo:\n:mvp1: Jogador1\n:mvp2: Jogador2\n:mvp3: Jogador3)*');
      const resp4 = await channel.awaitMessages({ filter, max: 1, time: 60000, errors: ['time'] });
      const mvps = resp4.first().content;
      await resp4.first().delete().catch(() => {});
      await msgPerg4.delete().catch(() => {});

      // Step 5: Juízes
      const msgPerg5 = await channel.send('5️⃣ **Quem foram os Juízes?**\n*(Exemplo: `@Jaoelega8 & @PorcoDeAsa`)*');
      const resp5 = await channel.awaitMessages({ filter, max: 1, time: 60000, errors: ['time'] });
      const juizes = resp5.first().content;
      await resp5.first().delete().catch(() => {});
      await msgPerg5.delete().catch(() => {});

      // Montagem Final
      estruturaResultado = `🏆 | **JOGO FINALIZADO**\n` +
        `🏟️ ${estadio}\n\n` +
        `${placar}\n\n` +
        `**Estatísticas**\n${estatisticas}\n\n` +
        `**MVP's e Menções honrosas**\n${mvps}\n\n` +
        `👨‍⚖️ **JUÍZES:** ${juizes}`;

      await msgPainel.edit(estruturaResultado);
      
      const avisoSucesso = await channel.send('✅ **Painel de resultado publicado com sucesso!**');
      setTimeout(() => avisoSucesso.delete().catch(() => {}), 5000);

    } catch (err) {
      console.error(err);
      return channel.send('❌ Tempo limite esgotado (60s) ou erro durante o preenchimento do resultado.');
    }
  }
});

// Inicialização segura do Bot na nuvem
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
