const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');
const express = require('express');

// 1. Servidor Web para manter o bot online 24/7 no Render
const app = express();
app.get('/', (req, res) => res.send('Bot online 24/7!'));
app.listen(process.env.PORT || 3000, () => {
  console.log('Servidor Express rodando na porta 3000');
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
  console.log(`Bot online como ${client.user.tag}!`);
});

// Configurações de IDs dos Canais
const ID_CANAL_BOASVINDAS = '1463012406740385792';
const ID_CANAL_SAIDA = '1463011554814595153';
const ID_CANAL_JOGOS = '1463018033651122176'; // Canal de jogos atualizado

const BANNER_URL = 'https://cdn.discordapp.com/attachments/1463018824461979763/1549870083960995871/3jw0xq8.png?ex=6aac447f&is=6aaaf2ff&hm=cdc1ee6493ee4b833f755b071b44692ca05839142d2667be8ec8a6fb5a5e3448&';

// 3. Comandos de Texto (Apenas Administradores)
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const texto = message.content.trim();

  // --- COMANDO DE NOTIFICAÇÃO DE JOGO (PRÁTICO - SEM BARRAS |) ---
  // Uso: %notificarjogo [EmojiSeason] [Confronto / Emojis das Seleções] [Nick] [Link]
  if (texto.toLowerCase().startsWith('%notificarjogo')) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply('❌ Apenas administradores podem usar este comando.');
    }

    const conteudo = texto.slice(14).trim();
    const partes = conteudo.split(/\s+/); // Separa por qualquer espaço em branco

    if (partes.length < 4) {
      return message.reply(
        '❌ **Formato incorreto!** Usa o comando de forma simples sem barras:\n' +
        '`%notificarjogo [Emoji_Season] [Confronto/Emojis] [Nick_Roblox] [Link]`\n\n' +
        '**Exemplo:**\n' +
        '`%notificarjogo :season3: :equador: VS :portugal: perdiminhacontano https://roblox.com/share?code=123`'
      );
    }

    const emojiSeason = partes[0];
    const linkRoblox = partes[partes.length - 1];
    const nickRoblox = partes[partes.length - 2];
    const confronto = partes.slice(1, partes.length - 2).join(' ');

    const canalJogos = message.guild.channels.cache.get(ID_CANAL_JOGOS);

    if (!canalJogos) {
      return message.reply('❌ Canal de divulgação de jogos não encontrado! Verifica o ID no código.');
    }

    // Estrutura com # no início e formatação rápida
    const mensagemJogo = `# ${emojiSeason} | ${confronto}\n\n` +
      `**Server Aberto!**\n` +
      `Nick: \`${nickRoblox}\`\n` +
      `Link: ${linkRoblox}`;

    await canalJogos.send({ 
      content: mensagemJogo,
      allowedMentions: { parse: [] } // Evita menções indevidas durante testes
    });

    await message.reply('✅ Notificação de jogo enviada com sucesso para o canal!');
    return;
  }

  // Teste de Boas-Vindas
  if (texto.toLowerCase() === '%testarboasvindas') {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply('❌ Apenas administradores podem usar este comando.');
    }
    return client.emit('guildMemberAdd', message.member);
  }

  // Teste de Saída
  if (texto.toLowerCase() === '%testarsaida') {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply('❌ Apenas administradores podem usar este comando.');
    }
    return client.emit('guildMemberRemove', message.member);
  }
});

// 4. Evento de Boas-Vindas (Embed)
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

// 5. Evento de Saída (Embed)
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
    image: { url: BANNER_URL },
    footer: { text: 'Made in SPL. ☕' },
    timestamp: new Date()
  };

  canal.send({ embeds: [embedSaida] }).catch(err => console.log('Erro ao enviar mensagem de saída:', err));
});

client.login(process.env.TOKEN);
