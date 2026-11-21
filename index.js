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

// Rota de Callback do OAuth2 (Página bonita e profissional no Railway)
const VERIFIED_ROLE_ID = '1526089498570522666';

app.get('/callback', async (req, res) => {
  const { code, state } = req.query; // state guarda o guildId
  if (!code || !state) {
    return res.status(400).send(`
      <div style="font-family: sans-serif; text-align: center; margin-top: 80px; background: #1e1f22; color: #f2f3f5; padding: 40px; border-radius: 12px; max-width: 450px; margin-inline: auto; box-shadow: 0 4px 15px rgba(0,0,0,0.5);">
        <h1 style="color: #ed4245; margin-bottom: 10px;">❌ Erro na Verificação</h1>
        <p style="color: #dbdee1;">Parâmetros ausentes ou sessão expirada.</p>
      </div>
    `);
  }

  try {
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.REDIRECT_URI
      })
    });

    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token) {
      return res.status(400).send(`
        <div style="font-family: sans-serif; text-align: center; margin-top: 80px; background: #1e1f22; color: #f2f3f5; padding: 40px; border-radius: 12px; max-width: 450px; margin-inline: auto; box-shadow: 0 4px 15px rgba(0,0,0,0.5);">
          <h1 style="color: #ed4245; margin-bottom: 10px;">❌ Falha na Autenticação</h1>
          <p style="color: #dbdee1;">Não foi possível validar sua conta com o Discord. Tente novamente.</p>
        </div>
      `);
    }

    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const userData = await userResponse.json();

    const guild = client.guilds.cache.get(state);
    if (!guild) {
      return res.status(404).send(`
        <div style="font-family: sans-serif; text-align: center; margin-top: 80px; background: #1e1f22; color: #f2f3f5; padding: 40px; border-radius: 12px; max-width: 450px; margin-inline: auto; box-shadow: 0 4px 15px rgba(0,0,0,0.5);">
          <h1 style="color: #ed4245; margin-bottom: 10px;">❌ Servidor Não Encontrado</h1>
          <p style="color: #dbdee1;">O bot não conseguiu localizar o servidor da liga.</p>
        </div>
      `);
    }

    const member = await guild.members.fetch(userData.id).catch(() => null);
    if (!member) {
      return res.status(404).send(`
        <div style="font-family: sans-serif; text-align: center; margin-top: 80px; background: #1e1f22; color: #f2f3f5; padding: 40px; border-radius: 12px; max-width: 450px; margin-inline: auto; box-shadow: 0 4px 15px rgba(0,0,0,0.5);">
          <h1 style="color: #ed4245; margin-bottom: 10px;">❌ Membro Ausente</h1>
          <p style="color: #dbdee1;">Você precisa estar no servidor do Discord da <b>Federação Café</b> para se verificar!</p>
        </div>
      `);
    }

    await member.roles.add(VERIFIED_ROLE_ID);

    // Página HTML profissional e estilizada de sucesso
    return res.send(`
      <div style="font-family: sans-serif; text-align: center; margin-top: 60px; background: #1e1f22; color: #f2f3f5; padding: 40px; border-radius: 12px; max-width: 450px; margin-inline: auto; box-shadow: 0 4px 20px rgba(0,0,0,0.6); border: 1px solid #35363c;">
        <h2 style="color: #f1c40f; margin-bottom: 5px;">☕ Federação Café</h2>
        <hr style="border: 0; height: 1px; background: #35363c; margin: 20px 0;">
        <h1 style="color: #23a559; margin-bottom: 15px;">✅ Verificado com Sucesso!</h1>
        <p style="font-size: 16px; color: #dbdee1; line-height: 1.5;">
          Olá <b>${userData.username}</b>, sua identidade foi confirmada e o seu cargo foi entregue com sucesso!
        </p>
        <p style="font-size: 13px; color: #949ba4; margin-top: 25px;">
          Já pode fechar esta aba e retornar ao Discord para acessar todos os canais.
        </p>
        <a href="https://discord.com/channels/${state}" style="display: inline-block; margin-top: 15px; background-color: #5865f2; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 14px;">Voltar ao Discord</a>
      </div>
    `);
  } catch (err) {
    console.error('[ERRO AUTH VERIFICAR]:', err);
    return res.status(500).send(`
      <div style="font-family: sans-serif; text-align: center; margin-top: 80px; background: #1e1f22; color: #f2f3f5; padding: 40px; border-radius: 12px; max-width: 450px; margin-inline: auto; box-shadow: 0 4px 15px rgba(0,0,0,0.5);">
        <h1 style="color: #ed4245; margin-bottom: 10px;">❌ Erro Interno</h1>
        <p style="color: #dbdee1;">Ocorreu um erro ao concluir sua verificação. Tente novamente mais tarde.</p>
      </div>
    `);
  }
});

app.listen(PORT, () => console.log(`[Express] Servidor ativo na porta ${PORT}`));

const DB_PATH = path.join(__dirname, 'league_config.json');

// IDs dos cargos configurados:
const CUP_TIED_ROLE_ID = '1572396208482426910';
const ASSISTANT_ROLE_ID = '1565186858382528593';

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

  // Champions League (Os 16 últimos)
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

const DEFAULT_BANNED_WORDS = [
  "exu", "pcd", "mkk", "makako", "macaco", "🐵", "🐒", "🙊", "🙉", "🙈", "🦍", "🦧",
  "porn", "nigger", "nigg", "nger", "lixo", "lx", "gozei", "estrupado", "estrpado",
  "mkkeico", "macacão", "chupar", "pau", "pika", "buceta", "bceta", "foder", "bct",
  "desgraca", "desgraça", "cu", "bbum", "bunda", "bumbum"
];

let db = {
  marketOpen: true,
  marketChannelId: '', 
  faChannelId: '', 
  blacklistChannelId: '', 
  commandsChannelId: '', 
  rosterLimit: 20,
  ownerRoleIds: [], 
  bannedWords: DEFAULT_BANNED_WORDS,
  eliminatedChampionsRoles: [],
  teams: DEFAULT_TEAMS
};

const activeSchedules = [];
const entrosarCooldowns = new Map(); 
const narratedGames = []; 
const pendingTickets = new Map(); 

function loadDatabase() {
  if (fs.existsSync(DB_PATH)) {
    try {
      const data = fs.readFileSync(DB_PATH, 'utf-8');
      const parsed = JSON.parse(data);
      db = { ...db, ...parsed };
      if (!db.teams || db.teams.length === 0) db.teams = DEFAULT_TEAMS;
      if (!Array.isArray(db.bannedWords) || db.bannedWords.length === 0) {
        db.bannedWords = DEFAULT_BANNED_WORDS;
      }
      if (!Array.isArray(db.eliminatedChampionsRoles)) db.eliminatedChampionsRoles = [];
    } catch (e) {
      db.teams = DEFAULT_TEAMS;
      db.bannedWords = DEFAULT_BANNED_WORDS;
      db.eliminatedChampionsRoles = [];
      saveDatabase();
    }
  } else {
    db.bannedWords = DEFAULT_BANNED_WORDS;
    db.eliminatedChampionsRoles = [];
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

client.once('ready', async () => {
  console.log(`[Discord] ✅ Bot online como: ${client.user.tag}`);

  try {
    await client.application.commands.set([]);
    for (const [, guild] of client.guilds.cache) {
      await guild.commands.set([]).catch(() => {});
    }
    console.log('[Discord] 🧹 Todos os comandos de barra (/) antigos foram removidos com sucesso!');
  } catch (err) {
    console.error('[ERRO LIMPEZA SLASH]:', err);
  }
});

// Evento de clique no botão de verificação por OAuth2 (pede acesso à conta)
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;
  if (interaction.customId === 'btn_verificar_auth') {
    if (!process.env.CLIENT_ID || !process.env.REDIRECT_URI) {
      return interaction.reply({
        content: '⚠️ As credenciais de OAuth2 não estão configuradas no Railway.',
        ephemeral: true
      });
    }

    const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${process.env.CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.REDIRECT_URI)}&response_type=code&scope=identify&state=${interaction.guild.id}`;
    
    return interaction.reply({
      content: `🔐 **Verificação de Identidade (OAuth2):**\n👉 **[Clique aqui para autorizar sua conta e liberar os canais](${authUrl})**`,
      ephemeral: true
    });
  }
});

function getUserTeam(member) {
  return db.teams.find(t => member.roles.cache.has(t.roleId));
}

function isChampionsTeam(roleId) {
  const championsList = db.teams.slice(-16);
  return championsList.some(t => t.roleId === roleId);
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
  if (message.author.bot && message.channel.name && message.channel.name.toLowerCase().startsWith('ticket-')) {
    if (message.embeds.length > 0) {
      const embedDesc = (message.embeds[0].description || '').toLowerCase();
      const userIdMatch = (message.embeds[0].description || '').match(/<@!?(\d+)>/);
      const openerId = userIdMatch ? userIdMatch[1] : null;

      if (embedDesc.includes('criou um novo ticket') && openerId) {
        let ticketType = null;
        if (embedDesc.includes('parceria')) ticketType = 'parceria';
        else if (embedDesc.includes('dúvida') || embedDesc.includes('duvida')) ticketType = 'duvida';
        else if (embedDesc.includes('denúncia') || embedDesc.includes('denuncia')) ticketType = 'denuncia';
        else if (embedDesc.includes('inscrever') || embedDesc.includes('inscrição')) ticketType = 'inscrever';
        else if (embedDesc.includes('compra')) ticketType = 'compra';
        else if (embedDesc.includes('transmissor') || embedDesc.includes('narrador')) ticketType = 'transmissor';

        if (ticketType) {
          pendingTickets.set(message.channel.id, { openerId, type: ticketType });
        }
      }
    }
    return;
  }

  if (message.author.bot || !message.guild) return;

  if (db.bannedWords && db.bannedWords.length > 0 && message.member && !isStaffOrOwner(message.member)) {
    const contentLower = message.content.toLowerCase();
    const hasBannedWord = db.bannedWords.some(word => contentLower.includes(word.toLowerCase()));
    if (hasBannedWord) {
      await message.delete().catch(() => {});
      return;
    }
  }

  if (pendingTickets.has(message.channel.id)) {
    const ticketData = pendingTickets.get(message.channel.id);
    if (message.author.id === ticketData.openerId) {
      pendingTickets.delete(message.channel.id);

      const footerNote = `\n\n-# Essa resposta é automática e não é modificada por IA.`;
      const userMention = `<@${ticketData.openerId}>`;

      if (ticketData.type === 'parceria') {
        await message.reply(
          `${userMention} 👋 **Atenção antes de aguardar atendimento:**\n` +
          `📌 Envie agora o **texto da sua parceria** junto com o **link do seu servidor do Discord** (mínimo de 100 membros).` +
          footerNote
        );
      } else if (ticketData.type === 'duvida') {
        await message.reply(
          `${userMention} 🤔 **Para agilizar o seu atendimento:**\n` +
          `📌 Escreva a sua **dúvida completa** logo abaixo. Não mande apenas "oi" ou "olá"!` +
          footerNote
        );
      } else if (ticketData.type === 'denuncia') {
        await message.reply(
          `${userMention} 🚨 **Para validar a sua denúncia:**\n` +
          `📌 Envie o **ID/menção do acusado** e as **provas (prints ou vídeos)** agora mesmo.` +
          footerNote
        );
      } else if (ticketData.type === 'inscrever') {
        await message.reply(
          `${userMention} Vagas fechadas!, não é possivel ownar, apenas é possível **pagar 5 reais ou 200 robux para Ficar na Fila De Espera pra próxima season ou para o próximo time que tomar Disband!**` +
          footerNote
        );
      } else if (ticketData.type === 'compra') {
        await message.reply(
          `${userMention} 🛒 **Atendimento de Compras:**\n` +
          `📌 Informe **qual produto/pacote deseja adquirir** e a **forma de pagamento** (Robux ou Pix).` +
          footerNote
        );
      } else if (ticketData.type === 'transmissor') {
        await message.reply(
          `${userMention}\n` +
          `☕| Narrador\n` +
          `- Sabe colocar placar na tela?\n` +
          `- Qual sua Plataforma?\n` +
          `- Como você transmite?\n` +
          `- Tem uma equipe?` +
          footerNote
        );
      }
    }
  }

  const isCmdPercent = message.content.startsWith('%');
  const isCmdExclamation = message.content.startsWith('!');

  if (!isCmdPercent && !isCmdExclamation) return;

  const argsCheck = message.content.slice(1).trim().split(/ +/);
  const cmdCheck = argsCheck.shift().toLowerCase();
  const member = message.member;

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
    'black', 'unblack', 'warn', 'agendar', 'desagendar', 'listagendados', 'limparnarracoes',
    'addpalavra', 'removepalavra', 'listapalavras', 'eliminado', 'deseliminar', 'tutorial', 'verificar'
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
    'black', 'unblack', 'warn', 'agendar', 'desagendar', 'listagendados', 'limparnarracoes',
    'addpalavra', 'removepalavra', 'listapalavras', 'eliminado', 'deseliminar', 'tutorial', 'verificar'
  ];

  if (adminCommandsList.includes(command)) {
    
    if (!isStaffOrOwner(member)) {
      return message.reply('❌ Apenas Administradores, Staffs ou Donos podem usar este comando.');
    }

    if (command === 'verificar') {
      const embedVerify = new EmbedBuilder()
        .setColor(0xF1C40F)
        .setTitle('Se Verificar 🔒')
        .setDescription('Clique no Botão verde "Verificar" para autorizar sua conta e ter acesso a **todos os canais!**')
        .setFooter({ text: 'Federação Café - Verificação por OAuth2' })
        .setTimestamp();

      const rowVerify = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('btn_verificar_auth')
          .setLabel('Verificar')
          .setStyle(ButtonStyle.Success)
      );

      await message.delete().catch(() => {});
      return message.channel.send({ embeds: [embedVerify], components: [rowVerify] });
    }

    if (command === 'eliminado') {
      const role = message.mentions.roles.first();
      if (!role) return message.reply('❌ Mencione o cargo do time da Champions. Ex: `%eliminado @Manchester United`');
      if (!isChampionsTeam(role.id)) return message.reply('⚠️ Este time não pertence à Champions League (ou o cargo está incorreto).');
      
      if (!db.eliminatedChampionsRoles.includes(role.id)) {
        db.eliminatedChampionsRoles.push(role.id);
        saveDatabase();
      }

      await guild.members.fetch();
      let aplicados = 0;
      for (const [, teamMember] of role.members) {
        if (!teamMember.roles.cache.has(CUP_TIED_ROLE_ID)) {
          await teamMember.roles.add(CUP_TIED_ROLE_ID).catch(() => {});
          aplicados++;
        }
      }

      return message.reply(`✅ O time ${role} foi marcado como **ELIMINADO** e o cargo <@&${CUP_TIED_ROLE_ID}> foi aplicado em **${aplicados}** jogador(es)!`);
    }

    if (command === 'deseliminar') {
      const role = message.mentions.roles.first();
      if (!role) return message.reply('❌ Mencione o cargo do time. Ex: `%deseliminar @Manchester United`');
      if (!db.eliminatedChampionsRoles.includes(role.id)) return message.reply('❌ Este time não está na lista de eliminados.');

      db.eliminatedChampionsRoles = db.eliminatedChampionsRoles.filter(rId => rId !== role.id);
      saveDatabase();

      await guild.members.fetch();
      for (const [, teamMember] of role.members) {
        if (teamMember.roles.cache.has(CUP_TIED_ROLE_ID)) {
          await teamMember.roles.remove(CUP_TIED_ROLE_ID).catch(() => {});
        }
      }

      return message.reply(`✅ O time ${role} foi removido da lista de eliminados e o cargo Cup-Tied dos seus jogadores atuais foi removido.`);
    }

    if (command === 'addpalavra') {
      const word = args.join(' ').toLowerCase().trim();
      if (!word) return message.reply('❌ Digite a palavra ou frase que deseja bloquear. Ex: `%addpalavra discord.gg/`');
      if (db.bannedWords.includes(word)) return message.reply('⚠️ Essa palavra já está na lista de bloqueio.');

      db.bannedWords.push(word);
      saveDatabase();
      return message.reply(`✅ A palavra/termo **\`${word}\`** foi adicionada ao filtro automático!`);
    }

    if (command === 'removepalavra') {
      const word = args.join(' ').toLowerCase().trim();
      if (!word) return message.reply('❌ Digite a palavra que deseja remover do filtro. Ex: `%removepalavra discord.gg/`');
      if (!db.bannedWords.includes(word)) return message.reply('❌ Essa palavra não está na lista.');

      db.bannedWords = db.bannedWords.filter(w => w !== word);
      saveDatabase();
      return message.reply(`🗑️ A palavra/termo **\`${word}\`** foi removida do filtro!`);
    }

    if (command === 'listapalavras') {
      if (db.bannedWords.length === 0) return message.reply('📋 Nenhuma palavra bloqueada no momento.');
      const lista = db.bannedWords.map((w, i) => `${i + 1}. \`${w}\``).join('\n');
      const embed = new EmbedBuilder()
        .setColor(0xFF4500)
        .setTitle('🚫 Palavras Bloqueadas (Auto-Mod)')
        .setDescription(lista);
      return message.reply({ embeds: [embed] });
    }

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

    if (command === 'tutorial') {
      const embedTutorial = new EmbedBuilder()
        .setColor(0x00AE86)
        .setTitle('📚 Tutorial Completo - Federation Café Bot')
        .setDescription('Aqui está a lista de todos os comandos e funções do bot organizadas para a administração e gestão da liga:')
        .addFields(
          { name: '⚙️ Comandos de Configuração e Gestão', value: '• `%setcommandschannel #canal`\n• `%setmarketchannel #canal`\n• `%setfachannel #canal`\n• `%setblacklistchannel #canal`\n• `%abrirjanela` / `%fecharjanela`\n• `%setrosterlimit <número>`\n• `%verificar`' },
          { name: '🛡️ Moderação, Punições, Filtro e Cup-Tied', value: '• `%warn @usuario <motivo>`\n• `%black @usuario <motivo> <tempo> <robux> <pix>`\n• `%unblack @usuario C <motivo>`\n• `%addpalavra` / `%removepalavra` / `%listapalavras`\n• `%eliminado @Time` / `%deseliminar @Time`' },
          { name: '👔 Gestão de Assistentes (Club Owners)', value: '• `%setassistent @jogador` - Atribui cargo de assistente a um membro do mesmo time.\n• `%removeassistent @jogador` - Remove o cargo de assistente.' },
          { name: '📅 Agendamento e Times', value: '• `%agendar` / `%listagendados` / `%desagendar`\n• `%teams` / `%roster` / `%addteam` / `%addteams` / `%removeteam`' },
          { name: '🔄 Mercado e Transmissões', value: '• `%sign` / `%release` / `%demand` / `!freeagency`\n• `%narrar` / `%listanarracoes` / `%limparnarracoes` / `%entrosar`' }
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

  if (command === 'setassistent') {
    if (!isCoach(member)) return message.reply('❌ Apenas Coaches/Owners podem usar este comando.');
    
    const coachTeam = getUserTeam(member);
    if (!coachTeam) return message.reply('❌ Você não pertence a nenhum time para poder nomear um assistente.');

    const targetUser = message.mentions.users.first();
    if (!targetUser) return message.reply('❌ Mencione o jogador que deseja definir como assistente. Ex: `%setassistent @amigo`');
    
    const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
    if (!targetMember || targetUser.bot) return message.reply('❌ Jogador inválido.');

    const targetTeam = getUserTeam(targetMember);
    if (!targetTeam || targetTeam.roleId !== coachTeam.roleId) {
      return message.reply('❌ O jogador mencionado precisa de pertencer ao **mesmo time** que você para receber o cargo de assistente!');
    }

    try {
      await targetMember.roles.add(ASSISTANT_ROLE_ID);
      return message.reply(`✅ <@${targetUser.id}> foi definido como o assistente oficial do seu time!`);
    } catch (err) {
      return message.reply('❌ Erro ao adicionar o cargo. Verifique se o cargo do bot está acima do cargo de assistente na hierarquia do Discord.');
    }
  }

  if (command === 'removeassistent') {
    if (!isCoach(member)) return message.reply('❌ Apenas Coaches/Owners podem usar este comando.');
    
    const coachTeam = getUserTeam(member);
    if (!coachTeam) return message.reply('❌ Você não pertence a nenhum time.');

    const targetUser = message.mentions.users.first();
    if (!targetUser) return message.reply('❌ Mencione o assistente que deseja remover. Ex: `%removeassistent @amigo`');
    
    const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
    if (!targetMember) return message.reply('❌ Jogador não encontrado.');

    const targetTeam = getUserTeam(targetMember);
    if (!targetTeam || targetTeam.roleId !== coachTeam.roleId) {
      return message.reply('❌ Este jogador não pertence ao seu time.');
    }

    try {
      await targetMember.roles.remove(ASSISTANT_ROLE_ID);
      return message.reply(`🗑️ O cargo de assistente foi removido de <@${targetUser.id}>.`);
    } catch (err) {
      return message.reply('❌ Erro ao remover o cargo.');
    }
  }

  if (['sign', 'release', 'demand'].includes(command) && !db.marketOpen) {
    return message.reply('🔒 **Mercado Fechado!**');
  }

  if (command === 'sign') {
    if (!isCoach(member)) return message.reply('❌ Apenas Coaches/Owners podem fazer ofertas.');
    const coachTeam = getUserTeam(member);
    if (!coachTeam) return message.reply('❌ Você não pertence a nenhum time.');
    
    const targetUser = message.mentions.users.first();
    if (!targetUser) return message.reply('❌ Mencione o jogador. Ex: `%sign @jogador [posições] [status] [informações]`');
    
    const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
    if (!targetMember || targetUser.bot) return message.reply('❌ Jogador inválido.');
    if (getUserTeam(targetMember)) return message.reply(`⚠️ O jogador já pertence a uma equipe!`);

    if (isChampionsTeam(coachTeam.roleId) && targetMember.roles.cache.has(CUP_TIED_ROLE_ID)) {
      return message.reply(`⛔ **Transferência Bloqueada (Cup-Tied)!** Este jogador possui o cargo <@&${CUP_TIED_ROLE_ID}> e não pode ser contratado por uma equipe da Champions League.`);
    }

    const teamRole = guild.roles.cache.get(coachTeam.roleId);
    if (teamRole && teamRole.members.size >= db.rosterLimit) return message.reply(`🔋 **Elenco Cheio!**`);

    const extraArgs = args.slice(1);
    const posicoes = extraArgs[0] || 'N/A';
    const statusCara = extraArgs[1] || 'N/A';
    const informacoesAdicionais = extraArgs.slice(2).join(' ') || 'Nenhuma informação adicional';

    const teamName = teamRole ? teamRole.name : 'NomeDoTime';

    const avatarUrl = 'https://cdn.discordapp.com/icons/1463007976670498900/a_2fc2b2afa81fdc27762088d5dab31498.gif?size=256';
    const bannerUrl = 'https://i.ibb.co/0pRJcfsP/Superliga-Caf-MPS-94.png';
    let teamThumbnail = teamRole && teamRole.iconURL ? teamRole.iconURL() : avatarUrl;

    const proposalId = Date.now().toString();

    const embedContract = new EmbedBuilder()
      .setColor(0x442604)
      .setAuthor({ name: 'Federação Café', iconURL: avatarUrl })
      .setDescription(
        `Proposta da Federação Café ☕<:cafe:1560387904792961106>\n\n` +
        `📋 **Contrato:**\n` +
        `ENVIADO POR: <@${member.id}>\n\n` +
        `👥 **Time:**\n` +
        `${teamName}\n\n` +
        `⚽ **Posições:**\n` +
        `${posicoes}\n\n` +
        `🎯 **Status:**\n` +
        `${statusCara}\n\n` +
        `📄 **Informações Adicionais:**\n` +
        `${informacoesAdicionais}`
      )
      .setImage(bannerUrl)
      .setThumbnail(teamThumbnail)
      .setFooter({ text: `Prezando Por Uma Comunidade Melhor. | ID: ${proposalId}`, iconURL: avatarUrl })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`accept_${proposalId}`).setLabel('Aceitar').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`decline_${proposalId}`).setLabel('Recusar').setStyle(ButtonStyle.Danger)
    );

    try {
      const dmMsg = await targetUser.send({
        embeds: [embedContract],
        components: [row]
      });
      await message.reply(`📩 Proposta de contrato enviada no privado do jogador!`);

      const collector = dmMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 86400000 });
      collector.on('collect', async i => {
        if (i.user.id !== targetUser.id) {
          return i.reply({ content: '❌ Apenas o jogador convidado pode interagir com este contrato.', ephemeral: true });
        }

        if (!i.customId.endsWith(proposalId)) {
          return i.reply({ content: '⚠️ **Este contrato expirou!** O clube enviou uma proposta mais recente para você.', ephemeral: true });
        }

        await i.deferUpdate().catch(() => {});

        if (i.customId === `decline_${proposalId}`) {
          const embedDeclined = new EmbedBuilder()
            .setColor(0x442604)
            .setAuthor({ name: 'Federação Café', iconURL: avatarUrl })
            .setDescription(
              `Contrato Recusado. ⛔\n\n` +
              `**Você Recusou o Contrato.** ⛔\n` +
              `Você recusou o contrato de **${teamName}**!`
            )
            .setThumbnail(teamThumbnail)
            .setFooter({ text: 'Prezando Por Uma Comunidade Melhor.', iconURL: avatarUrl })
            .setTimestamp();

          collector.stop();
          await dmMsg.edit({ embeds: [embedDeclined], components: [] }).catch(() => {});
          return;
        }

        if (i.customId === `accept_${proposalId}`) {
          if (!db.marketOpen || (teamRole && teamRole.members.size >= db.rosterLimit)) {
            return i.followUp({ content: '❌ A janela fechou ou o elenco está cheio!', ephemeral: true });
          }

          if (teamRole) await targetMember.roles.add(teamRole).catch(() => {});

          const marketChannel = guild.channels.cache.get(db.marketChannelId);
          const embedLog = new EmbedBuilder()
            .setColor(0x442604)
            .setTitle('Offer Accepted')
            .setDescription(`<@${targetUser.id}> entrou para ${coachTeam.emoji} <@&${coachTeam.roleId}>`);
          if (marketChannel) await marketChannel.send({ embeds: [embedLog] }).catch(() => {});

          const embedAccepted = new EmbedBuilder()
            .setColor(0x442604)
            .setAuthor({ name: 'Federação Café', iconURL: avatarUrl })
            .setDescription(
              `Contrato Aceito. ✅\n\n` +
              `**Você aceitou o Contrato!** ✅\n` +
              `Parabéns!, você está no **${teamName}**!`
            )
            .setThumbnail(teamThumbnail)
            .setFooter({ text: 'Prezando Por Uma Comunidade Melhor.', iconURL: avatarUrl })
            .setTimestamp();

          collector.stop();
          await dmMsg.edit({ embeds: [embedAccepted], components: [] }).catch(() => {});
        }
      });
    } catch (err) {
      return message.reply(`❌ Não foi possível enviar DM para o jogador (verifique se ele permite mensagens diretas).`);
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

    if (db.eliminatedChampionsRoles.includes(team.roleId) && !targetMember.roles.cache.has(CUP_TIED_ROLE_ID)) {
      await targetMember.roles.add(CUP_TIED_ROLE_ID).catch(() => {});
    }

    const teamRole = guild.roles.cache.get(team.roleId);
    if (teamRole) await targetMember.roles.remove(teamRole);
    const marketChannel = guild.channels.cache.get(db.marketChannelId);
    const embed = new EmbedBuilder().setColor(0x442604).setTitle('Player Released').setDescription(`<@${targetUser.id}> dispensado de ${team.emoji}`);
    if (marketChannel) await marketChannel.send({ embeds: [embed] });
    return message.reply(`✅ Jogador dispensado.`);
  }

  if (command === 'demand') {
    const team = getUserTeam(member);
    if (!team) return message.reply('❌ Você não tem time.');

    if (db.eliminatedChampionsRoles.includes(team.roleId) && !member.roles.cache.has(CUP_TIED_ROLE_ID)) {
      await member.roles.add(CUP_TIED_ROLE_ID).catch(() => {});
    }

    const teamRole = guild.roles.cache.get(team.roleId);
    if (teamRole) await member.roles.remove(teamRole);
    const marketChannel = guild.channels.cache.get(db.marketChannelId);
    const embed = new EmbedBuilder().setColor(0x442604).setTitle('Contract Terminated').setDescription(`<@${member.id}> saiu de ${team.emoji}`);
    if (marketChannel) await marketChannel.send({ embeds: [embed] });
    return message.reply(`✅ Você saiu do time.`);
  }

  if (command === 'roster') {
    const targetRole = message.mentions.roles.first();
    if (!targetRole) return message.reply('❌ Mencione o cargo do time.');
    await guild.members.fetch();
    const members = targetRole.members.map(m => `• <@${m.id}>`).join('\n') || '*Nenhum jogador.*';
    const embed = new EmbedBuilder().setColor(0x442604).setTitle(`📋 Elenco - ${targetRole.name}`).setDescription(members);
    return message.reply({ embeds: [embed] });
  }

  if (command === 'teams' || command === 'times') {
    if (db.teams.length === 0) return message.reply('📋 Nenhum time.');
    const lista = db.teams.map((t, index) => `${index + 1}. ${t.emoji} <@&${t.roleId}>`).join('\n');
    const embed = new EmbedBuilder().setColor(0x442604).setTitle('🏆 Times').setDescription(lista);
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
