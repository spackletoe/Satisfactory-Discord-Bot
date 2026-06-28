const { formatMinutes } = require('./utils');
const { formatPlayerName, formatColoredPlayerList } = require('./playerNames');

const LONG_SESSION_MINUTES = 120;

const pick = (messages) => messages[Math.floor(Math.random() * messages.length)];

const buildPlayerCountLine = (onlinePlayers, maxPlayers) => {
  const count = onlinePlayers.length;
  const playerList = count > 0 ? `: ${formatColoredPlayerList(onlinePlayers)}` : '.';
  return `:pig2: **${count}** of ${maxPlayers} players online${playerList}`;
};

const formatPlayDuration = (minutes) => {
  if (minutes > LONG_SESSION_MINUTES) {
    return pick([
      'an embarrassing amount of time',
      'a marathon session',
      'an epic session',
      'way too long',
    ]);
  }

  return `**${formatMinutes(minutes)}**`;
};

const joinMessages = [
  (name) => `:exploding_head: ${formatPlayerName(name)} just entered the factory. You should join them! Maybe chat in shenanigans!? It'll be fun!`,
  (name) => `:bearded_person: Hey, why don't you jump in **The Fattest Sacktory!** ${formatPlayerName(name)} just did!`,
  (name) => `:construction_worker: ${formatPlayerName(name)} punched in. Somewhere, a belt is about to be overclocked.`,
  (name) => `:rocket: ${formatPlayerName(name)} has arrived. Factory productivity has entered a new era. Probably.`,
  (name) => `:wave: Welcome back, ${formatPlayerName(name)}! The spaghetti lines missed you.`,
  (name) => `:tools: ${formatPlayerName(name)} logged in. Time to pretend this was the plan all along.`,
  (name) => `:sparkles: ${formatPlayerName(name)} joined the server. FICSIT is pleased. FICSIT is always pleased.`,
];

const leaveMessagesWithDuration = [
  (name, duration) => `:checkered_flag: ${formatPlayerName(name)} had real life get in the way and left the Factory after playing for ${duration}.`,
  (name, duration) => `:checkered_flag: ${formatPlayerName(name)} finished barricading an offline player, which took just ${duration}.`,
  (name, duration) => `:arrow_left: ${formatPlayerName(name)} just left the server after playing for ${duration}.`,
  (name, duration) => `:coffee: ${formatPlayerName(name)} remembered they have a life outside the factory and left after ${duration}.`,
  (name, duration) => `:broom: ${formatPlayerName(name)} clocked out after ${duration} of questionable factory decisions.`,
];

const leaveMessagesVague = [
  (name) => `:checkered_flag: ${formatPlayerName(name)} might have fallen asleep while playing because they just logged off after a marathon session.`,
  (name) => `:white_check_mark: ${formatPlayerName(name)} finally finished doing "one more thing" and left after an epic session.`,
  (name, duration) => `:zzz: ${formatPlayerName(name)} logged off after playing for ${duration}.`,
  (name, duration) => `:sleeping: ${formatPlayerName(name)} left the factory after ${duration}. The lights stay on. They always do.`,
  (name) => `:door: ${formatPlayerName(name)} slipped out quietly. The factory hums on without them.`,
  (name) => `:wave: ${formatPlayerName(name)} has left the building. The belts keep moving. They always do.`,
];

const buildJoinMessage = (playerName, onlinePlayers, maxPlayers) => {
  const statusLine = buildPlayerCountLine(onlinePlayers, maxPlayers);
  const flavorLine = pick(joinMessages)(playerName);
  return `${statusLine}\n    ${flavorLine}`;
};

const buildLeaveMessage = (playerName, playTimeInMinutes, onlinePlayers, maxPlayers) => {
  const statusLine = buildPlayerCountLine(onlinePlayers, maxPlayers);
  const duration = formatPlayDuration(playTimeInMinutes);
  const flavorLine = playTimeInMinutes > LONG_SESSION_MINUTES
    ? pick(leaveMessagesVague)(playerName, duration)
    : pick([...leaveMessagesWithDuration, ...leaveMessagesVague])(playerName, duration);
  return `${statusLine}\n    ${flavorLine}`;
};

module.exports = {
  buildJoinMessage,
  buildLeaveMessage,
  formatPlayDuration,
  joinMessages,
  leaveMessagesWithDuration,
  leaveMessagesVague,
  LONG_SESSION_MINUTES,
};
