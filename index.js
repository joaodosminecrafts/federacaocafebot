const { 
  Client, 
  GatewayIntentBits, 
  EmbedBuilder, 
  PermissionsBitField, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle 
} = require('discord.js');
const express = require('express');

// 1. Servidor Web (Mantém 24/7 no Render)
const app = express();
app.get('/', (req, res) => res.send('Bot online 24/7!'));
app.listen(process.env.PORT || 3000, () => {
  console.log('Servidor Express rodando na porta 3000');
});

// 2. Intentions
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

  // Comando para enviar o Painel do Ticket no canal
  if (texto === '%painelticket') {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply('❌ Apenas administradores podem enviar o painel.');
    }

    // Embed exatamente igual ao da imagem
    const embedTicket = new EmbedBuilder()
      .setColor('#543306')
      .setAuthor({ 
        name: 'Federação Café ☕🍵', 
        iconURL: message.guild.iconURL({ dynamic: true }) 
      })
      .setTitle('Informações do Ticket')
      .setDescription(
        '• Não abra ticket por brincadeiras, isso resultará em uma punição.\n' +
        '• Apenas abra tickets de inscrição se as vagas estiverem abertas.'
      )
      .setImage('https://cdn.discordapp.com/attachments/1463018824461979763/1549870083960995871/3jw0xq8.png') // Substitua pelo link direto da sua imagem/banner
      .setFooter({ text: 'Made in SPL. ☕🍵' });

    // Botões interativos
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_duvida')
        .setLabel('DÚVIDA')
        .setEmoji('🤔')
        .setStyle(ButtonStyle.Primary), // Azul

      new ButtonBuilder()
        .setCustomId('ticket_denuncia')
        .setLabel('DENÚNCIA')
        .setEmoji('🎟️')
        .setStyle(ButtonStyle.Danger), // Vermelho

      new ButtonBuilder()
        .setCustomId('ticket_parceria')
        .setLabel('PARCERIA')
        .setEmoji('🤝')
        .setStyle(ButtonStyle.Success), // Verde

      new ButtonBuilder()
        .setCustomId('ticket_inscrever')
        .setLabel('SE INSCREVER')
        .setEmoji('✔️')
        .setStyle(ButtonStyle.Secondary) // Cinza
        .setDisabled(false) // Mude para true se as vagas estiverem fechadas
    );

    await message.channel.send({ embeds: [embedTicket], components: [row] });
    return message.delete().catch(() => {}); // Apaga o %painelticket digitado
  }

  // Teste de Boas-Vindas
  if (texto === '%testarboasvindas') {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply('❌ Apenas administradores podem usar este comando.');
    }
    return client.emit('guildMemberAdd', message.member);
  }
});

// 4. Resposta aos Botões dos Tickets
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  if (interaction.customId.startsWith('ticket_')) {
    const tipo = interaction.customId.replace('ticket_', '').toUpperCase();

    // Responde apenas para quem clicou
    await interaction.reply({
      content: `📌 Você selecionou a opção **${tipo}**. O suporte será notificado em breve!`,
      ephemeral: true
    });
  }
});

// 5. Evento de Boas-Vindas
client.on('guildMemberAdd', async (member) => {
  const canal = member.guild.channels.cache.get('1463012406740385792');
  if (!canal) return;

  const embedBoasVindas = new EmbedBuilder()
    .setColor('#543306')
    .setTitle(`Bem-vindo(a) à ${member.guild.name}!`)
    .setDescription(`Olá ${member}, seja muito bem-vindo(a) à Federação Café! Se verifique em <#1526091101138718740>.`)
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
    .setFooter({ text: 'Made in SPL. ☕' })
    .setTimestamp();

  canal.send({ embeds: [embedBoasVindas] }).catch(console.error);
});

client.login(process.env.TOKEN);
