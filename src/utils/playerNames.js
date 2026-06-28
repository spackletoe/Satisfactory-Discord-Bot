// Game names are matched case-insensitively with spaces ignored.
//
// Colored names in Discord require @mentions — bold text is always white.
// Priority:
//   1. discordUserId below (or matching env var) → user's role color (e.g. orange)
//   2. Auto-match a guild member whose nickname/display name contains the game name
//   3. roleId → a dedicated colored role mention (for custom per-player colors)
//   4. emoji + bold fallback
const PLAYER_STYLES = {
  darthmcfraser: {
    emoji: '🟡',
    discordUserIdEnv: 'SATISFACTORY_BOT_PLAYER_DISCORD_DARTH_MCFRASER',
    roleIdEnv: 'SATISFACTORY_BOT_PLAYER_ROLE_DARTH_MCFRASER',
  },
  thechickening: {
    emoji: '🔴',
    discordUserIdEnv: 'SATISFACTORY_BOT_PLAYER_DISCORD_THE_CHICKENING',
    roleIdEnv: 'SATISFACTORY_BOT_PLAYER_ROLE_THE_CHICKENING',
  },
  crispycargo: {
    emoji: '🟣',
    discordUserIdEnv: 'SATISFACTORY_BOT_PLAYER_DISCORD_CRISPY_CARGO',
    roleIdEnv: 'SATISFACTORY_BOT_PLAYER_ROLE_CRISPY_CARGO',
  },
  tembrock: {
    emoji: '🟢',
    discordUserIdEnv: 'SATISFACTORY_BOT_PLAYER_DISCORD_TEMBROCK',
    roleIdEnv: 'SATISFACTORY_BOT_PLAYER_ROLE_TEMBROCK',
  },
};

let memberResolver = null;

const normalizePlayerName = (name) => name.toLowerCase().replace(/\s+/g, '');

const setMemberResolver = (resolver) => {
  memberResolver = resolver;
};

const getPlayerStyle = (name) => PLAYER_STYLES[normalizePlayerName(name)];

const resolveDiscordUserId = (name, style) => {
  if (style?.discordUserIdEnv) {
    const configuredUserId = process.env[style.discordUserIdEnv]?.trim();
    if (configuredUserId) {
      return configuredUserId;
    }
  }

  if (memberResolver) {
    return memberResolver(name);
  }

  return null;
};

const formatPlayerName = (name) => {
  const style = getPlayerStyle(name);

  const discordUserId = resolveDiscordUserId(name, style);
  if (discordUserId) {
    return `<@${discordUserId}>`;
  }

  if (style?.roleIdEnv) {
    const roleId = process.env[style.roleIdEnv]?.trim();
    if (roleId) {
      return `<@&${roleId}>`;
    }
  }

  if (style) {
    return `${style.emoji} **${name}**`;
  }

  return `**${name}**`;
};

const formatColoredPlayerList = (players) => {
  const formatter = new Intl.ListFormat('en', { style: 'long', type: 'conjunction' });
  return formatter.format(
    players
      .map(({ name }) => formatPlayerName(name))
      .sort((playerA, playerB) => playerA.toLowerCase().localeCompare(playerB.toLowerCase())),
  );
};

module.exports = {
  formatPlayerName,
  formatColoredPlayerList,
  getPlayerStyle,
  normalizePlayerName,
  setMemberResolver,
  PLAYER_STYLES,
};
