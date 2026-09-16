const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField } = require('discord.js');
const express = require('express');

// 1. Inicia o servidor web para o Render manter o bot online
const app = express();
app.get('/', (req, res) => res.send('Bot online 24/7!'));
app.listen(process.env.PORT || 3000, () => {
  console.log('Servidor Express rodando na porta 3000');
});

// 2. Configura as intenções do bot
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

// 3. Comandos do bot
client.on('messageCreate', (message) => {
  if (message.author.bot) return;

  // Normaliza o texto para minúsculas
  const texto = message.content.toLowerCase();

  if (texto.includes('%testarboasvindas')) {
    // Verificação de permissão corrigida para a v14
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply('❌ Apenas administradores podem usar este comando.');
    }

    return client.emit('guildMemberAdd', message.member);
  }
});

// 4. Sistema de Boas-Vindas
client.on('guildMemberAdd', async (member) => {
  console.log(`Membro detectado: ${member.user.tag}`);

  const canal = member.guild.channels.cache.get('1463012406740385792');

  if (!canal) {
    console.log('ERRO: Canal não encontrado! Verifique o ID do canal.');
    return;
  }

  const embedBoasVindas = new EmbedBuilder()
    .setColor('#543306')
    .setTitle(`Bem-vindo(a) à ${member.guild.name}!`)
    .setDescription(`Olá ${member}, seja muito bem-vindo(a) à Federação Café! Se verifique em <#1526091101138718740>.`)
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
    .setImage('https://cdn.discordapp.com/attachments/1463018824461979763/1549870083960995871/3jw0xq8.png?ex=6aac447f&is=6aaaf2ff&hm=cdc1ee6493ee4b833f755b071b44692ca05839142d2667be8ec8a6fb5a5e3448&')
    .setFooter({ text: 'Made in SPL. ☕' })
    .setTimestamp();

  canal.send({ embeds: [embedBoasVindas] }).then(() => {
    console.log('Embed enviado com sucesso!');
  }).catch(err => {
    console.log('Erro ao enviar:', err);
  });
});

client.login(process.env.TOKEN);
