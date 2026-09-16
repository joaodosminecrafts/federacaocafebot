const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');

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

client.on('messageCreate', (message) => {
  if (message.author.bot) return;

  if (message.content === '%ping') {
    message.reply('Pong!');
  }

  if (message.content === '%oporcoelindo') {
    message.reply('verdade');
  }

  

  if (message.content === '%testarboasvindas') {
    client.emit('guildMemberAdd', message.member);
  }
});

client.on('guildMemberAdd', async (member) => {
  console.log(`Membro detectado: ${member.user.tag}`);

  const canal = member.guild.channels.cache.get('1463012406740385792');

  if (!canal) {
    console.log('ERRO: Canal não encontrado! Verifique o ID do canal.');
    return;
  }

  const embedBoasVindas = new EmbedBuilder()
    .setColor('#543306')
    .setTitle(`Bem-vindo(a) à ${member.guild.name}! `)
    .setDescription(`Olá ${member}, seja muito bem-vindo(a) Federação Café! Se verifique em <#1526091101138718740>.`)
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
const express = require('express');
const app = express();
app.get('/', (req, res) => res.send('Bot online 24/7!'));
app.listen(process.env.PORT || 3000);
