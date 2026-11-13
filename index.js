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

// Ajusta o dispatcher global HTTP para evitar bloqueios de socket/timeout
setGlobalDispatcher(new Agent({ connect: { timeout: 60000 } }));

const app = express();
const PORT = process.env.PORT || 10000;

app.get('/', (req, res) => res.send('Bot de Notificação e Liga Online!'));
app.listen(PORT, () => console.log(`[Express] Servidor ativo na porta ${PORT}`));

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

const activeSchedules = [];
const entrosarCooldowns = new Map(); 
const narratedGames = []; 

function loadDatabase() {
  if (fs.existsSync(DB_PATH)) {
    try {
      const data = fs.readFileSync(DB_PATH, 'utf-8');
      const parsed = JSON.parse(data);
      db = { ...db, ...parsed };
      if (!db.teams || db.teams.length === 0) db.teams = DEFAULT_TEAMS;
    } catch (e) {
      db.teams = DEFAULT_TEAMS;
      saveDatabase();
    }
  } else {
    saveDatabase();
  }
}

function saveDatabase() {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
  } catch (e) {}
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
  
  const adminAllowedRoles = [
    '1558230381868752906', // Staff Em Teste
    '1527141858239709234', // Staff
    '1526639797920075936'  // Dono / Outro cargo pré-existente
  ];

  return adminAllowedRoles.some(roleId => member.roles.cache.has(roleId));
}

function parseIntervalToMs(intervalStr) {
  const regex = /^(\d+)([mhd])$/i;
  const match = intervalStr.match(regex);
  if (match) {
    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    if (unit === 'm') return value * 60 * 1000;
    if (unit === 'h') return value * 60 * 60 * 1000;
    if (unit === 'd') return value * 24 * 60 * 60 * 1000;
  }
  const num = parseInt(intervalStr);
  if (!isNaN(num)) return num * 60 * 1000;
  return null;
}

client.on('messageCreate', async (message) => {
  // DETECTOR DE MENSAGEM INICIAL DO TICKET KING
  if (message.author.bot && message.channel.name && message.channel.name.toLowerCase().startsWith('ticket-')) {
    if (message.embeds.length > 0) {
      const embedDesc = (message.embeds[0].description || '').toLowerCase();
      const userMentionMatch = (message.embeds[0].description || '').match(/<@!?\d+>/);
      const userMention = userMentionMatch ? userMentionMatch[0] : '';

      if (embedDesc.includes('criou um novo ticket')) {
        if (embedDesc.includes('parceria')) {
          return message.channel.send(
            `${userMention} 👋 **Atenção antes de aguardar atendimento:**\n` +
            `📌 Envie agora o **texto da sua parceria** junto com o **link do seu servidor do Discord** (mínimo de 100 membros).`
          );
        } else if (embedDesc.includes('dúvida') || embedDesc.includes('duvida')) {
          return message.channel.send(
            `${userMention} 🤔 **Para agilizar o seu atendimento:**\n` +
            `📌 Escreva a sua **dúvida completa** logo abaixo. Não mande apenas "oi" ou "olá"!`
          );
        } else if (embedDesc.includes('denúncia') || embedDesc.includes('denuncia')) {
          return message.channel.send(
            `${userMention} 🚨 **Para validar a sua denúncia:**\n` +
            `📌 Envie o **ID/menção do acusado** e as **provas (prints ou vídeos)** agora mesmo.`
          );
        } else if (embedDesc.includes('inscrever') || embedDesc.includes('inscrição')) {
          return message.channel.send(
            `${userMention} Vagas fechadas!, não é possivel ownar, apenas é possível **pagar 5 reais ou 200 robux para Ficar na Fila De Espera pra próxima season ou para o próximo time que tomar Disband!**`
          );
        } else if (embedDesc.includes('compra')) {
          return message.channel.send(
            `${userMention} 🛒 **Atendimento de Compras:**\n` +
            `📌 Informe **qual produto/pacote deseja adquirir** e a **forma de pagamento** (Robux ou Pix).`
          );
        } else if (embedDesc.includes('transmissor') || embedDesc.includes('narrador')) {
          return message.channel.send(
            `${userMention}\n` +
            `☕| Narrador\n` +
            `- Sabe colocar placar na tela?\n` +
            `- Qual sua Plataforma?\n` +
            `- Como você transmite?\n` +
            `- Tem uma equipe?`
          );
        }
      }
    }
    return;
  }

  if (message.author.bot || !message.guild) return;
  const isCmdPercent = message.content.startsWith('%');
  const isCmdExclamation = message.content.startsWith('!');

  if (!isCmdPercent && !isCmdExclamation) return;

  const argsCheck = message.content.slice(1).trim().split(/ +/);
  const cmdCheck = argsCheck.shift().toLowerCase();
  const member = message.member;

  // COMANDO %narrar
  if (cmdCheck === 'narrar') {
    const targetNarrarChannel = '1553887041689751664';
    const allowedNarrarRole = '1527044059976175738';

    if (message.channel.id !== targetNarrarChannel) {
      const tempMsg = await message.reply(`⚠️ O comando \`%narrar\` só pode ser usado no canal <#${targetNarrarChannel}>!`);
      setTimeout(() => {
        message.delete().catch(() => {});
        tempMsg.delete().catch(() => {});
      }, 5000);
      return;
    }

    if (!member.roles.cache.has(allowedNarrarRole) && !member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply('❌ Apenas quem possui o cargo de Narrador pode usar este comando.');
    }

    if (argsCheck.length < 3) {
      return message.reply('❌ Formato incorreto! Uso: `%narrar :emoji1: :emoji2: NomeDaTransmissora`');
    }

    const emoji1 = argsCheck[0];
    const emoji2 = argsCheck[1];
    const transmissora = argsCheck.slice(2).join(' ');

    const matchKey = [emoji1, emoji2].sort().join('_VS_');

    if (narratedGames.some(g => g.matchKey === matchKey)) {
      return message.reply('⚠️ Esse jogo já vai ser narrado!');
    }

    const narrationId = Math.floor(1000 + Math.random() * 9000);

    narratedGames.push({
      id: narrationId,
      matchKey,
      emoji1,
      emoji2,
      transmissora,
      narratorId: member.id
    });

    const formattedMsg = 
      `## ☕ | BroadCaster 🎥\n` +
      `**Game: ( ${emoji1} ⚔️ ${emoji2} )**\n\n\n` +
      `**BroadCaster:** __${transmissora}__`;

    return message.channel.send(formattedMsg);
  }

  // COMANDO %listanarracoes
  if (cmdCheck === 'listanarracoes') {
    if (narratedGames.length === 0) {
      return message.reply('📋 Não há jogos registados para narração no momento.');
    }

    const lista = narratedGames.map(g => 
      `• **ID #${g.id}** -> ${g.emoji1} ⚔️ ${g.emoji2} | **${g.transmissora}** (<@${g.narratorId}>)`
    ).join('\n');

    const embed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle('🎙️ Jogos Agendados para Narração')
      .setDescription(lista);

    return message.reply({ embeds: [embed] });
  }

  // COMANDO %entrosar
  if (cmdCheck === 'entrosar') {
    const targetEntrosarChannel = '1526123188101320837';
    if (message.channel.id !== targetEntrosarChannel) {
      const tempMsg = await message.reply(`⚠️ O comando \`%entrosar\` só pode ser usado no canal <#${targetEntrosarChannel}>!`);
      setTimeout(() => {
        message.delete().catch(() => {});
        tempMsg.delete().catch(() => {});
      }, 5000);
      return;
    }

    const now = Date.now();
    const cooldownTime = 3 * 60 * 60 * 1000;
    if (entrosarCooldowns.has(member.id)) {
      const expirationTime = entrosarCooldowns.get(member.id) + cooldownTime;
      if (now < expirationTime) {
        const timeLeft = Math.ceil((expirationTime - now) / (60 * 1000));
        const hoursLeft = (timeLeft / 60).toFixed(1);
        return message.reply(`⏳ Calma aí! Você precisa esperar mais aprox. **${hoursLeft} horas** para usar o \`%entrosar\` novamente.`);
      }
    }

    entrosarCooldowns.set(member.id, now);

    const chance = Math.random();
    if (chance < 0.5) {
      return message.reply('✅ Permissão para entrosar liberada!');
    } else {
      return message.reply('⛔ Permissão para entrosar negada!');
    }
  }

  const isAdminOrStaffCmd = [
    'setcommandschannel', 'setmarketchannel', 'setfachannel', 'setblacklistchannel', 
    'black', 'unblack', 'warn', 'agendar', 'desagendar', 'listagendados', 'limparnarracoes', 'tutorial'
  ].includes(cmdCheck);

  if (db.commandsChannelId && message.channel.id !== db.commandsChannelId && !isAdminOrStaffCmd && !isStaffOrOwner(member)) {
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
      if (!faChannel) return message.reply('❌ Canal de Free Agency não configurado!');

      const embed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle('🏆 Free Agency')
        .setDescription(`<@${message.member.id}>\n${message.author.username}\n(${message.author.id})\n\n${marketMsg}`)
        .setThumbnail(message.author.displayAvatarURL({ dynamic: true, size: 256 }))
        .setTimestamp();

      await faChannel.send({ embeds: [embed] });
      return message.reply('✅ Seu anúncio de Free Agent foi enviado com sucesso!');
    }
  }

  const args = message.content.slice(1).trim().split(/ +/);
  const command = args.shift().toLowerCase();
  const guild = message.guild;

  const adminCommandsList = [
    'abrirjanela', 'fecharjanela', 'setmarketchannel', 'setfachannel', 
    'setblacklistchannel', 'setcommandschannel', 'setrosterlimit', 
    'setownercargos', 'addteam', 'addteams', 'removeteam', 
    'black', 'unblack', 'warn', 'agendar', 'desagendar', 'listagendados', 'limparnarracoes', 'tutorial'
  ];

  if (adminCommandsList.includes(command)) {
    
    if (!isStaffOrOwner(member)) {
      return message.reply('❌ Apenas Administradores, Staffs ou Donos podem usar este comando.');
    }

    // COMANDO %limparnarracoes
    if (command === 'limparnarracoes') {
      const idArg = args[0];
      if (!idArg) return message.reply('❌ Indique o ID da narração ou digite `tudo`. Ex: `%limparnarracoes #1234` ou `%limparnarracoes tudo`. Use `%listanarracoes` para ver os IDs.');

      if (idArg.toLowerCase() === 'tudo' || idArg.toLowerCase() === 'all') {
        narratedGames.length = 0;
        return message.reply('🗑️ Todas as narrações foram removidas da lista!');
      }

      const cleanId = parseInt(idArg.replace('#', ''));
      const index = narratedGames.findIndex(g => g.id === cleanId);
      if (index === -1) return message.reply(`❌ Narração #${cleanId} não encontrada.`);

      narratedGames.splice(index, 1);
      return message.reply(`🗑️ Narração **#${cleanId}** removida com sucesso!`);
    }

    // COMANDO %tutorial
    if (command === 'tutorial') {
      const embedTutorial = new EmbedBuilder()
        .setColor(0x00AE86)
        .setTitle('📚 Tutorial Completo - Federation Café Bot')
        .setDescription('Aqui está a lista de todos os comandos e funções do bot organizadas para a administração e gestão da liga:')
        .addFields(
          { name: '⚙️ Comandos de Configuração e Gestão', value: '• `%setcommandschannel #canal` - Define o canal exclusivo de comandos.\n• `%setmarketchannel #canal` - Define o canal de transferências/mercado.\n• `%setfachannel #canal` - Define o canal de Free Agency.\n• `%setblacklistchannel #canal` - Define o canal de blacklists.\n• `%abrirjanela` / `%fecharjanela` - Abre ou fecha o mercado de transferências.\n• `%setrosterlimit <número>` - Define o limite de jogadores por elenco.' },
          { name: '🛡️ Moderação, Punições e Blacklist', value: '• `%warn @usuario <motivo>` - Sistema progressivo (Warn 1: 1h mute | Warn 2: 1d mute + Cargo 2 | Warn 3: 1sem mute + Cargo 3).\n• `%black @usuario <motivo> <tempo> <robux> <pix>` - Regista blacklist, envia embed e bane o utilizador automaticamente.\n• `%unblack @usuario C <motivo>` - Regista apelação, desbane o utilizador caso aprovado.' },
          { name: '📅 Agendamento de Mensagens', value: '• `%agendar #canal <mensagem> <tempoInício> <intervalo>` - Agenda mensagens recorrentes (ex: `0` para agora e `30m` para repetir).\n• `%listagendados` - Lista todos os agendamentos ativos e IDs.\n• `%desagendar <#ID>` - Cancela e remove um agendamento.' },
          { name: '⚽ Gestão de Times e Elencos', value: '• `%teams` - Mostra a lista completa de todos os times e emojis registados.\n• `%roster @CargoDoTime` - Mostra os jogadores alocados num time.\n• `%addteam @Cargo :emoji:` / `%addteams` - Regista novos times na base de dados.' },
          { name: '🔄 Comandos de Mercado (Coaches/Jogadores)', value: '• `%sign @jogador` - Envia proposta no privado do jogador (com botões de aceitar/recusar).\n• `%release @jogador` - Dispensa o jogador do seu time.\n• `%demand` - Permite ao jogador sair voluntariamente do time atual.\n• `!freeagency <mensagem>` (ou `!fa`) - Publica anúncio de Free Agent no canal configurado.' },
          { name: '🎙️ Transmissões e Outros', value: '• `%narrar :emoji1: :emoji2: Transmissora` - Reserva e anuncia a transmissão de um jogo (cargo <@&1527044059976175738> no canal <#1553887041689751664>).\n• `%listanarracoes` - Lista todos os jogos agendados para narração e os seus IDs (todos podem usar).\n• `%limparnarracoes <#ID ou tudo>` - Remove uma narração pelo ID ou limpa todas (apenas Admin/Staff).\n• `%entrosar` - Comando divertido (50% chance de aceitar/negar) com intervalo de 3 horas, utilizável apenas no canal <#1526123188101320837>.' }
        )
        .setFooter({ text: 'Federation Café - Todos os direitos reservados.' });

      return message.reply({ embeds: [embedTutorial] });
    }

    if (command === 'setcommandschannel') {
      const channel = message.mentions.channels.first();
      if (!channel) return message.reply('❌ Mencione um canal válido.');
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
      if (!channel) return message.reply('❌ Mencione um canal válido.');
      db.marketChannelId = channel.id;
      saveDatabase();
      return message.reply(`✅ Canal de transferências definido para: ${channel}`);
    }

    if (command === 'setfachannel') {
      const channel = message.mentions.channels.first();
      if (!channel) return message.reply('❌ Mencione um canal válido.');
      db.faChannelId = channel.id;
      saveDatabase();
      return message.reply(`✅ Canal de Free Agency definido para: ${channel}`);
    }

    if (command === 'setblacklistchannel') {
      const channel = message.mentions.channels.first();
      if (!channel) return message.reply('❌ Mencione um canal válido.');
      db.blacklistChannelId = channel.id;
      saveDatabase();
      return message.reply(`✅ Canal de Blacklists definido para: ${channel}`);
    }

    // COMANDO %black
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
        return message.reply('❌ Formato incorreto! Uso: `%black @docara Motivo... Tempo Robux Pix`');
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
      if (!blacklistChannel) return message.reply('❌ Canal de Blacklist não configurado!');

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
        .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }));

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
        return message.reply(`✅ Registrado em ${blacklistChannel}, mas ⚠️ **não foi possível banir o usuário**.`);
      }
    }

    // COMANDO %unblack
    if (command === 'unblack') {
      let targetUser = message.mentions.users.first();
      if (!targetUser && args[0]) {
        const cleanId = args[0].replace(/[<@!>]/g, '');
        targetUser = await client.users.fetch(cleanId).catch(() => null);
      }

      if (!targetUser) return message.reply('❌ Mencione o jogador. Ex: `%unblack @docarabanido C Pagou`');

      const nonMentionArgs = args.filter(a => !a.includes(targetUser.id) && !a.startsWith('<@'));
      if (nonMentionArgs.length < 2) return message.reply('❌ Formato incorreto!');

      const statusLetter = nonMentionArgs.shift().toUpperCase();
      const statusText = nonMentionArgs.join(' ');

      const blacklistChannel = guild.channels.cache.get(db.blacklistChannelId);
      if (!blacklistChannel) return message.reply('❌ Canal de Blacklist não configurado!');

      let emojiStatus = statusLetter === 'C' ? '✅' : '❌';
      let estadoFinal = statusLetter === 'C' && statusText.toLowerCase() === 'pagou' ? 'Retirada.' : statusText;

      const embed = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setTitle('☕ | Ban Appeal')
        .setDescription(
          `**Usuário:** ${targetUser.username}\n` +
          `**Estado:** ${emojiStatus} ${estadoFinal}`
        )
        .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }));

      await blacklistChannel.send({ embeds: [embed] });

      if (statusLetter === 'C') {
        try {
          await guild.members.unban(targetUser.id, `Ban Appeal Aprovada`);
          return message.reply(`✅ Apelação registrada e **${targetUser.tag} desbanido**!`);
        } catch (err) {
          return message.reply(`✅ Apelação registrada, mas não foi possível desbanir.`);
        }
      } else {
        return message.reply(`✅ Apelação registrada (Negada)!`);
      }
    }

    // COMANDO %warn
    if (command === 'warn') {
      const targetUser = message.mentions.users.first();
      if (!targetUser) return message.reply('❌ Mencione o usuário. Ex: `%warn @usuario Motivo`');

      const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
      if (!targetMember) return message.reply('❌ Usuário não encontrado.');

      const reason = args.slice(1).join(' ') || 'Não especificado';

      const roleWarn1 = '1562209075968745523';
      const roleWarn2 = '1562209264569688215';
      const roleWarn3 = '1562209385822949478';

      const hasWarn1 = targetMember.roles.cache.has(roleWarn1);
      const hasWarn2 = targetMember.roles.cache.has(roleWarn2);
      const hasWarn3 = targetMember.roles.cache.has(roleWarn3);

      if (hasWarn3) return message.reply(`⚠️ O usuário ${targetUser} **já possui Warn 3**.`);

      try {
        if (hasWarn2) {
          await targetMember.roles.remove(roleWarn2);
          await targetMember.roles.add(roleWarn3);
          await targetMember.timeout(7 * 24 * 60 * 60 * 1000, `Warn 3: ${reason}`);
          return message.reply(`✅ ${targetUser} recebeu **Warn 3** e mute de **1 semana**.`);
        } 
        if (hasWarn1) {
          await targetMember.roles.remove(roleWarn1);
          await targetMember.roles.add(roleWarn2);
          await targetMember.timeout(24 * 60 * 60 * 1000, `Warn 2: ${reason}`);
          return message.reply(`✅ ${targetUser} recebeu **Warn 2** e mute de **1 dia**.`);
        } 
        await targetMember.roles.add(roleWarn1);
        await targetMember.timeout(60 * 60 * 1000, `Warn 1: ${reason}`);
        return message.reply(`✅ ${targetUser} recebeu **Warn 1** e mute de **1 hora**.`);
      } catch (err) {
        return message.reply('❌ Erro ao aplicar cargos ou mute (verifique as permissões do bot).');
      }
    }

    // COMANDO %agendar
    if (command === 'agendar') {
      const targetChannel = message.mentions.channels.first();
      if (!targetChannel) return message.reply('❌ Mencione o canal. Ex: `%agendar #geral Olá mundo 0 30m`');

      const cleanArgs = args.filter(arg => !arg.startsWith('<#'));
      if (cleanArgs.length < 3) {
        return message.reply('❌ Faltam dados! Uso correto: `%agendar #canal Sua Mensagem [TempoParaComeçar] [IntervaloRepetição]`');
      }

      const intervalStr = cleanArgs.pop(); 
      const initialDelayStr = cleanArgs.pop(); 
      const msgContent = cleanArgs.join(' ');

      const initialDelayMs = parseIntervalToMs(initialDelayStr);
      const intervalMs = parseIntervalToMs(intervalStr);

      if (initialDelayMs === null || intervalMs === null) {
        return message.reply('❌ Formato de tempo inválido! Use por exemplo `5m`, `2h` ou `0`.');
      }

      const scheduleId = Math.floor(1000 + Math.random() * 9000); 

      const timerObj = setTimeout(() => {
        targetChannel.send(msgContent).catch(() => {});

        const intervalObj = setInterval(() => {
          targetChannel.send(msgContent).catch(() => {});
        }, intervalMs);

        const index = activeSchedules.findIndex(s => s.id === scheduleId);
        if (index !== -1) activeSchedules[index].intervalRef = intervalObj;

      }, initialDelayMs);

      activeSchedules.push({
        id: scheduleId,
        channelId: targetChannel.id,
        content: msgContent,
        timeoutRef: timerObj,
        intervalRef: null
      });

      return message.reply(`✅ Mensagem agendada! **ID: #${scheduleId}**`);
    }

    if (command === 'listagendados') {
      if (activeSchedules.length === 0) return message.reply('📋 Não há mensagens agendadas.');
      const lista = activeSchedules.map(s => `• **ID #${s.id}** -> Canal: <#${s.channelId}>`).join('\n');
      const embed = new EmbedBuilder().setColor(0x0099FF).setTitle('📅 Mensagens Agendadas').setDescription(lista);
      return message.reply({ embeds: [embed] });
    }

    if (command === 'desagendar') {
      const idArg = args[0];
      if (!idArg) return message.reply('❌ Indique o ID. Use `%listagendados`.');
      const cleanId = parseInt(idArg.replace('#', ''));
      const index = activeSchedules.findIndex(s => s.id === cleanId);
      if (index === -1) return message.reply(`❌ Agendamento #${cleanId} não encontrado.`);

      const sched = activeSchedules[index];
      clearTimeout(sched.timeoutRef);
      if (sched.intervalRef) clearInterval(sched.intervalRef);
      activeSchedules.splice(index, 1);

      return message.reply(`🗑️ Agendamento **#${cleanId}** cancelado!`);
    }

    if (command === 'setrosterlimit') {
      const limit = parseInt(args[0]);
      if (isNaN(limit)) return message.reply('❌ Digite um número válido.');
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
      if (!role || !emoji) return message.reply('❌ Uso correto: `addteam @Cargo :emoji:`');
      db.teams = db.teams.filter(t => t.roleId !== role.id);
      db.teams.push({ roleId: role.id, emoji });
      saveDatabase();
      return message.reply(`✅ Time ${role} adicionado!`);
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
      return message.reply(`✅ **${adicionados}** time(s) cadastrado(s)!`);
    }

    if (command === 'removeteam') {
      const role = message.mentions.roles.first();
      if (!role) return message.reply('❌ Mencione o cargo do time.');
      db.teams = db.teams.filter(t => t.roleId !== role.id);
      saveDatabase();
      return message.reply(`🗑️ Time ${role} removido.`);
    }
  }

  // VALIDAÇÃO DE MERCADO
  if (['sign', 'release', 'demand'].includes(command) && !db.marketOpen) {
    return message.reply('🔒 **Mercado Fechado!**');
  }

  if (command === 'sign') {
    if (!isCoach(member)) return message.reply('❌ Apenas Coaches/Owners podem fazer ofertas.');
    const team = getUserTeam(member);
    if (!team) return message.reply('❌ Você não pertence a nenhum time.');
    const targetUser = message.mentions.users.first();
    if (!targetUser) return message.reply('❌ Mencione o jogador.');
    const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
    if (!targetMember || targetUser.bot) return message.reply('❌ Jogador inválido.');
    if (getUserTeam(targetMember)) return message.reply(`⚠️ O jogador já pertence a uma equipe!`);

    const teamRole = guild.roles.cache.get(team.roleId);
    if (teamRole && teamRole.members.size >= db.rosterLimit) return message.reply(`🔋 **Elenco Cheio!**`);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('accept_offer').setLabel('Aceitar').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('decline_offer').setLabel('Recusar').setStyle(ButtonStyle.Danger)
    );

    try {
      const dmMsg = await targetUser.send({
        content: `📝 Proposta oficial para o **${teamRole ? teamRole.name : 'Time'}** (${team.emoji}) enviada por **${member.user.username}**!`,
        components: [row]
      });
      await message.reply(`📩 Proposta enviada no privado!`);

      const collector = dmMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 86400000 });
      collector.on('collect', async i => {
        await i.deferUpdate().catch(() => {});
        if (i.customId === 'decline_offer') {
          await dmMsg.edit({ content: `❌ Proposta recusada.`, components: [] }).catch(() => {});
          return;
        }
        if (i.customId === 'accept_offer') {
          if (!db.marketOpen || (teamRole && teamRole.members.size >= db.rosterLimit)) return;
          if (teamRole) await targetMember.roles.add(teamRole).catch(() => {});
          const marketChannel = guild.channels.cache.get(db.marketChannelId);
          const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('Offer Accepted')
            .setDescription(`<@${targetUser.id}> entrou para ${team.emoji} <@&${team.roleId}>`);
          if (marketChannel) await marketChannel.send({ embeds: [embed] }).catch(() => {});
          await dmMsg.edit({ content: `🎉 Parabéns! Você agora é do **${teamRole ? teamRole.name : 'Time'}**!`, components: [] }).catch(() => {});
        }
      });
    } catch (err) {
      return message.reply(`❌ Não foi possível enviar DM para o jogador.`);
    }
  }

  if (command === 'release') {
    if (!isCoach(member)) return message.reply('❌ Apenas Coaches/Owners.');
    const team = getUserTeam(member);
    if (!team) return message.reply('❌ Você não tem time.');
    const targetUser = message.mentions.users.first();
    if (!targetUser) return message.reply('❌ Mencione o jogador.');
    const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
    if (!targetMember || !targetMember.roles.cache.has(team.roleId)) return message.reply('❌ O jogador não é do seu time.');

    const teamRole = guild.roles.cache.get(team.roleId);
    if (teamRole) await targetMember.roles.remove(teamRole);
    const marketChannel = guild.channels.cache.get(db.marketChannelId);
    const embed = new EmbedBuilder().setColor(0x888888).setTitle('Player Released').setDescription(`<@${targetUser.id}> dispensado de ${team.emoji}`);
    if (marketChannel) await marketChannel.send({ embeds: [embed] });
    return message.reply(`✅ Jogador dispensado.`);
  }

  if (command === 'demand') {
    const team = getUserTeam(member);
    if (!team) return message.reply('❌ Você não tem time.');
    const teamRole = guild.roles.cache.get(team.roleId);
    if (teamRole) await member.roles.remove(teamRole);
    const marketChannel = guild.channels.cache.get(db.marketChannelId);
    const embed = new EmbedBuilder().setColor(0xFFA500).setTitle('Contract Terminated').setDescription(`<@${member.id}> saiu de ${team.emoji}`);
    if (marketChannel) await marketChannel.send({ embeds: [embed] });
    return message.reply(`✅ Você saiu do time.`);
  }

  if (command === 'roster') {
    const role = message.mentions.roles.first();
    if (!role) return message.reply('❌ Mencione o cargo do time.');
    await guild.members.fetch();
    const members = role.members.map(m => `• <@${m.id}>`).join('\n') || '*Nenhum jogador.*';
    const embed = new EmbedBuilder().setColor(0x00FF00).setTitle(`📋 Elenco - ${role.name}`).setDescription(members);
    return message.reply({ embeds: [embed] });
  }

  if (command === 'teams' || command === 'times') {
    if (db.teams.length === 0) return message.reply('📋 Nenhum time.');
    const lista = db.teams.map((t, index) => `${index + 1}. ${t.emoji} <@&${t.roleId}>`).join('\n');
    const embed = new EmbedBuilder().setColor(0x0099FF).setTitle('🏆 Times').setDescription(lista);
    return message.reply({ embeds: [embed] });
  }
});

const token = process.env.TOKEN ? process.env.TOKEN.trim() : null;

if (!token) {
  console.error('[ERRO CRÍTICO]: A variável de ambiente TOKEN não foi encontrada!');
} else {
  console.log('[Discord] A aguardar estabilização do servidor para iniciar sessão...');
  setTimeout(() => {
    client.login(token).catch(err => {
      console.error('[ERRO DISCORD LOGIN]: Falha ao ligar ao Discord!', err);
    });
  }, 3000);
}
