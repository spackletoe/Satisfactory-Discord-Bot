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
  (name) => `:factory: ${formatPlayerName(name)} is here to optimize. Nothing is optimized yet.`,
  (name) => `:hammer_pick: ${formatPlayerName(name)} spawned in. The nearest power pole is suspiciously far away.`,
  (name) => `:chart_with_upwards_trend: Production rates have theoretically increased now that ${formatPlayerName(name)} is online.`,
  (name) => `:vertical_traffic_light: ${formatPlayerName(name)} has connected. Please pretend you read the safety briefing.`,
  (name) => `:footprints: ${formatPlayerName(name)} warped in with full inventory and zero shame.`,
  (name) => `:zap: ${formatPlayerName(name)} brought online. A smelter somewhere just caught fire. Probably unrelated.`,
  (name) => `:package: ${formatPlayerName(name)} has arrived to carry exactly one item across the entire map.`,
  (name) => `:compass: ${formatPlayerName(name)} logged in. The factory heard and prepared more conveyor belts.`,
  // FICSIT tips, loading screens, and in-jokes
  (name) => `:shield: FICSIT TIP: Don't die. ${formatPlayerName(name)} logged in anyway. Stay Effective.`,
  (name) => `:eyes: ${formatPlayerName(name)} joined. ADA is always watching.`,
  (name) => `:gear: Reticulating splines... ${formatPlayerName(name)} has arrived.`,
  (name) => `:zap: Charging the build gun... ${formatPlayerName(name)} is back on shift.`,
  (name) => `:potato: ${formatPlayerName(name)} connected. Sometimes all you need is a potato. They brought none.`,
  (name) => `:broom: Vacuuming the vacuum... ${formatPlayerName(name)} has entered the sector.`,
  (name) => `:factory: Assembling assemblers... ${formatPlayerName(name)} is online.`,
  (name) => `:dog: Feeding the lizard doggos... ${formatPlayerName(name)} has arrived. Probably with treats.`,
  (name) => `:construction_site: Polishing foundations... ${formatPlayerName(name)} is ready to place five more by hand.`,
  (name) => `:chart: Calculating optimal conveyor speeds... ${formatPlayerName(name)} will ignore the results.`,
  (name) => `:coffee: Calibrating the coffee cup... ${formatPlayerName(name)} punched in.`,
  (name) => `:wrench: Counting screws... ${formatPlayerName(name)} has joined. There are never enough.`,
  (name) => `:bulb: ${formatPlayerName(name)} spawned in. Faster belts don't necessarily mean faster production.`,
  (name) => `:calendar: ${formatPlayerName(name)} logged in. Is it Thursday yet?`,
  (name) => `:video_game: ${formatPlayerName(name)} joined. Level Up? Ha, kidding. We don't even have levels.`,
  (name) => `:handshake: Be nice to Steve — ${formatPlayerName(name)} is here and he's under a lot of pressure.`,
  (name) => `:spider: ${formatPlayerName(name)} connected. Arach-NO-phobia mode not required. Probably.`,
  (name) => `:satellite: Rerouting power from secondary backups... ${formatPlayerName(name)} brought online.`,
  (name) => `:100: Optimizing efficiency to 100%... ${formatPlayerName(name)} has arrived. Good luck with that.`,
];

const leaveMessagesWithDuration = [
  (name, duration) => `:checkered_flag: ${formatPlayerName(name)} had real life get in the way and left the Factory after playing for ${duration}.`,
  (name, duration) => `:checkered_flag: ${formatPlayerName(name)} finished barricading an offline player, which took just ${duration}.`,
  (name, duration) => `:arrow_left: ${formatPlayerName(name)} just left the server after playing for ${duration}.`,
  (name, duration) => `:coffee: ${formatPlayerName(name)} remembered they have a life outside the factory and left after ${duration}.`,
  (name, duration) => `:broom: ${formatPlayerName(name)} clocked out after ${duration} of questionable factory decisions.`,
  (name, duration) => `:triangular_flag_on_post: ${formatPlayerName(name)} rage-quit after ${duration} of telling themselves "one more milestone."`,
  (name, duration) => `:skull: ${formatPlayerName(name)} disconnected after ${duration}. Their half-built floor is now a monument to ambition.`,
  (name, duration) => `:battery: ${formatPlayerName(name)} powered down after ${duration}. The biomass burners shed a single tear.`,
  (name, duration) => `:mountain: ${formatPlayerName(name)} left after ${duration}. Peak efficiency did not survive the session.`,
  (name, duration) => `:card_index_dividers: ${formatPlayerName(name)} logged off after ${duration}. Their todo list remains, immortal and unfinished.`,
  (name, duration) => `:warning: ${formatPlayerName(name)} left after ${duration}. Several belts are now sending thoughts and prayers.`,
  (name, duration) => `:hourglass: ${formatPlayerName(name)} vanished after ${duration}. The factory assumes this was intentional. It was not.`,
  // FICSIT tips, loading screens, and in-jokes
  (name, duration) => `:broom: ${formatPlayerName(name)} left after ${duration}. Sweeping uranium under the rug...`,
  (name, duration) => `:construction_site: ${formatPlayerName(name)} disconnected after ${duration}. Hiding evidence of structural failures...`,
  (name, duration) => `:dna: ${formatPlayerName(name)} clocked out after ${duration}. Removing excess pioneer DNA...`,
  (name, duration) => `:earth_americas: ${formatPlayerName(name)} left after ${duration}. Ensuring optimal planet exploitation continues without them.`,
  (name, duration) => `:no_entry_sign: ${formatPlayerName(name)} logged off after ${duration}. Ignoring compliance regulations...`,
  (name, duration) => `:fire: ${formatPlayerName(name)} left after ${duration}. Generating artificial stress in their absence.`,
  (name, duration) => `:key: ${formatPlayerName(name)} disconnected. The key is a lie.`,
  (name, duration) => `:trophy: ${formatPlayerName(name)} left after ${duration}. GG EZ.`,
  (name, duration) => `:speech_balloon: ${formatPlayerName(name)} logged off after ${duration}. We'd love to stay and chat, but...`,
  (name, duration) => `:anger: ${formatPlayerName(name)} left after ${duration}. Your fun is wrong.`,
  (name, duration) => `:scroll: ${formatPlayerName(name)} disconnected after ${duration}. *insert lore here*`,
  (name, duration) => `:bathtub: ${formatPlayerName(name)} left after ${duration}. Hope they brought a towel.`,
  (name, duration) => `:octagonal_sign: ${formatPlayerName(name)} logged off after ${duration}. Abort.`,
  (name, duration) => `:question: ${formatPlayerName(name)} left after ${duration}. Are you real? Are they?`,
];

const leaveMessagesVague = [
  (name) => `:checkered_flag: ${formatPlayerName(name)} might have fallen asleep while playing because they just logged off after a marathon session.`,
  (name) => `:white_check_mark: ${formatPlayerName(name)} finally finished doing "one more thing" and left after an epic session.`,
  (name, duration) => `:zzz: ${formatPlayerName(name)} logged off after playing for ${duration}.`,
  (name, duration) => `:sleeping: ${formatPlayerName(name)} left the factory after ${duration}. The lights stay on. They always do.`,
  (name) => `:door: ${formatPlayerName(name)} slipped out quietly. The factory hums on without them.`,
  (name) => `:wave: ${formatPlayerName(name)} has left the building. The belts keep moving. They always do.`,
  (name) => `:ghost: ${formatPlayerName(name)} disappeared mid-project. FICSIT has no comment.`,
  (name) => `:coffin: ${formatPlayerName(name)} logged off after an embarrassing amount of time. The sun is up. This is fine.`,
  (name) => `:map: ${formatPlayerName(name)} left the server. Their exploration ping is still blinking somewhere in the void.`,
  (name) => `:robot: ${formatPlayerName(name)} finally stopped playing. The factory AI sends its condolences to their sleep schedule.`,
  // FICSIT tips, loading screens, and in-jokes
  (name) => `:skull_crossbones: ${formatPlayerName(name)} died and respawned IRL. FICSIT TIP: Don't die.`,
  (name) => `:heart: ${formatPlayerName(name)} left after an epic session. You are appreciated.`,
  (name) => `:eyes: ${formatPlayerName(name)} logged off. Look behind you.`,
  (name) => `:black_large_square: ${formatPlayerName(name)} disconnected. [REDACTED]`,
  (name) => `:repeat: ${formatPlayerName(name)} left after a marathon session. Now we have to load the game for you, all over again.`,
  (name) => `:handshake: ${formatPlayerName(name)} finally left. We own you — but only during business hours.`,
  (name) => `:sparkles: ${formatPlayerName(name)} logged off after way too long. Life + Universe + Everything.`,
  (name) => `:wave: ${formatPlayerName(name)} left. Hey, nice to see you again — next time.`,
  (name) => `:zzz: ${formatPlayerName(name)} fell asleep at the AWESOME Sink again.`,
  (name) => `:floppy_disk: ${formatPlayerName(name)} left. SAM is still scanning that hard drive from 3 hours ago.`,
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
