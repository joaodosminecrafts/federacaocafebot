const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField } = require('discord.js');
const express = require('express');

// 1. Servidor Web para manter o bot online 24/7 no Render[cite: 1, 2]
const app = express();
app.get('/', (req, res) => res.send('Bot online 24/7!'));
app.listen(process.env.PORT || 3000, () => {
  console.log('Servidor Express rodando na porta 3000');
});

// 2. Intenções do Bot[cite: 1, 2]
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

// Link do banner reutilizável
const BANNER_URL = 'https://cdn.discordapp.com/attachments/1463018824461979763/1549870083960995871/3jw0xq8.png?ex=6aac447f&is=6aaaf2ff&hm=cdc1ee6493ee4b833f755b071b44692ca05839142d2667be8ec8a6fb5a5e3448&';

// 3. Comandos de Texto (Apenas Administradores)[cite: 1, 2]
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const texto = message.content.toLowerCase().trim();

  // Teste de Boas-Vindas[cite: 1, 2]
  if (texto === '%testarboasvindas') {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply('❌ Apenas administradores podem usar este comando.');
    }
    return client.emit('guildMemberAdd', message.member);
  }

  // Teste de Saída
  if (texto === '%testarsaida') {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply('❌ Apenas administradores podem usar este comando.');
    }
    return client.emit('guildMemberRemove', message.member);
  }
});

// 4. Evento de Boas-Vindas[cite: 1, 2]
client.on('guildMemberAdd', async (member) => {
  console.log(`Membro entrou: ${member.user?.tag || member.user?.username || 'Desconhecido'}`);

  const canal = member.guild.channels.cache.get('1463012406740385792');

  if (!canal) {
    console.log('ERRO: Canal de boas-vindas não encontrado!');
    return;
  }

  const user = member.user || member;
  const avatar = user.displayAvatarURL ? user.displayAvatarURL({ dynamic: true }) : null;

  const embedBoasVindas = new EmbedBuilder()
    .setColor('#543306')
    .setTitle(`Bem-vindo(a) à ${member.guild.name}!`)
    .setDescription(`Olá ${member}, seja muito bem-vindo(a) à Federação Café! Se verifique em <#1526091101138718740>.`)
    .setThumbnail(avatar)
    .setImage(BANNER_URL)
    .setFooter({ text: 'Made in SPL. ☕' })
    .setTimestamp();

  canal.send({ embeds: [embedBoasVindas] }).catch(err => console.log('Erro ao enviar boas-vindas:', err));
});

// 5. Evento de Saída de Membros (Encaminhado para o canal de saída)[cite: 2]
client.on('guildMemberRemove', async (member) => {
  const nomeUsuario = member.user?.username || member.user?.tag || member.displayName || 'Um membro';
  console.log(`Membro saiu: ${nomeUsuario}`);

  // ID do canal de saída configurado
  const canal = member.guild.channels.cache.get('1463011554814595153');

  if (!canal) {
    console.log('ERRO: Canal de saída (1463011554814595153) não encontrado!');
    return;
  }

  const user = member.user || member;
  const avatar = user.displayAvatarURL ? user.displayAvatarURL({ dynamic: true }) : null;

  const embedSaida = new EmbedBuilder()
    .setColor('#543306')
    .setTitle(`Até logo...`)
    .setDescription(`O membro **${nomeUsuario}** saiu da ${member.guild.name}. Sentiremos a sua falta! ☕`)
    .setThumbnail(avatar)
    .setImage(BANNER_URL)
    .setFooter({ text: 'Made in SPL. ☕' })
    .setTimestamp();

  canal.send({ embeds: [embedSaida] })
    .then(() => console.log('Embed de saída enviado com sucesso para o canal de saída!'))
    .catch(err => console.log('Erro ao enviar mensagem de saída:', err));
});

client.login(process.env.TOKEN);
