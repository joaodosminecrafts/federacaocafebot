const { 
  Client, 
  GatewayIntentBits, 
  PermissionsBitField, 
  EmbedBuilder, 
  SlashCommandBuilder, 
  REST, 
  Routes, 
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

// Configuração de Persistência Simples (JSON local)
const DB_PATH = path.join(__dirname, 'league_config.json');

let db = {
  marketOpen: true,
  marketChannelId: '1527738994505547856', // Canal padrão
  rosterLimit: 20,
  ownerRoleIds: [], // IDs dos cargos Club Owner / Assistant
  teams: [] // { roleId, emoji, logoUrl }
};

function loadDatabase() {
  if (fs.existsSync(DB_PATH)) {
    try {
      const data = fs.readFileSync(DB_PATH, 'utf-8');
      db = { ...db, ...JSON.parse(data) };
    } catch (e) {
      console.error('[DB] Erro ao carregar dados:', e.message);
    }
  }
}

function saveDatabase() {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
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
    GatewayIntentBits.GuildMembers
  ],
  rest: { timeout: 60000, retries: 3 }
});

// Definição dos Slash Commands
const commands = [
  new SlashCommandBuilder()
    .setName('offer')
    .setDescription('Envia uma proposta de contrato a um jogador.')
    .addUserOption(opt => opt.setName('player').setDescription('Jogador a ser contratado').setRequired(true)),
  
  new SlashCommandBuilder()
    .setName('release')
    .setDescription('Dispensa um jogador do seu time.')
    .addUserOption(opt => opt.setName('player').setDescription('Jogador a ser dispensado').setRequired(true)),

  new SlashCommandBuilder()
    .setName('demand')
    .setDescription('Pede a saída do seu time atual para virar Free Agent.'),

  new SlashCommandBuilder()
    .setName('abrirjanela')
    .setDescription('[Admin] Abre a janela de transferências.'),

  new SlashCommandBuilder()
    .setName('fecharjanela')
    .setDescription('[Admin] Fecha a janela de transferências.'),

  new SlashCommandBuilder()
    .setName('setmarketchannel')
    .setDescription('[Admin] Define o canal de anúncios do mercado.')
    .addChannelOption(opt => opt.setName('canal').setDescription('Canal de transferências').setRequired(true)),

  new SlashCommandBuilder()
    .setName('setrosterlimit')
    .setDescription('[Admin] Define o limite máximo do elenco.')
    .addIntegerOption(opt => opt.setName('limite').setDescription('Limite máximo (ex: 20)').setRequired(true)),

  new SlashCommandBuilder()
    .setName('setownercargos')
    .setDescription('[Admin] Define os cargos de Club Owner e Assistant.')
    .addRoleOption(opt => opt.setName('owner').setDescription('Cargo de Owner').setRequired(true))
    .addRoleOption(opt => opt.setName('assistant').setDescription('Cargo de Assistant').setRequired(false)),

  new SlashCommandBuilder()
    .setName('addteam')
    .setDescription('[Admin] Cadastra um novo time na liga.')
    .addRoleOption(opt => opt.setName('cargo').setDescription('Cargo do time').setRequired(true))
    .addStringOption(opt => opt.setName('emoji').setDescription('Emoji do time').setRequired(true))
    .addStringOption(opt => opt.setName('escudo').setDescription('URL da imagem do escudo').setRequired(true)),

  new SlashCommandBuilder()
    .setName('removeteam')
    .setDescription('[Admin] Remove um time cadastrado.')
    .addRoleOption(opt => opt.setName('cargo').setDescription('Cargo do time').setRequired(true)),

  new SlashCommandBuilder()
    .setName('roster')
    .setDescription('Exibe o elenco de um time.')
    .addRoleOption(opt => opt.setName('time').setDescription('Cargo do time').setRequired(true)),

  new SlashCommandBuilder()
    .setName('freeagency')
    .setDescription('Anuncia seu perfil como Free Agent.')
    .addStringOption(opt => opt.setName('mensagem').setDescription('Sua mensagem de Free Agent').setRequired(true))
].map(cmd => cmd.toJSON());

// Registro dos Comandos na Inicialização
client.once('ready', async () => {
  console.log(`[Discord] ✅ Bot online como: ${client.user.tag}`);
  
  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
  try {
    console.log('[Slash Commands] Registrando comandos globais...');
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log('[Slash Commands] ✅ Todos os comandos de barra registrados!');
  } catch (error) {
    console.error('[Slash Commands] Erro ao registrar:', error);
  }
});

// Funções Auxiliares
function getUserTeam(member) {
  return db.teams.find(t => member.roles.cache.has(t.roleId));
}

function isCoach(member) {
  if (member.permissions.has(PermissionsBitField.Flags.Administrator)) return true;
  return db.ownerRoleIds.some(rId => member.roles.cache.has(rId));
}

// Manipulador dos Slash Commands
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName, options, guild, member } = interaction;

  // ---------------------------------------------------------
  // 1. CONFIGURAÇÕES DA LIGA (APENAS ADMINS)
  // ---------------------------------------------------------
  if (['abrirjanela', 'fecharjanela', 'setmarketchannel', 'setrosterlimit', 'setownercargos', 'addteam', 'removeteam'].includes(commandName)) {
    if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({ content: '❌ Apenas Administradores podem usar este comando.', ephemeral: true });
    }

    if (commandName === 'abrirjanela') {
      db.marketOpen = true;
      saveDatabase();
      return interaction.reply('🔓 **Janela de transferências ABERTA com sucesso!**');
    }

    if (commandName === 'fecharjanela') {
      db.marketOpen = false;
      saveDatabase();
      return interaction.reply('🔒 **Janela de transferências FECHADA!**');
    }

    if (commandName === 'setmarketchannel') {
      const channel = options.getChannel('canal');
      db.marketChannelId = channel.id;
      saveDatabase();
      return interaction.reply(`✅ Canal de mercado definido para: ${channel}`);
    }

    if (commandName === 'setrosterlimit') {
      const limit = options.getInteger('limite');
      db.rosterLimit = limit;
      saveDatabase();
      return interaction.reply(`✅ Limite de elenco (Roster Cap) definido para **${limit}**.`);
    }

    if (commandName === 'setownercargos') {
      const owner = options.getRole('owner');
      const assistant = options.getRole('assistant');
      db.ownerRoleIds = [owner.id];
      if (assistant) db.ownerRoleIds.push(assistant.id);
      saveDatabase();
      return interaction.reply(`✅ Cargos de gestão configurados com sucesso!`);
    }

    if (commandName === 'addteam') {
      const role = options.getRole('cargo');
      const emoji = options.getString('emoji');
      const logoUrl = options.getString('escudo');

      db.teams = db.teams.filter(t => t.roleId !== role.id);
      db.teams.push({ roleId: role.id, emoji, logoUrl });
      saveDatabase();

      return interaction.reply(`✅ Time ${role} adicionado com sucesso com o emoji ${emoji}!`);
    }

    if (commandName === 'removeteam') {
      const role = options.getRole('cargo');
      db.teams = db.teams.filter(t => t.roleId !== role.id);
      saveDatabase();
      return interaction.reply(`🗑️ Time ${role} removido do sistema.`);
    }
  }

  // ---------------------------------------------------------
  // 2. VALIDAÇÃO DE JANELA FECHADA
  // ---------------------------------------------------------
  if (['offer', 'release', 'demand'].includes(commandName) && !db.marketOpen) {
    return interaction.reply({
      content: '🔒 **Mercado Fechado!**\nA janela de transferências está fechada no momento. Aguarde a abertura oficial da administração.',
      ephemeral: true
    });
  }

  // ---------------------------------------------------------
  // 3. COMANDO /OFFER
  // ---------------------------------------------------------
  if (commandName === 'offer') {
    if (!isCoach(member)) {
      return interaction.reply({ content: '❌ Apenas membros com cargo de **Club Owner** ou **Assistant** podem fazer ofertas.', ephemeral: true });
    }

    const team = getUserTeam(member);
    if (!team) {
      return interaction.reply({ content: '❌ Você não pertence a nenhum time cadastrado no bot.', ephemeral: true });
    }

    const targetUser = options.getUser('player');
    const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);

    if (!targetMember || targetUser.bot) {
      return interaction.reply({ content: '❌ Jogador inválido.', ephemeral: true });
    }

    if (getUserTeam(targetMember)) {
      return interaction.reply({ content: `⚠️ O jogador ${targetUser} já pertence a uma equipe!`, ephemeral: true });
    }

    const teamRole = guild.roles.cache.get(team.roleId);
    const currentRosterCount = teamRole ? teamRole.members.size : 0;

    if (currentRosterCount >= db.rosterLimit) {
      return interaction.reply({ content: `🔋 **Elenco Cheio!** O time já possui **${currentRosterCount}/${db.rosterLimit}** jogadores.`, ephemeral: true });
    }

    // Botões de Aceite/Recusa
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('accept_offer').setLabel('Aceitar').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('decline_offer').setLabel('Recusar').setStyle(ButtonStyle.Danger)
    );

    await interaction.reply({
      content: `📝 ${targetUser}, você recebeu uma proposta para entrar no time **${teamRole.name}** de ${member}!`,
      components: [row]
    });

    const replyMsg = await interaction.fetchReply();
    const collector = replyMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

    collector.on('collect', async i => {
      if (i.user.id !== targetUser.id) {
        return i.reply({ content: '❌ Apenas o jogador convidado pode responder a esta proposta.', ephemeral: true });
      }

      if (i.customId === 'decline_offer') {
        await i.update({ content: `❌ ${targetUser} recusou a proposta do ${teamRole.name}.`, components: [] });
        return;
      }

      if (i.customId === 'accept_offer') {
        // Adiciona o cargo do time ao jogador
        await targetMember.roles.add(teamRole);

        const newRosterCount = teamRole.members.size;
        const marketChannel = guild.channels.cache.get(db.marketChannelId);

        // Montagem do Embed idêntico ao TeamSign
        const embed = new EmbedBuilder()
          .setColor(0xFF0000)
          .setAuthor({ name: guild.name, iconURL: guild.iconURL() })
          .setTitle('Offer Accepted')
          .setThumbnail(team.logoUrl)
          .setDescription(`<@${targetUser.id}> \`${targetUser.username}\` has accepted the offer to ${team.emoji} <@&${team.roleId}>`)
          .addFields(
            { name: ' ', value: `• 👤 **Coach** - <@${member.id}> \`${member.user.username}\`` },
            { name: ' ', value: `• 🔋 **Roster Cap** - \`${newRosterCount}/${db.rosterLimit}\`` }
          );

        if (marketChannel) {
          await marketChannel.send({ embeds: [embed] });
        }

        await i.update({ content: `✅ Proposta aceita! ${targetUser} agora faz parte do **${teamRole.name}**!`, components: [] });
      }
    });
  }

  // ---------------------------------------------------------
  // 4. COMANDO /RELEASE
  // ---------------------------------------------------------
  if (commandName === 'release') {
    if (!isCoach(member)) {
      return interaction.reply({ content: '❌ Apenas membros com cargo de **Club Owner** ou **Assistant** podem dispensar jogadores.', ephemeral: true });
    }

    const team = getUserTeam(member);
    if (!team) {
      return interaction.reply({ content: '❌ Você não pertence a nenhum time cadastrado.', ephemeral: true });
    }

    const targetUser = options.getUser('player');
    const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);

    if (!targetMember || !targetMember.roles.cache.has(team.roleId)) {
      return interaction.reply({ content: '❌ O jogador informado não pertence ao seu time.', ephemeral: true });
    }

    const teamRole = guild.roles.cache.get(team.roleId);
    await targetMember.roles.remove(teamRole);

    const newRosterCount = teamRole.members.size;
    const marketChannel = guild.channels.cache.get(db.marketChannelId);

    const embed = new EmbedBuilder()
      .setColor(0x888888)
      .setAuthor({ name: guild.name, iconURL: guild.iconURL() })
      .setTitle('Player Released')
      .setThumbnail(team.logoUrl)
      .setDescription(`<@${targetUser.id}> \`${targetUser.username}\` has been released from ${team.emoji} <@&${team.roleId}>`)
      .addFields(
        { name: ' ', value: `• 👤 **Coach** - <@${member.id}> \`${member.user.username}\`` },
        { name: ' ', value: `• 🔋 **Roster Cap** - \`${newRosterCount}/${db.rosterLimit}\`` }
      );

    if (marketChannel) await marketChannel.send({ embeds: [embed] });

    return interaction.reply({ content: `✅ ${targetUser} foi dispensado com sucesso.`, ephemeral: true });
  }

  // ---------------------------------------------------------
  // 5. COMANDO /DEMAND
  // ---------------------------------------------------------
  if (commandName === 'demand') {
    const team = getUserTeam(member);
    if (!team) {
      return interaction.reply({ content: '❌ Você não pertence a nenhum time no momento.', ephemeral: true });
    }

    const teamRole = guild.roles.cache.get(team.roleId);
    await member.roles.remove(teamRole);

    const newRosterCount = teamRole.members.size;
    const marketChannel = guild.channels.cache.get(db.marketChannelId);

    const embed = new EmbedBuilder()
      .setColor(0xFFA500)
      .setAuthor({ name: guild.name, iconURL: guild.iconURL() })
      .setTitle('Contract Terminated')
      .setThumbnail(team.logoUrl)
      .setDescription(`<@${member.id}> \`${member.user.username}\` has demanded out of ${team.emoji} <@&${team.roleId}>`)
      .addFields(
        { name: ' ', value: `• 🔋 **Roster Cap** - \`${newRosterCount}/${db.rosterLimit}\`` }
      );

    if (marketChannel) await marketChannel.send({ embeds: [embed] });

    return interaction.reply({ content: `✅ Você saiu do time **${teamRole.name}** e voltou a ser Free Agent!`, ephemeral: true });
  }

  // ---------------------------------------------------------
  // 6. COMANDO /ROSTER
  // ---------------------------------------------------------
  if (commandName === 'roster') {
    const role = options.getRole('time');
    const team = db.teams.find(t => t.roleId === role.id);

    const members = role.members.map(m => `• <@${m.id}> (\`${m.user.username}\`)`).join('\n') || '*Nenhum jogador no momento.*';

    const embed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle(`📋 Elenco - ${role.name}`)
      .setThumbnail(team ? team.logoUrl : null)
      .setDescription(members)
      .addFields({ name: '🔋 Roster Cap', value: `\`${role.members.size}/${db.rosterLimit}\`` });

    return interaction.reply({ embeds: [embed] });
  }

  // ---------------------------------------------------------
  // 7. COMANDO /FREEAGENCY
  // ---------------------------------------------------------
  if (commandName === 'freeagency') {
    const msg = options.getString('mensagem');
    const marketChannel = guild.channels.cache.get(db.marketChannelId);

    if (!marketChannel) {
      return interaction.reply({ content: '❌ Canal de Free Agency/Mercado não configurado.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setColor(0xFFD700)
      .setTitle('🏆 Free Agency')
      .setDescription(`<@${member.id}>\n${member.user.username}\n(${member.id})\n\n${msg}`)
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
      .setTimestamp();

    await marketChannel.send({ embeds: [embed] });
    return interaction.reply({ content: '✅ Seu anúncio de Free Agent foi enviado no canal!', ephemeral: true });
  }
});

// Autenticação
const token = process.env.TOKEN ? process.env.TOKEN.trim() : null;
if (token) {
  client.login(token).catch(err => console.error('[ERRO DISCORD LOGIN]:', err.message));
}
