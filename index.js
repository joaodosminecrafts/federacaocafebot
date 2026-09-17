const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField } = require('discord.js');
const express = require('express');

// 1. Servidor Web para o Render manter o bot online 24/7
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

// 3. Comandos de Texto
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const texto = message.content.toLowerCase().trim();

  // Teste de Boas-Vindas (Apenas Administradores)
  if (texto === '%testarboasvindas') {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply('❌ Apenas administradores podem usar este comando.');
    }
    return client.emit('guildMemberAdd', message.member);
  }
});

// 4. Sistema de Boas-Vindas com Imagem e Foto de Perfil
client.on('guildMemberAdd', async (member) => {
  console.log(`Membro detectado: ${member.user.tag}`);

  const canal = member.guild.channels.cache.get('1463012406740385792');

  if (!canal) {
    console.log('ERRO: Canal de boas-vindas não encontrado!');
    return;
  }

  const embedBoasVindas = new EmbedBuilder()
    .setColor('#543306')
    .setTitle(`Bem-vindo(a) à ${member.guild.name}!`)
    .setDescription(`Olá ${member}, seja muito bem-vindo(a) à Federação Café! Se verifique em <#1526091101138718740>.`)
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
    .setImage('https://cdn.discordapp.com/attachments/1463018824461979763/1549870083960995871/3jw0xq8.png?ex=6aaced3f&is=6aab9bbf&hm=b2585f7b57b9af9bdb49390a2d15bbf43b6b884870092605cf79f2fd0675dd6c&')
    .setFooter({ text: 'Made in SPL. ☕' })
    .setTimestamp();

  canal.send({ embeds: [embedBoasVindas] }).then(() => {
    console.log('Embed de boas-vindas enviado com sucesso!');
  }).catch(err => {
    console.log('Erro ao enviar:', err);
  });
});

client.login(process.env.TOKEN);
