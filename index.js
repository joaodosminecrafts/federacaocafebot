const { 
  Client, 
  GatewayIntentBits, 
  EmbedBuilder, 
  PermissionsBitField, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle,
  ChannelType 
} = require('discord.js');
const express = require('express');

// 1. Servidor Web (Mantém 24/7 no Render)
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

// 3. Comandos de Texto (Apenas Administradores)
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const texto = message.content.toLowerCase().trim();

  // Enviar o Painel
  if (texto === '%painelticket') {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply('❌ Apenas administradores podem enviar o painel.');
    }

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
      .setImage('https://cdn.discordapp.com/attachments/1463018824461979763/1549870083960995871/3jw0xq8.png')
      .setFooter({ text: 'Made in SPL. ☕🍵' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_duvida')
        .setLabel('DÚVIDA')
        .setEmoji('🤔')
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId('ticket_denuncia')
        .setLabel('DENÚNCIA')
        .setEmoji('🎟️')
        .setStyle(ButtonStyle.Danger),

      new ButtonBuilder()
        .setCustomId('ticket_parceria')
        .setLabel('PARCERIA')
        .setEmoji('🤝')
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId('ticket_inscrever')
        .setLabel('SE INSCREVER')
        .setEmoji('✔️')
        .setStyle(ButtonStyle.Secondary)
    );

    await message.channel.send({ embeds: [embedTicket], components: [row] });
    return message.delete().catch(() => {});
  }

  // Comando para fechar ticket manualmente no canal
  if (texto === '%fecharticket') {
    if (!message.channel.name.startsWith('ticket-')) {
      return message.reply('❌ Este comando só pode ser usado dentro de um canal de ticket.');
    }

    message.reply('🔒 Este ticket será fechado em 5 segundos...');
    setTimeout(() => {
      message.channel.delete().catch(console.error);
    }, 5000);
  }

  // Teste de Boas-Vindas
  if (texto === '%testarboasvindas') {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply('❌ Apenas administradores podem usar este comando.');
    }
    return client.emit('guildMemberAdd', message.member);
  }
});

// 4. Criação do Canal ao Clicar no Botão
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  if (interaction.customId.startsWith('ticket_')) {
    const tipo = interaction.customId.replace('ticket_', '');
    const nomeCanal = `ticket-${tipo}-${interaction.user.username}`;

    // Evita abrir múltiplos tickets do mesmo usuário
    const canalExistente = interaction.guild.channels.cache.find(c => c.name.toLowerCase() === nomeCanal.toLowerCase());
    if (canalExistente) {
      return interaction.reply({
        content: `❌ Você já possui um ticket aberto em ${canalExistente}!`,
        ephemeral: true
      });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      // Cria o canal privado
      const canal = await interaction.guild.channels.create({
        name: nomeCanal,
        type: ChannelType.GuildText,
        permissionOverwrites: [
          {
            id: interaction.guild.id, // Oculta para todos (@everyone)
            deny: [PermissionsBitField.Flags.ViewChannel],
          },
          {
            id: interaction.user.id, // Dá acesso ao criador do ticket
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
              PermissionsBitField.Flags.AttachFiles
            ],
          },
          {
            id: interaction.guild.roles.everyone.id, // Pode ajustar adicionando a permissão do cargo de Staff
            allow: [],
          }
        ],
      });

      // Botão interno para fechar o canal
      const btnFechar = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('fechar_ticket_canal')
          .setLabel('Fechar Ticket')
          .setEmoji('🔒')
          .setStyle(ButtonStyle.Danger)
      );

      const embedBoasVindasTicket = new EmbedBuilder()
        .setColor('#543306')
        .setTitle(`Atendimento - ${tipo.toUpperCase()}`)
        .setDescription(`Olá ${interaction.user}, bem-vindo ao seu ticket! Descreva o seu assunto em detalhes. Um suporte responderá em breve.`)
        .setFooter({ text: 'Clique no botão abaixo para fechar o ticket.' });

      await canal.send({ content: `${interaction.user}`, embeds: [embedBoasVindasTicket], components: [btnFechar] });

      await interaction.editReply({ content: `✅ Seu ticket foi criado em ${canal}!` });

    } catch (err) {
      console.error(err);
      await interaction.editReply({ content: '❌ Ocorreu um erro ao criar o seu ticket.' });
    }
  }

  // Ação do Botão de Fechar dentro do Canal
  if (interaction.customId === 'fechar_ticket_canal') {
    await interaction.reply('🔒 Encerrando e deletando este ticket em 5 segundos...');
    setTimeout(() => {
      interaction.channel.delete().catch(console.error);
    }, 5000);
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
