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
        '`%notificarjogo [EmojiSeason] [EmojiTime1] [EmojiTime2] [NickRoblox] [Link]`'
      );
    }

    const canalJogos = message.guild.channels.cache.get(ID_CANAL_JOGOS);
    if (!canalJogos) return message.reply(`❌ Canal de jogos (\`${ID_CANAL_JOGOS}\`) não encontrado!`);

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
      return message.reply(`❌ Erro ao enviar notificação: \`${err.message}\``);
    }
  }

  // --- TESTE DE BOAS-VINDAS ---
  if (texto.toLowerCase() === '%testarboasvindas') {
    const canal = message.guild.channels.cache.get(ID_CANAL_BOASVINDAS);
    if (!canal) return message.reply(`❌ Canal de Boas-Vindas (\`${ID_CANAL_BOASVINDAS}\`) não encontrado!`);

    const user = message.author;
    const avatar = user.displayAvatarURL ? user.displayAvatarURL({ dynamic: true }) : null;

    const embedBoasVindas = {
      color: 0x543306,
      title: `Bem-vindo(a) à ${message.guild.name}!`,
      description: `Olá ${message.member}, seja muito bem-vindo(a) à Federação Café! Se verifique em <#1526091101138718740>.`,
      thumbnail: avatar ? { url: avatar } : null,
      footer: { text: 'Made in SPL. ☕' },
      timestamp: new Date()
    };

    try {
      await canal.send({ embeds: [embedBoasVindas] });
      return message.reply('✅ Teste de Boas-Vindas enviado com sucesso!');
    } catch (err) {
      return message.reply(`❌ Erro no envio de Boas-Vindas: \`${err.message}\``);
    }
  }

  // --- TESTE DE SAÍDA ---
  if (texto.toLowerCase() === '%testarsaida') {
    const canal = message.guild.channels.cache.get(ID_CANAL_SAIDA);
    if (!canal) return message.reply(`❌ Canal de Saída (\`${ID_CANAL_SAIDA}\`) não encontrado!`);

    const user = message.author;
    const avatar = user.displayAvatarURL ? user.displayAvatarURL({ dynamic: true }) : null;

    const embedSaida = {
      color: 0x543306,
      title: `Até logo...`,
      description: `O membro **${user.username}** saiu da ${message.guild.name}. Sentiremos a sua falta! ☕`,
      thumbnail: avatar ? { url: avatar } : null,
      footer: { text: 'Made in SPL. ☕' },
      timestamp: new Date()
    };

    try {
      await canal.send({ embeds: [embedSaida] });
      return message.reply('✅ Teste de Saída enviado com sucesso!');
    } catch (err) {
      return message.reply(`❌ Erro no envio de Saída: \`${err.message}\``);
    }
  }
});

// 4. Evento Real de Boas-Vindas (Quando alguém entra)
client.on('guildMemberAdd', async (member) => {
  const canal = member.guild.channels.cache.get(ID_CANAL_BOASVINDAS);
  if (!canal) return;

  const user = member.user || member;
  const avatar = user.displayAvatarURL ? user.displayAvatarURL({ dynamic: true }) : null;

  const embedBoasVindas = {
    color: 0x543306,
    title: `Bem-vindo(a) à ${member.guild.name}!`,
    description: `Olá ${member}, seja muito bem-vindo(a) à Federação Café! Se verifique em <#1526091101138718740>.`,
    thumbnail: avatar ? { url: avatar } : null,
    footer: { text: 'Made in SPL. ☕' },
    timestamp: new Date()
  };

  canal.send({ embeds: [embedBoasVindas] }).catch(err => console.log('Erro ao enviar boas-vindas:', err));
});

// 5. Evento Real de Saída (Quando alguém sai)
client.on('guildMemberRemove', async (member) => {
  const canal = member.guild.channels.cache.get(ID_CANAL_SAIDA);
  if (!canal) return;

  const user = member.user || member;
  const nomeUsuario = user.username || member.displayName || 'Um membro';
  const avatar = user.displayAvatarURL ? user.displayAvatarURL({ dynamic: true }) : null;

  const embedSaida = {
    color: 0x543306,
    title: `Até logo...`,
    description: `O membro **${nomeUsuario}** saiu da ${member.guild.name}. Sentiremos a sua falta! ☕`,
    thumbnail: avatar ? { url: avatar } : null,
    footer: { text: 'Made in SPL. ☕' },
    timestamp: new Date()
  };

  canal.send({ embeds: [embedSaida] }).catch(err => console.log('Erro ao enviar mensagem de saída:', err));
});

// 6. Autenticação
async function iniciarBot() {
  const token = process.env.TOKEN ? process.env.TOKEN.trim() : null;
  if (!token) return console.error('❌ TOKEN ausente!');

  try {
    await client.login(token);
  } catch (error) {
    console.error('❌ Erro de login:', error.message);
  }
}

iniciarBot();
