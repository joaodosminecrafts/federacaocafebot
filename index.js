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
const path = require('path');

// Ajusta o dispatcher global HTTP para evitar bloqueios de socket/timeout do Render
setGlobalDispatcher(new Agent({ connect: { timeout: 60000 } }));

const app = express();
const PORT = process.env.PORT || 10000;

app.get('/', (req, res) => res.send('Bot de Notificação e Liga Online!'));
app.listen(PORT, () => console.log(`[Express] Servidor ativo na porta ${PORT}`));

// Configuração de Persistência com a Lista Completa de Todos os Times
const DB_PATH = path.join(__dirname, 'league_config.json');

const DEFAULT_TEAMS = [
  // First Division
  { roleId: '1564789698206105710', emoji: '<:LDU:1564774805000028200>' },
  { roleId: '1564785716544798840', emoji: '<:ATL:1564783248045899919>' },
  { roleId: '1564786818908422296', emoji: '<:BOT:1564775109930123284>' },
  { roleId: '1564786169970032780', emoji: '<:SAN:1564775453905129563>' },
  { roleId: '1564785981121626263', emoji: '<:FLA:1564775631441629204>' },
  { roleId: '1564785871188795452', emoji: '<:PAL:1564780090271731792>' },
  { roleId: '1564787632259473418', emoji: '<:BOC:1564780041076867192>' },
  { roleId: '1564787003944341554', emoji: '<:RIV:1564783161060098169>' },
  { roleId: '1564789215139594461', emoji: '<:BAR:1564783200096624660>' },
  { roleId: '1566819434943873034', emoji: '<:FLU:1560387904792961106>' },

  // Second Division
  { roleId: '1564786340976005302', emoji: '<:INT:1564774876743602318>' },
  { roleId: '1564787980995133630', emoji: '<:COL:1564775004585992332>' },
  { roleId: '1564786650893258902', emoji: '<:VAS:1564783286843088978>' },
  { roleId: '1564786498123866366', emoji: '<:NAC:1564775403753701406>' },
  { roleId: '1564786209216135289', emoji: '<:SAO:1564775509139918858>' },
  { roleId: '1564785794961383606', emoji: '<:COR:1564775743399927898>' },
  { roleId: '1564787552240541777', emoji: '<:PEN:1564784455980159037>' },
  { roleId: '1564786436539154574', emoji: '<:GRE:1564775847385108490>' },

  // Third Division
  { roleId: '1564789481452863640', emoji: '<:ARG:1564779767796994109>' },
  { roleId: '1564786079452766248', emoji: '<:SPOR:1564774740474990643>' },
  { roleId: '1564788212193435768', emoji: '<:CER:1564779984424411486>' },
  { roleId: '1564787179698528358', emoji: '<:UNV:1564779922872860893>' },
  { roleId: '1564788393756467350', emoji: '<:ALL:1564779850143637564>' },
  { roleId: '1564787319850934372', emoji: '<:EST:1564775346300264538>' },
  { roleId: '1564787439585726565', emoji: '<:LAN:1564775555096645733>' },
  { roleId: '1565211049618309191', emoji: '<:BOL:1565211446902526103>' },

  // Champions League
  { roleId: '1566286333637562419', emoji: '<:RMA:1566280843985420338>' },
  { roleId: '1566286621425541270', emoji: '<:BAR:1566279808277553232>' },
  { roleId: '1566286802527060058', emoji: '<:PSG:1566282052561674270>' },
  { roleId: '1566286996287000586', emoji: '<:ARS:1566279585820180500>' },
  { roleId: '1566287128982327306', emoji: '<:CITY:1566280933496324096>' },
  { roleId: '1566287273157337148', emoji: '<:MAN:1566280260864049213>' },
  { roleId: '1566287470046347344', emoji: '<:BAY:1566279844105297940>' },
  { roleId: '1566287719124967474', emoji: '<:AMI:1566282529240125581>' },
  { roleId: '1566287936993890354', emoji: '<:INT:1566280059214372865>' },
  { roleId: '1566288125976649889', emoji: '<:POR:1566280308125339849>' },
  { roleId: '1566288328813449246', emoji: '<:SPO:1566280895499993271>' },
  { roleId: '1566288589505953842', emoji: '<:AST:1566279711888384040>' },
  { roleId: '1566288786160361583', emoji: '<:BOR:1566279878058446939>' },
  { roleId: '1566288909481017354', emoji: '<:GAL:1566281432261730335>' },
  { roleId: '1566289147348656218', emoji: '<:LILL:1566281471889645698>' },
  { roleId: '1566289297156603924', emoji: '<:LVP:1566281511622287440>' }
];

let db = {
  marketOpen: true,
  marketChannelId: '', 
  faChannelId: '', 
  blacklistChannelId: '', 
  commandsChannelId: '', 
  rosterLimit: 20,
  ownerRoleIds: [], 
  teams: DEFAULT_TEAMS
};

function loadDatabase() {
  if (fs.existsSync(DB_PATH)) {
    try {
      const data = fs.readFileSync(DB_PATH, 'utf-8');
      const parsed = JSON.parse(data);
      db = { ...db, ...parsed };
      if (!db.teams || db.teams.length === 0) db.teams = DEFAULT_TEAMS;
      console.log(`[DB] Dados carregados com sucesso! Times registrados: ${db.teams.length}`);
    } catch (e) {
      console.error('[DB] Erro ao ler JSON, restaurando padrões...', e.message);
      db.teams = DEFAULT_TEAMS;
      saveDatabase();
    }
  } else {
    console.log('[DB] league_config.json não encontrado. Criando novo com times padrão...');
    saveDatabase();
  }
}

function saveDatabase() {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
    console.log(`[DB] Dados salvos com sucesso! Total de times guardados: ${db.teams.length}`);
  } catch (e) {
    console.error('[DB] Erro ao salvar dados:', e.message);
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

function getUserTeam(member) {
  return db.teams.find(t => member.roles.cache.has(t.roleId));
}

function isCoach(member) {
  if (member.permissions.has(PermissionsBitField.Flags.Administrator)) return true;
  return db.ownerRoleIds.some(rId => member.roles.cache.has(rId));
}

function isStaffOrOwner(member) {
  if (member.permissions.has(PermissionsBitField.Flags.Administrator)) return true;
  const staffRoleId = '1527141858239709234';
  const ownerRoleId = '1526639797920075936';
  return member.roles.cache.has(staffRoleId) || member.roles.cache.has(ownerRoleId);
}

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  const isCmdPercent = message.content.startsWith('%');
  const isCmdExclamation = message.content.startsWith('!');

  if (!isCmdPercent && !isCmdExclamation) return;

  const argsCheck = message.content.slice(1).trim().split(/ +/);
  const cmdCheck = argsCheck.shift().toLowerCase();
  
  const isAdminOrStaffCmd = ['setcommandschannel', 'setmarketchannel', 'setfachannel', 'setblacklistchannel', 'black', 'unblack', 'warn'].includes(cmdCheck);

  if (db.commandsChannelId && message.channel.id !== db.commandsChannelId && !isAdminOrStaffCmd) {
    const targetChannel = message.guild.channels.cache.get(db.commandsChannelId);
    const channelMention = targetChannel ? `${targetChannel}` : 'no canal correto';

    const tempMsg = await message.reply(`⚠️ Você só pode usar comandos em ${channelMention}!`);
    
    setTimeout(() => {
      message.delete().catch(() => {});
      tempMsg.delete().catch(() => {});
    }, 5000);
    return;
  }

  if (isCmdExclamation) {
    const argsFA = message.content.slice(1).trim().split(/ +/);
    const commandFA = argsFA.shift().toLowerCase();

    if (commandFA === 'freeagency' || commandFA === 'fa') {
      const marketMsg = argsFA.join(' ');
      if (!marketMsg) return message.reply('❌ Digite a sua mensagem. Ex: `!freeagency Procuro time de atacante`');

      const faChannel = message.guild.channels.cache.get(db.faChannelId);
      if (!faChannel) {
        return message.reply('❌ Canal de Free Agency não configurado! (Use `%setfachannel #canal`)');
      }

      const embed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle('🏆 Free Agency')
        .setDescription(`<@${message.member.id}>\n${message.author.username}\n(${message.author.id})\n\n${marketMsg}`)
        .setThumbnail(message.author.displayAvatarURL({ dynamic: true, size: 256 }))
        .setTimestamp();

      await faChannel.send({ embeds: [embed] });
      return message.reply('✅Seu anúncio de Free Agent foi enviado com sucesso!');
    }
  }

  const args = message.content.slice(1).trim().split(/ +/);
  const command = args.shift().toLowerCase();
  const member = message.member;
  const guild = message.guild;

  if (['abrirjanela', 'fecharjanela', 'setmarketchannel', 'setfachannel', 'setblacklistchannel', 'setcommandschannel', 'setrosterlimit', 'setownercargos', 'addteam', 'addteams', 'removeteam', 'black', 'unblack', 'warn'].includes(command)) {
    
    if (!member.permissions.has(PermissionsBitField.Flags.Administrator) && !isStaffOrOwner(member)) {
      return message.reply('❌ Apenas Administradores ou membros da Staff/Donos podem usar este comando.');
    }

    if (command === 'setcommandschannel') {
      const channel = message.mentions.channels.first();
      if (!channel) return message.reply('❌ Mencione um canal válido. Ex: `%setcommandschannel #bot-commands`');
      db.commandsChannelId = channel.id;
      saveDatabase();
      return message.reply(`✅ Canal principal para comandos definido para: ${channel}`);
    }

    if (command === 'abrirjanela') {
      db.marketOpen = true;
      saveDatabase();
      return message.reply('🔓 **Janela de transferências ABERTA!**');
    }

    if (command === 'fecharjanela') {
      db.marketOpen = false;
      saveDatabase();
      return message.reply('🔒 **Janela de transferências FECHADA!**');
    }

    if (command === 'setmarketchannel') {
      const channel = message.mentions.channels.first();
      if (!channel) return message.reply('❌ Mencione um canal válido. Ex: `%setmarketchannel #transfer-market`');
      db.marketChannelId = channel.id;
      saveDatabase();
      return message.reply(`✅ Canal de transferências definido para: ${channel}`);
    }

    if (command === 'setfachannel') {
      const channel = message.mentions.channels.first();
      if (!channel) return message.reply('❌ Mencione um canal válido. Ex: `%setfachannel #free-agency`');
      db.faChannelId = channel.id;
      saveDatabase();
      return message.reply(`✅ Canal de Free Agency definido para: ${channel}`);
    }

    if (command === 'setblacklistchannel') {
      const channel = message.mentions.channels.first();
      if (!channel) return message.reply('❌ Mencione um canal válido. Ex: `%setblacklistchannel #blacklists`');
      db.blacklistChannelId = channel.id;
      saveDatabase();
      return message.reply(`✅ Canal de Blacklists definido para: ${channel}`);
    }

    // COMANDO %black CORRIGIDO
    if (command === 'black') {
      let targetUser = message.mentions.users.first();
      if (!targetUser && args[0]) {
        const cleanId = args[0].replace(/[<@!>]/g, '');
        targetUser = await client.users.fetch(cleanId).catch(() => null);
      }

      if (!targetUser) {
        return message.reply('❌ Mencione o jogador corretamente. Ex: `%black @usuario Motivo Tempo Robux Pix`');
      }

      const nonMentionArgs = args.filter(a => !a.includes(targetUser.id) && !a.startsWith('<@'));
      if (nonMentionArgs.length < 3) {
        return message.reply('❌ Formato incorreto! Uso: `%black @docara Motivo... Tempo Robux Pix` (Ex: `%black @docara Racismo até a GW7 100 5`)');
      }

      const pixVal = nonMentionArgs.pop();
      const robuxVal = nonMentionArgs.pop();
      
      let remainingText = nonMentionArgs.join(' ');
      let tempoVal = '';
      let motivoVal = '';

      const tempoMatch = remainingText.match(/(até\s+.*|gw\d+|permanente|\d+\s*dias?)/i);

      if (tempoMatch) {
        tempoVal = tempoMatch[0];
        motivoVal = remainingText.replace(tempoMatch[0], '').trim();
      } else {
        const lastSpace = remainingText.lastIndexOf(' ');
        if (lastSpace !== -1) {
          motivoVal = remainingText.substring(0, lastSpace).trim();
          tempoVal = remainingText.substring(lastSpace + 1).trim();
        } else {
          motivoVal = remainingText;
          tempoVal = 'Não especificado';
        }
      }

      if (!motivoVal) motivoVal = 'Não especificado';

      const blacklistChannel = guild.channels.cache.get(db.blacklistChannelId);
      if (!blacklistChannel) {
        return message.reply('❌ Canal de Blacklist não configurado! Use `%setblacklistchannel #canal` primeiro.');
      }

      const robuxEmoji = '<:robux:1553191661545193603>';
      const pixEmoji = '<:pix:1560853388034445485>';

      const embed = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setDescription(
          `**Nick:** ${targetUser}\n` +
          `**Motivo:** ${motivoVal}\n` +
          `**Tempo:** ${tempoVal}\n` +
          `**Bail:** ${robuxVal} ${robuxEmoji} ${pixVal} ${pixEmoji}`
        )
        .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }))
        .setFooter({ 
          text: 'Prezando por uma comunidade melhor.', 
          iconURL: guild.iconURL({ dynamic: true, size: 128 }) 
        });

      const attachment = message.attachments.first();
      if (attachment && attachment.contentType && attachment.contentType.startsWith('image/')) {
        embed.setImage(attachment.url);
      }

      await blacklistChannel.send({ embeds: [embed] });

      try {
        await guild.members.ban(targetUser.id, { 
          deleteMessageSeconds: 3600, 
          reason: `Blacklist: ${motivoVal} | Aplicado por: ${message.author.tag}` 
        });
        return message.reply(`✅ Registrado em ${blacklistChannel} e **${targetUser.tag} foi banido**!`);
      } catch (err) {
        console.error('Erro ao banir membro:', err);
        return message.reply(`✅ Registrado em ${blacklistChannel}, mas ⚠️ **não foi possível banir o usuário** (verifique os cargos).`);
      }
    }

    // COMANDO %unblack CORRIGIDO
    if (command === 'unblack') {
      let targetUser = message.mentions.users.first();
      if (!targetUser && args[0]) {
        const cleanId = args[0].replace(/[<@!>]/g, '');
        targetUser = await client.users.fetch(cleanId).catch(() => null);
      }

      if (!targetUser) {
        return message.reply('❌ Mencione o jogador. Ex: `%unblack @docarabanido C Pagou`');
      }

      const nonMentionArgs = args.filter(a => !a.includes(targetUser.id) && !a.startsWith('<@'));
      if (nonMentionArgs.length < 2) {
        return message.reply('❌ Formato incorreto! Uso: `%unblack @usuario [C/F] [Estado]` (Ex: `%unblack @docarabanido C Pagou`)');
      }

      const statusLetter = nonMentionArgs.shift().toUpperCase();
      const statusText = nonMentionArgs.join(' ');

      const blacklistChannel = guild.channels.cache.get(db.blacklistChannelId);
      if (!blacklistChannel) {
        return message.reply('❌ Canal de Blacklist não configurado! Use `%setblacklistchannel #canal` primeiro.');
      }

      let emojiStatus = '';
      let estadoFinal = '';

      if (statusLetter === 'C') {
        emojiStatus = '✅';
        estadoFinal = statusText.toLowerCase() === 'pagou' ? 'Retirada.' : statusText;
      } else {
        emojiStatus = '❌';
        estadoFinal = statusText;
      }

      const embed = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setTitle('☕ | Ban Appeal')
        .setDescription(
          `**Usuário:** ${targetUser.username}\n` +
          `**Estado:** ${emojiStatus} ${estadoFinal}`
        )
        .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }))
        .setFooter({ 
          text: 'Prezando por uma comunidade melhor.', 
          iconURL: guild.iconURL({ dynamic: true, size: 128 }) 
        });

      await blacklistChannel.send({ embeds: [embed] });

      if (statusLetter === 'C') {
        try {
          await guild.members.unban(targetUser.id, `Ban Appeal Aprovada: ${estadoFinal}`);
          return message.reply(`✅ Apelação registrada em ${blacklistChannel} e **${targetUser.tag} foi desbanido** com sucesso!`);
        } catch (err) {
          console.error('Erro ao desbanir membro:', err);
          return message.reply(`✅ Apelação registrada em ${blacklistChannel}, mas ⚠️ **não foi possível desbanir o usuário** (ele pode já não estar banido).`);
        }
      } else {
        return message.reply(`✅ Apelação registrada (Negada) em ${blacklistChannel}!`);
      }
    }

    // NOVO COMANDO %warn
    if (command === 'warn') {
      const targetUser = message.mentions.users.first();
      if (!targetUser) {
        return message.reply('❌ Mencione o usuário. Ex: `%warn @usuario Motivo da punição`');
      }

      const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
      if (!targetMember) {
        return message.reply('❌ Usuário não encontrado no servidor.');
      }

      const reason = args.slice(1).join(' ') || 'Não especificado';

      const roleWarn1 = '1562209075968745523';
      const roleWarn2 = '1562209264569688215';
      const roleWarn3 = '1562209385822949478';

      const hasWarn1 = targetMember.roles.cache.has(roleWarn1);
      const hasWarn2 = targetMember.roles.cache.has(roleWarn2);
      const hasWarn3 = targetMember.roles.cache.has(roleWarn3);

      if (hasWarn3) {
        return message.reply(`⚠️ O usuário ${targetUser} **já possui Warn 3** e não pode receber mais advertências por este comando.`);
      }

      try {
        if (hasWarn2) {
          // Já tem Warn 2 -> Sobe para Warn 3 e Mute de 1 semana
          await targetMember.roles.remove(roleWarn2);
          await targetMember.roles.add(roleWarn3);
          await targetMember.timeout(7 * 24 * 60 * 60 * 1000, `Warn 3: ${reason}`);
          return message.reply(`✅ ${targetUser} recebeu **Warn 3** (<@&${roleWarn3}>) e foi mutado por **1 semana**. Motivo: *${reason}*`);
        } 
        
        if (hasWarn1) {
          // Já tem Warn 1 -> Sobe para Warn 2 e Mute de 1 dia
          await targetMember.roles.remove(roleWarn1);
          await targetMember.roles.add(roleWarn2);
          await targetMember.timeout(24 * 60 * 60 * 1000, `Warn 2: ${reason}`);
          return message.reply(`✅ ${targetUser} recebeu **Warn 2** (<@&${roleWarn2}>) e foi mutado por **1 dia**. Motivo: *${reason}*`);
        } 
        
        // Não tem nenhum warn -> Recebe Warn 1 e Mute de 1 hora
        await targetMember.roles.add(roleWarn1);
        await targetMember.timeout(60 * 60 * 1000, `Warn 1: ${reason}`);
        return message.reply(`✅ ${targetUser} recebeu **Warn 1** (<@&${roleWarn1}>) e foi mutado por **1 hora**. Motivo: *${reason}*`);

      } catch (err) {
        console.error('Erro ao aplicar warn/mute:', err);
        return message.reply('❌ Ocorreu um erro ao aplicar os cargos ou o mute. Verifique se o bot tem permissão superior ao usuário.');
      }
    }

    if (command === 'setrosterlimit') {
      const limit = parseInt(args[0]);
      if (isNaN(limit)) return message.reply('❌ Digite um número válido. Ex: `%setrosterlimit 20`');
      db.rosterLimit = limit;
      saveDatabase();
      return message.reply(`✅ Limite de elenco definido para **${limit}**.`);
    }

    if (command === 'setownercargos') {
      const roles = message.mentions.roles.map(r => r.id);
      if (roles.length === 0) return message.reply('❌ Mencione pelo menos um cargo.');
      db.ownerRoleIds = roles;
      saveDatabase();
      return message.reply('✅ Cargos de gestão configurados!');
    }

    if (command === 'addteam') {
      const role = message.mentions.roles.first();
      const emoji = args[1];

      if (!role || !emoji) return message.reply('❌ Uso correto: `%addteam @CargoDoTime :emoji:`');

      db.teams = db.teams.filter(t => t.roleId !== role.id);
      db.teams.push({ roleId: role.id, emoji });
      saveDatabase();
      return message.reply(`✅ Time ${role} adicionado com o emoji ${emoji}!`);
    }

    if (command === 'addteams') {
      const lines = message.content.split('\n');
      let adicionados = 0;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || line.startsWith('%addteams')) continue;

        const roleMentionMatch = line.match(/<@&(\d+)>/);
        const customEmojiMatch = line.match(/<a?:\w+:\d+>/);
        const parts = line.split(/ +/);
        const standardEmoji = parts.find(p => (p.includes(':') && !p.startsWith('<@&')) || /\p{Extended_Pictographic}/u.test(p));
        
        const emoji = customEmojiMatch ? customEmojiMatch[0] : standardEmoji;

        if (roleMentionMatch && emoji) {
          const roleId = roleMentionMatch[1];
          db.teams = db.teams.filter(t => t.roleId !== roleId);
          db.teams.push({ roleId, emoji });
          adicionados++;
        }
      }

      if (adicionados === 0) return message.reply('❌ Nenhum time válido encontrado.');

      saveDatabase();
      return message.reply(`✅ **${adicionados}** time(s) cadastrado(s)! Total: **${db.teams.length}**.`);
    }

    if (command === 'removeteam') {
      const role = message.mentions.roles.first();
      if (!role) return message.reply('❌ Mencione o cargo do time a remover.');
      db.teams = db.teams.filter(t => t.roleId !== role.id);
      saveDatabase();
      return message.reply(`🗑️ Time ${role} removido.`);
    }
  }

  // VALIDAÇÃO DE MERCADO
  if (['sign', 'release', 'demand'].includes(command) && !db.marketOpen) {
    return message.reply('🔒 **Mercado Fechado!**');
  }

  // COMANDO %sign
  if (command === 'sign') {
    if (!isCoach(member)) return message.reply('❌ Apenas Coaches/Owners podem fazer ofertas.');

    const team = getUserTeam(member);
    if (!team) return message.reply('❌ Você não pertence a nenhum time cadastrado.');

    const targetUser = message.mentions.users.first();
    if (!targetUser) return message.reply('❌ Mencione o jogador que deseja contratar.');

    const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
    if (!targetMember || targetUser.bot) return message.reply('❌ Jogador inválido.');

    if (getUserTeam(targetMember)) return message.reply(`⚠️ O jogador ${targetUser} já pertence a uma equipe!`);

    const teamRole = guild.roles.cache.get(team.roleId);
    const currentRosterCount = teamRole ? teamRole.members.size : 0;

    if (currentRosterCount >= db.rosterLimit) {
      return message.reply(`🔋 **Elenco Cheio!** (${currentRosterCount}/${db.rosterLimit})`);
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('accept_offer').setLabel('Aceitar').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('decline_offer').setLabel('Recusar').setStyle(ButtonStyle.Danger)
    );

    try {
      const dmMsg = await targetUser.send({
        content: `📝 Olá ${targetUser}, você recebeu uma proposta oficial para entrar no **${teamRole.name}** (${team.emoji}) enviada por **${member.user.username}**!`,
        components: [row]
      });

      await message.reply(`📩 Proposta enviada no privado de ${targetUser}!`);

      const collector = dmMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 86400000 });

      collector.on('collect', async i => {
        await i.deferUpdate().catch(() => {});

        if (i.customId === 'decline_offer') {
          await dmMsg.edit({ content: `❌ Você recusou a proposta do **${teamRole.name}**.`, components: [] }).catch(() => {});
          await message.channel.send(`❌ ${targetUser} recusou a proposta do **${teamRole.name}**.`).catch(() => {});
          return;
        }

        if (i.customId === 'accept_offer') {
          if (!db.marketOpen) return targetUser.send('🔒 A janela fechou antes de você aceitar.').catch(() => {});
          if (teamRole.members.size >= db.rosterLimit) return targetUser.send('🔋 O time lotou antes de você aceitar.').catch(() => {});

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

          if (marketChannel) await marketChannel.send({ embeds: [embed] }).catch(() => {});

          await dmMsg.edit({ content: `🎉 **Parabéns!** Você aceitou a proposta e agora é do **${teamRole.name}**!`, components: [] }).catch(() => {});
        }
      });

    } catch (err) {
      return message.reply(`❌ Não foi possível enviar DM para ${targetUser}. O jogador precisa liberar as mensagens privadas.`);
    }
  }

  // COMANDO %release
  if (command === 'release') {
    if (!isCoach(member)) return message.reply('❌ Apenas Coaches/Owners podem dispensar.');

    const team = getUserTeam(member);
    if (!team) return message.reply('❌ Você não pertence a nenhum time cadastrado.');

    const targetUser = message.mentions.users.first();
    if (!targetUser) return message.reply('❌ Mencione o jogador a dispensar.');

    const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
    if (!targetMember || !targetMember.roles.cache.has(team.roleId)) {
      return message.reply('❌ O jogador não pertence ao seu time.');
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

  // COMANDO %demand
  if (command === 'demand') {
    const team = getUserTeam(member);
    if (!team) return message.reply('❌ Você não pertence a nenhum time.');

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

  // COMANDO %roster
  if (command === 'roster') {
    const role = message.mentions.roles.first();
    if (!role) return message.reply('❌ Mencione o cargo do time. Ex: `%roster @Time`');

    await guild.members.fetch();

    const members = role.members.map(m => `• <@${m.id}> (\`${m.user.username}\`)`).join('\n') || '*Nenhum jogador no momento.*';

    const embed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle(`📋 Elenco - ${role.name}`)
      .setDescription(members)
      .addFields({ name: '🔋 Roster Cap', value: `\`${role.members.size}/${db.rosterLimit}\`` });

    return message.reply({ embeds: [embed] });
  }

  // COMANDO %teams
  if (command === 'teams' || command === 'times') {
    if (db.teams.length === 0) return message.reply('📋 Nenhum time cadastrado.');

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
