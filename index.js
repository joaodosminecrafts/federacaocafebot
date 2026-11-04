const { 
  Client, 
  GatewayIntentBits, 
  PermissionsBitField, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ComponentType 
} = require('discord.js');
const { Agent, setGlobalDispatcher } = require('undici');
const express = require('express');
const fs = require('fs');
const path = path = require('path');

// Ajusta o dispatcher global HTTP para evitar bloqueios de socket/timeout do Render
setGlobalDispatcher(new Agent({ connect: { timeout: 60000 } }));

const app = express();
const PORT = process.env.PORT || 10000;

app.get('/', (req, res) => res.send('Bot de Notificação e Liga Online!'));
app.listen(PORT, () => console.log(`[Express] Servidor ativo na porta ${PORT}`));

// Configuração de Persistência (JSON local robusto)
const DB_PATH = path.join(__dirname, 'league_config.json');

let db = {
  marketOpen: true,
  marketChannelId: '', 
  faChannelId: '', // Canal exclusivo para Free Agency
  rosterLimit: 20,
  ownerRoleIds: [], 
  teams: [] 
};

function loadDatabase() {
  if (fs.existsSync(DB_PATH)) {
    try {
      const data = fs.readFileSync(DB_PATH, 'utf-8');
      const parsed = JSON.parse(data);
      db = { ...db, ...parsed };
      console.log(`[DB] Dados carregados com sucesso! Times registados: ${db.teams.length}`);
    } catch (e) {
      console.error('[DB] Erro ao ler o ficheiro JSON, a recriar...', e.message);
      saveDatabase();
    }
  } else {
    console.log('[DB] Ficheiro league_config.json não encontrado. A criar novo...');
    saveDatabase();
  }
}

function saveDatabase() {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
    console.log(`[DB] Dados salvos com sucesso! Total de times guardados: ${db.teams.length}`);
  } catch (e) {
    console.error('[DB] Erro crítico ao salvar dados:', e.message);
  }
}

loadDatabase();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages
  ],
  rest: { timeout: 60000, retries: 3 }
});

client.once('ready', () => {
  console.log(`[Discord] ✅ Bot online como: ${client.user.tag}`);
});

// Funções Auxiliares
function getUserTeam(member) {
  return db.teams.find(t => member.roles.cache.has(t.roleId));
}

function isCoach(member) {
  if (member.permissions.has(PermissionsBitField.Flags.Administrator)) return true;
  return db.ownerRoleIds.some(rId => member.roles.cache.has(rId));
}

// Manipulador de Mensagens
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  // =========================================================
  // COMANDOS COM PREFIXO "!" (FREE AGENCY)
  // =========================================================
  if (message.content.startsWith('!')) {
    const argsFA = message.content.slice(1).trim().split(/ +/);
    const commandFA = argsFA.shift().toLowerCase();

    if (commandFA === 'freeagency' || commandFA === 'fa') {
      const marketMsg = argsFA.join(' ');
      if (!marketMsg) return message.reply('❌ Insere a tua mensagem. Ex: `!freeagency Procuro time de atacante`');

      const faChannel = message.guild.channels.cache.get(db.faChannelId);
      if (!faChannel) {
        return message.reply('❌ Canal de Free Agency não configurado pela administração! (Use `%setfachannel #canal`)');
      }

      const embed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle('🏆 Free Agency')
        .setDescription(`<@${message.member.id}>\n${message.author.username}\n(${message.author.id})\n\n${marketMsg}`)
        .setThumbnail(message.author.displayAvatarURL({ dynamic: true, size: 256 }))
        .setTimestamp();

      await faChannel.send({ embeds: [embed] });
      return message.reply('✅ O teu anúncio de Free Agent foi enviado com sucesso no canal de Free Agency!');
    }
  }

  // =========================================================
  // COMANDOS COM PREFIXO "%" (LIGA E GESTÃO)
  // =========================================================
  if (!message.content.startsWith('%')) return;

  const args = message.content.slice(1).trim().split(/ +/);
  const command = args.shift().toLowerCase();
  const member = message.member;
  const guild = message.guild;

  // ---------------------------------------------------------
  // 1. CONFIGURAÇÕES DA LIGA (APENAS ADMINS)
  // ---------------------------------------------------------
  if (['abrirjanela', 'fecharjanela', 'setmarketchannel', 'setfachannel', 'setrosterlimit', 'setownercargos', 'addteam', 'addteams', 'removeteam'].includes(command)) {
    if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply('❌ Apenas Administradores podem usar este comando.');
    }

    if (command === 'abrirjanela') {
      db.marketOpen = true;
      saveDatabase();
      return message.reply('🔓 **Janela de transferências ABERTA com sucesso!**');
    }

    if (command === 'fecharjanela') {
      db.marketOpen = false;
      saveDatabase();
      return message.reply('🔒 **Janela de transferências FECHADA!**');
    }

    if (command === 'setmarketchannel') {
      const channel = message.mentions.channels.first();
      if (!channel) return message.reply('❌ Menciona um canal válido. Ex: `%setmarketchannel #transfer-market`');
      db.marketChannelId = channel.id;
      saveDatabase();
      return message.reply(`✅ Canal de anúncios de transferências definido para: ${channel}`);
    }

    if (command === 'setfachannel') {
      const channel = message.mentions.channels.first();
      if (!channel) return message.reply('❌ Menciona um canal válido. Ex: `%setfachannel #free-agency`');
      db.faChannelId = channel.id;
      saveDatabase();
      return message.reply(`✅ Canal de Free Agency definido para: ${channel}`);
    }

    if (command === 'setrosterlimit') {
      const limit = parseInt(args[0]);
      if (isNaN(limit)) return message.reply('❌ Insere um número válido. Ex: `%setrosterlimit 20`');
      db.rosterLimit = limit;
      saveDatabase();
      return message.reply(`✅ Limite de elenco (Roster Cap) definido para **${limit}**.`);
    }

    if (command === 'setownercargos') {
      const roles = message.mentions.roles.map(r => r.id);
      if (roles.length === 0) return message.reply('❌ Menciona pelo menos um cargo. Ex: `%setownercargos @ClubOwner @Assistant`');
      db.ownerRoleIds = roles;
      saveDatabase();
      return message.reply('✅ Cargos de gestão configurados com sucesso!');
    }

    if (command === 'addteam') {
      const role = message.mentions.roles.first();
      const emoji = args[1];

      if (!role || !emoji) {
        return message.reply('❌ Uso correto: `%addteam @CargoDoTime :emoji:`');
      }

      db.teams = db.teams.filter(t => t.roleId !== role.id);
      db.teams.push({ roleId: role.id, emoji });
      saveDatabase();

      return message.reply(`✅ Time ${role} adicionado com sucesso com o emoji ${emoji}! (Total de times: ${db.teams.length})`);
    }

    if (command === 'addteams') {
      const lines = message.content.split('\n');
      let adicionados = 0;

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const roleMentionMatch = line.match(/<@&(\d+)>/);
        const parts = line.split(/ +/);
        const emoji = parts.find(p => p.includes(':') || /\p{Extended_Pictographic}/u.test(p));

        if (roleMentionMatch && emoji) {
          const roleId = roleMentionMatch[1];
          db.teams = db.teams.filter(t => t.roleId !== roleId);
          db.teams.push({ roleId, emoji });
          adicionados++;
        }
      }

      if (adicionados === 0) {
        return message.reply('❌ Nenhum time válido encontrado. Exemplo de uso:\n`%addteams`\n`@Time1 :emoji1:`\n`@Time2 :emoji2:`');
      }

      saveDatabase();
      return message.reply(`✅ **${adicionados}** time(s) cadastrado(s) com sucesso! Total de times na liga: **${db.teams.length}**.`);
    }

    if (command === 'removeteam') {
      const role = message.mentions.roles.first();
      if (!role) return message.reply('❌ Menciona o cargo do time a remover. Ex: `%removeteam @Time`');
      db.teams = db.teams.filter(t => t.roleId !== role.id);
      saveDatabase();
      return message.reply(`🗑️ Time ${role} removido do sistema.`);
    }
  }

  // ---------------------------------------------------------
  // 2. VALIDAÇÃO DE JANELA FECHADA
  // ---------------------------------------------------------
  if (['sign', 'release', 'demand'].includes(command) && !db.marketOpen) {
    return message.reply('🔒 **Mercado Fechado!**\nA janela de transferências está fechada no momento. Aguarde a abertura oficial da administração.');
  }

  // ---------------------------------------------------------
  // 3. COMANDO %sign (Contratar via DM)
  // ---------------------------------------------------------
  if (command === 'sign') {
    if (!isCoach(member)) {
      return message.reply('❌ Apenas membros com cargo de **Club Owner** ou **Assistant** podem fazer ofertas.');
    }

    const team = getUserTeam(member);
    if (!team) {
      return message.reply('❌ Você não pertence a nenhum time cadastrado no bot.');
    }

    const targetUser = message.mentions.users.first();
    if (!targetUser) {
      return message.reply('❌ Menciona o jogador que pretendes contratar. Ex: `%sign @Jogador`');
    }

    const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
    if (!targetMember || targetUser.bot) {
      return message.reply('❌ Jogador inválido.');
    }

    if (getUserTeam(targetMember)) {
      return message.reply(`⚠️ O jogador ${targetUser} já pertence a uma equipe!`);
    }

    const teamRole = guild.roles.cache.get(team.roleId);
    const currentRosterCount = teamRole ? teamRole.members.size : 0;

    if (currentRosterCount >= db.rosterLimit) {
      return message.reply(`🔋 **Elenco Cheio!** O time já possui **${currentRosterCount}/${db.rosterLimit}** jogadores.`);
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('accept_offer').setLabel('Aceitar').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('decline_offer').setLabel('Recusar').setStyle(ButtonStyle.Danger)
    );

    try {
      const dmMsg = await targetUser.send({
        content: `📝 Olá ${targetUser}, você recebeu uma proposta oficial de contrato para entrar no time **${teamRole.name}** (${team.emoji}) enviada pelo coach **${member.user.username}** no servidor **${guild.name}**!`,
        components: [row]
      });

      await message.reply(`📩 Proposta enviada com sucesso no privado (DM) de ${targetUser}!`);

      const collector = dmMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 86400000 });

      collector.on('collect', async i => {
        await i.deferUpdate().catch(() => {});

        if (i.customId === 'decline_offer') {
          await dmMsg.edit({ content: `❌ Você recusou a proposta do **${teamRole.name}**.`, components: [] }).catch(() => {});
          await message.channel.send(`❌ ${targetUser} recusou a proposta do **${teamRole.name}**.`).catch(() => {});
          return;
        }

        if (i.customId === 'accept_offer') {
          if (!db.marketOpen) {
            return targetUser.send('🔒 A janela de transferências fechou antes de você aceitar.').catch(() => {});
          }

          const currentSize = teamRole.members.size;
          if (currentSize >= db.rosterLimit) {
            return targetUser.send('🔋 O time atingiu o limite máximo de elenco antes de você aceitar.').catch(() => {});
          }

          await targetMember.roles.add(teamRole).catch(err => console.error('Erro ao dar cargo:', err));

          const newRosterCount = teamRole.members.size;
          const marketChannel = guild.channels.cache.get(db.marketChannelId);

          const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setAuthor({ name: guild.name, iconURL: guild.iconURL() })
            .setTitle('Offer Accepted')
            .setDescription(`<@${targetUser.id}> \`${targetUser.username}\` has accepted the offer to ${team.emoji} <@&${team.roleId}>`)
            .addFields(
              { name: ' ', value: `• 👤 **Coach** - <@${member.id}> \`${member.user.username}\`` },
              { name: ' ', value: `• 🔋 **Roster Cap** - \`${newRosterCount}/${db.rosterLimit}\`` }
            );

          if (marketChannel) {
            await marketChannel.send({ embeds: [embed] }).catch(() => {});
          }

          await dmMsg.edit({ content: `🎉 **Parabéns!** Você aceitou a proposta e agora faz parte do **${teamRole.name}**!`, components: [] }).catch(() => {});
        }
      });

    } catch (err) {
      return message.reply(`❌ Não foi possível enviar mensagem privada para ${targetUser}. O jogador precisa liberar as mensagens privadas (DMs) do servidor.`);
    }
  }

  // ---------------------------------------------------------
  // 4. COMANDO %release
  // ---------------------------------------------------------
  if (command === 'release') {
    if (!isCoach(member)) {
      return message.reply('❌ Apenas membros com cargo de **Club Owner** ou **Assistant** podem dispensar jogadores.');
    }

    const team = getUserTeam(member);
    if (!team) {
      return message.reply('❌ Você não pertence a nenhum time cadastrado.');
    }

    const targetUser = message.mentions.users.first();
    if (!targetUser) {
      return message.reply('❌ Menciona o jogador que pretendes dispensar. Ex: `%release @Jogador`');
    }

    const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
    if (!targetMember || !targetMember.roles.cache.has(team.roleId)) {
      return message.reply('❌ O jogador informado não pertence ao seu time.');
    }

    const teamRole = guild.roles.cache.get(team.roleId);
    await targetMember.roles.remove(teamRole);

    const newRosterCount = teamRole.members.size;
    const marketChannel = guild.channels.cache.get(db.marketChannelId);

    const embed = new EmbedBuilder()
      .setColor(0x888888)
      .setAuthor({ name: guild.name, iconURL: guild.iconURL() })
      .setTitle('Player Released')
      .setDescription(`<@${targetUser.id}> \`${targetUser.username}\` has been released from ${team.emoji} <@&${team.roleId}>`)
      .addFields(
        { name: ' ', value: `• 👤 **Coach** - <@${member.id}> \`${member.user.username}\`` },
        { name: ' ', value: `• 🔋 **Roster Cap** - \`${newRosterCount}/${db.rosterLimit}\`` }
      );

    if (marketChannel) await marketChannel.send({ embeds: [embed] });

    return message.reply(`✅ ${targetUser} foi dispensado com sucesso.`);
  }

  // ---------------------------------------------------------
  // 5. COMANDO %demand
  // ---------------------------------------------------------
  if (command === 'demand') {
    const team = getUserTeam(member);
    if (!team) {
      return message.reply('❌ Você não pertence a nenhum time no momento.');
    }

    const teamRole = guild.roles.cache.get(team.roleId);
    await member.roles.remove(teamRole);

    const newRosterCount = teamRole.members.size;
    const marketChannel = guild.channels.cache.get(db.marketChannelId);

    const embed = new EmbedBuilder()
      .setColor(0xFFA500)
      .setAuthor({ name: guild.name, iconURL: guild.iconURL() })
      .setTitle('Contract Terminated')
      .setDescription(`<@${member.id}> \`${member.user.username}\` has demanded out of ${team.emoji} <@&${team.roleId}>`)
      .addFields(
        { name: ' ', value: `• 🔋 **Roster Cap** - \`${newRosterCount}/${db.rosterLimit}\`` }
      );

    if (marketChannel) await marketChannel.send({ embeds: [embed] });

    return message.reply(`✅ Você saiu do time **${teamRole.name}** e voltou a ser Free Agent!`);
  }

  // ---------------------------------------------------------
  // 6. COMANDO %roster
  // ---------------------------------------------------------
  if (command === 'roster') {
    const role = message.mentions.roles.first();
    if (!role) return message.reply('❌ Menciona o cargo do time. Ex: `%roster @Sport Recife`');

    const members = role.members.map(m => `• <@${m.id}> (\`${m.user.username}\`)`).join('\n') || '*Nenhum jogador no momento.*';

    const embed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle(`📋 Elenco - ${role.name}`)
      .setDescription(members)
      .addFields({ name: '🔋 Roster Cap', value: `\`${role.members.size}/${db.rosterLimit}\`` });

    return message.reply({ embeds: [embed] });
  }

  // ---------------------------------------------------------
  // 7. COMANDO %teams OU %times (Listar todos os times)
  // ---------------------------------------------------------
  if (command === 'teams' || command === 'times') {
    if (db.teams.length === 0) {
      return message.reply('📋 Nenhum time cadastrado no momento.');
    }

    const lista = db.teams.map((t, index) => {
      const role = guild.roles.cache.get(t.roleId);
      const nomeCargo = role ? `<@&${t.roleId}>` : 'Cargo não encontrado';
      return `${index + 1}. ${t.emoji} ${nomeCargo}`;
    }).join('\n');

    const embed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle('🏆 Times Cadastrados na Liga')
      .setDescription(lista)
      .setFooter({ text: `Total de equipes: ${db.teams.length}` });

    return message.reply({ embeds: [embed] });
  }
});

// Autenticação
const token = process.env.TOKEN ? process.env.TOKEN.trim() : null;
if (token) {
  client.login(token).catch(err => console.error('[ERRO DISCORD LOGIN]:', err.message));
}
