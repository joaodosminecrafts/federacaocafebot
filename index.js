const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');
const express = require('express');

// 1. Servidor Web para manter o bot online 24/7 no Render (Porta dinâmica)
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('Bot online 24/7!'));
app.listen(PORT, () => {
  console.log(`Servidor Express rodando na porta ${PORT}`);
});

// 2. Intenções do Bot
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

client.once('ready', () => {
  console.log(`✅ BOT ONLINE E CONECTADO COMO: ${client.user.tag}`);
});

// Configurações de IDs dos Canais
const ID_CANAL_BOASVINDAS = '1463012406740385792';
const ID_CANAL_SAIDA = '1463011554814595153';
const ID_CANAL_JOGOS = '1463018033651122176';
const SAIDA_URL = 'https://cdn.discordapp.com/attachments/1463018824461979763/1551060198628659210/9dqvkhb.png?ex=6ab098e0&is=6aaf4760&hm=219528b56891f966feff9e9a366ee043cf0b24533077ab4a8e86f9da735c6866&';
const BANNER_URL = 'https://cdn.discordapp.com/attachments/1463018824461979763/1549870083960995871/3jw0xq8.png?ex=6aac447f&is=6aaaf2ff&hm=cdc1ee6493ee4b833f755b071b44692ca05839142d2667be8ec8a6fb5a5e3448&';

// 3. Comandos de Texto
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const texto = message.content.trim();

  // --- COMANDO DE NOTIFICAÇÃO DE JOGO ---
  if (texto.toLowerCase().startsWith('%notificarjogo')) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator) && !message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
      return message.reply('❌ Apenas administradores ou gestores podem usar este comando.');
    }

    const conteudo = texto.slice(14).trim();
    const partes = conteudo.split(/\s+/);

    if (partes.length < 5) {
      return message.reply(
        '❌ **Formato incorreto!** Digite exatamente nesta ordem:\n' +
        '`%notificarjogo [EmojiSeason] [EmojiTime1] [EmojiTime2] [NickRoblox] [Link]`\n\n' +
        '**Exemplo:**\n' +
        '`%notificarjogo :season3: :equador: :portugal: perdiminhacontano https://roblox.com/share?code=123`'
      );
    }

    const emojiSeason = partes[0];
    const emojiTime1 = partes[1];
    const emojiTime2 = partes[2];
    const nickRoblox = partes[3];
    const linkRoblox = partes[4];

    const canalJogos = message.guild.channels.cache.get(ID_CANAL_JOGOS);

    if (!canalJogos) {
      return message.reply(`❌ Canal de jogos com ID \`${ID_CANAL_JOGOS}\` não foi encontrado neste servidor!`);
    }

    const mensagemJogo = `# ${emojiSeason} | ${emojiTime1} VS ${emojiTime2}\n\n` +
      `**Server Aberto!**\n` +
      `Nick: \`${nickRoblox}\`\n` +
      `Link: ${linkRoblox}\n\n` +
      `||@here||`;

    await canalJogos.send({ 
      content: mensagemJogo,
      allowedMentions: { parse: ['everyone'] }
    });

    await message.reply('✅ Notificação enviada com sucesso para o canal!');
    return;
  }

  // --- COMANDO DE TESTE DE BOAS-VINDAS ---
  if (texto.toLowerCase() === '%testarboasvindas') {
    const canal = message.guild.channels.cache.get(ID_CANAL_BOASVINDAS);
    if (!canal) {
      return message.reply(`❌ Canal de Boas-Vindas (\`${ID_CANAL_BOASVINDAS}\`) não encontrado!`);
    }

    const user = message.author;
    const avatar = user.displayAvatarURL ? user.displayAvatarURL({ dynamic: true }) : null;

    const embedBoasVindas = {
      color: 0x543306,
      title: `Bem-vindo(a) à ${message.guild.name}!`,
      description: `Olá ${message.member}, seja muito bem-vindo(a) à Federação Café! Se verifique em <#1526091101138718740>.`,
      thumbnail: { url: avatar },
      image: { url: BANNER_URL },
      footer: { text: 'Made in SPL. ☕' },
      timestamp: new Date()
    };

    await canal.send({ embeds: [embedBoasVindas] });
    return message.reply('✅ Teste de Boas-Vindas enviado no canal configurado!');
  }

  // --- COMANDO DE TESTE DE SAÍDA ---
  if (texto.toLowerCase() === '%testarsaida') {
    const canal = message.guild.channels.cache.get(ID_CANAL_SAIDA);
    if (!canal) {
      return message.reply(`❌ Canal de Saída (\`${ID_CANAL_SAIDA}\`) não encontrado!`);
    }

    const user = message.author;
    const avatar = user.displayAvatarURL ? user.displayAvatarURL({ dynamic: true }) : null;

    const embedSaida = {
      color: 0x543306,
      title: `Até logo...`,
      description: `O membro **${user.username}** saiu da ${message.guild.name}. Sentiremos a sua falta! ☕`,
      thumbnail: { url: avatar },
      image: { url: SAIDA_URL },
      footer: { text: 'Made in SPL. ☕' },
      timestamp: new Date()
    };

    await canal.send({ embeds: [embedSaida] });
    return message.reply('✅ Teste de Saída enviado no canal configurado!');
  }
});

// 4. Evento Real de Boas-Vindas
client.on('guildMemberAdd', async (member) => {
  const canal = member.guild.channels.cache.get(ID_CANAL_BOASVINDAS);
  if (!canal) return;

  const user = member.user || member;
  const avatar = user.displayAvatarURL ? user.displayAvatarURL({ dynamic: true }) : null;

  const embedBoasVindas = {
    color: 0x543306,
    title: `Bem-vindo(a) à ${member.guild.name}!`,
    description: `Olá ${member}, seja muito bem-vindo(a) à Federação Café! Se verifique em <#1526091101138718740>.`,
    thumbnail: { url: avatar },
    image: { url: BANNER_URL },
    footer: { text: 'Made in SPL. ☕' },
    timestamp: new Date()
  };

  canal.send({ embeds: [embedBoasVindas] }).catch(err => console.log('Erro ao enviar boas-vindas:', err));
});

// 5. Evento Real de Saída
client.on('guildMemberRemove', async (member) => {
  const nomeUsuario = member.user?.username || member.user?.tag || member.displayName || 'Um membro';
  const canal = member.guild.channels.cache.get(ID_CANAL_SAIDA);
  if (!canal) return;

  const user = member.user || member;
  const avatar = user.displayAvatarURL ? user.displayAvatarURL({ dynamic: true }) : null;

  const embedSaida = {
    color: 0x543306,
    title: `Até logo...`,
    description: `O membro **${nomeUsuario}** saiu da ${member.guild.name}. Sentiremos a sua falta! ☕`,
    thumbnail: { url: avatar },
    image: { url: SAIDA_URL },
    footer: { text: 'Made in SPL. ☕' },
    timestamp: new Date()
  };

  canal.send({ embeds: [embedSaida] }).catch(err => console.log('Erro ao enviar mensagem de saída:', err));
});

// 6. Autenticação com Captura Forçada de Erro
async function iniciarBot() {
  console.log('--- INICIANDO DIAGNÓSTICO DE LOGIN ---');
  const token = process.env.TOKEN ? process.env.TOKEN.trim() : null;

  if (!token) {
    console.error('❌ ERRO CRÍTICO: A variável TOKEN está completamente vazia no Render!');
    return;
  }

  console.log('TOKEN encontrado! Tentando autenticar no Discord...');
  try {
    await client.login(token);
  } catch (error) {
    console.error('❌ ERRO DETETADO AO CONECTAR AO DISCORD:');
    console.error('Mensagem de Erro:', error.message);
    console.error('Código de Erro:', error.code);
  }
}

iniciarBot();
