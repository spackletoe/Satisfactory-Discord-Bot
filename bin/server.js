#! /usr/bin/env node

const { probe } = require('@djwoodz/satisfactory-dedicated-server-lightweight-query-probe');
const {
  Client, GatewayIntentBits, PermissionsBitField, ChannelType,
} = require('discord.js');
const merge = require('deepmerge');
const fs = require('fs');
const path = require('path');
const { onExit } = require('signal-exit');
const { Tail } = require('tail');
const config = require('dotenv-flow').config({
  silent: true,
});
const waitOn = require('wait-on');

if (Object.keys(config.parsed || {}).length === 0 && typeof process.env.SATISFACTORY_BOT_DISCORD_TOKEN === 'undefined') {
  console.error('Environment variables could not be loaded. Did you create a .env or .env.local file?');
  process.exit(1);
}

const { parse } = require('../src/utils/parser');
const {
  getDefaultDatabase,
  getOnlinePlayers,
  formatList,
} = require('../src/utils/utils');
const { buildJoinMessage, buildLeaveMessage } = require('../src/utils/messages');
const { setMemberResolver, normalizePlayerName } = require('../src/utils/playerNames');
const { getNextPurge, willPurge, purgeOldMessages } = require('../src/utils/purge');

const invalidUnknownNamesAndIds = ['INVALID', 'UNKNOWN'];

const dbPath = process.env.SATISFACTORY_BOT_DB_PATH;
const pollIntervalMillis = Math.max(
  parseInt(process.env.SATISFACTORY_BOT_POLL_INTERVAL_MINUTES, 10) || 1, // integer or 1
  1, // minimum of 1
) * 60000;

let intervalTimer = null;

let db = getDefaultDatabase();

let nextPurge = 0;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
  ],
});

const sendMessage = (message) => {
  if (message) {
    client.channels.cache.filter((channel) => (
      // if we do not have a server name, or we do and it matches
      !process.env.SATISFACTORY_BOT_DISCORD_SERVER_NAME
        || channel.guild.name === process.env.SATISFACTORY_BOT_DISCORD_SERVER_NAME
    )
      // and if we do not have a channel name, or we do and it matches
      && (!process.env.SATISFACTORY_BOT_DISCORD_CHANNEL_NAME
          || channel.name === process.env.SATISFACTORY_BOT_DISCORD_CHANNEL_NAME)
      // channel is a text channel
      && channel.type === ChannelType.GuildText
      // we have permission to view and send
      && channel.guild.members.me.permissionsIn(channel)
        .has(PermissionsBitField.Flags.ViewChannel)
      && channel.guild.members.me.permissionsIn(channel)
        .has(PermissionsBitField.Flags.SendMessages)
      // channel can be sent to
      && channel.send).forEach((channel) => {
      console.log(`Sending message to: ${channel.guild.name}: ${channel.name}`);
      channel.send({
        content: message,
        allowedMentions: { parse: [] },
      })
        .catch((error) => {
          console.error(error);
        });
    });
  }
};

const attemptPurge = () => {
  const now = new Date().getTime();
  if (willPurge() && now >= nextPurge) {
    // set next purge time
    nextPurge = getNextPurge();
    console.log('Looking for messages to purge...');
    try {
      purgeOldMessages(client);
    } catch (e) {
      console.error(e);
    }
    console.log(`Next purge will be ${new Date(nextPurge)}`);
  }
};

const update = async () => {
  try {
    const previouslyUnreachable = db.server.unreachable;
    const previouslyOnline = db.server.online;

    console.log('Updating...');
    const rawData = await probe(
      process.env.SATISFACTORY_BOT_SERVER_IP,
      process.env.SATISFACTORY_BOT_SERVER_PORT,
      process.env.SATISFACTORY_BOT_SERVER_QUERY_TIMEOUT_MS,
    );

    if (previouslyUnreachable) {
      if (process.env.SATISFACTORY_BOT_DISABLE_UNREACHABLE_FOUND_MESSAGES !== 'true') {
        sendMessage(':thumbsup: The server has been **found**.');
      }
      db.server.unreachable = false;
    }

    if (rawData.serverState === 'Game ongoing') {
      if (!previouslyOnline) {
        sendMessage(':rocket: The server is **back online**!');
        sendMessage(`:rocket: Server version: **${rawData.serverVersion}**`);
      }

      db.server = {
        version: rawData.serverVersion,
        online: true,
        unreachable: false,
      };
    } else {
      if (previouslyOnline) {
        sendMessage(':tools: The server has gone **offline**.');
      }

      db.server = {
        version: rawData.serverVersion,
        online: false,
        unreachable: false,
      };
    }

    if (db?.server?.online) {
      client.user.setActivity(`online: ${getOnlinePlayers(db).length}/${process.env.SATISFACTORY_BOT_SERVER_MAX_PLAYERS}`);
    } else {
      client.user.setActivity('offline');
    }

    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
  } catch (error) {
    console.error(error);
    client.user.setActivity('unknown');
    if (!db.server.unreachable) {
      if (process.env.SATISFACTORY_BOT_DISABLE_UNREACHABLE_FOUND_MESSAGES !== 'true') {
        sendMessage(':man_shrugging: The server is **unreachable**.');
      }
      db.server.unreachable = true;
      db.server.online = false;
      fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
    }
  }

  attemptPurge();
};

const getPlayerFromDB = (userId) => db?.players?.[userId];

const getTargetGuilds = () => client.guilds.cache.filter((guild) => (
  !process.env.SATISFACTORY_BOT_DISCORD_SERVER_NAME
  || guild.name === process.env.SATISFACTORY_BOT_DISCORD_SERVER_NAME
));

const findDiscordUserIdForGameName = (gameName) => {
  const normalizedGameName = normalizePlayerName(gameName);
  let matchedUserId = null;

  getTargetGuilds().forEach((guild) => {
    if (matchedUserId) {
      return;
    }

    guild.members.cache.forEach((member) => {
      if (matchedUserId) {
        return;
      }

      const candidates = [member.displayName, member.user.username, member.nickname]
        .filter(Boolean);

      const hasMatch = candidates.some((candidate) => {
        const normalizedCandidate = normalizePlayerName(candidate);
        return normalizedCandidate === normalizedGameName
          || normalizedCandidate.startsWith(normalizedGameName)
          || normalizedCandidate.includes(normalizedGameName);
      });

      if (hasMatch) {
        matchedUserId = member.user.id;
      }
    });
  });

  return matchedUserId;
};

client.on('ready', async () => {
  const initTime = new Date().getTime();

  try {
    await Promise.all(getTargetGuilds().map((guild) => guild.members.fetch()));
    setMemberResolver(findDiscordUserIdForGameName);
    console.log('Guild member list loaded for colored player names.');
  } catch (error) {
    setMemberResolver(findDiscordUserIdForGameName);
    console.error('Unable to load guild members for colored player names. Enable the Server Members Intent in the Discord Developer Portal, or set SATISFACTORY_BOT_PLAYER_DISCORD_* values in .env.');
    console.error(error.message);
  }

  if (willPurge()) {
    if (process.env.SATISFACTORY_BOT_PURGE_DISCORD_CHANNEL_ON_STARTUP === 'true') {
      attemptPurge();
    } else {
      nextPurge = getNextPurge();
      console.log(`First purge will be ${new Date(nextPurge)}`);
    }
  }

  if (intervalTimer) {
    clearInterval(intervalTimer);
  }

  await update();

  intervalTimer = setInterval(() => {
    update();
  }, pollIntervalMillis);

  try {
    const logPath = process.env.SATISFACTORY_BOT_LOG_LOCATION?.trim();
    const logDir = path.dirname(logPath);

    const logMountDiagnostics = () => {
      if (fs.existsSync(logDir)) {
        try {
          const entries = fs.readdirSync(logDir);
          console.log(`Log directory exists: ${logDir}`);
          console.log(`Log directory contents: ${entries.length > 0 ? entries.join(', ') : '(empty)'}`);
        } catch (error) {
          if (error.code === 'EACCES') {
            console.error(`Cannot read log directory ${logDir}: permission denied.`);
            console.error('On Unraid, Satisfactory logs are usually owned by nobody with 770 permissions.');
            console.error('Ensure compose.yaml group_add includes GIDs 99 and 100, then recreate the container.');
          } else {
            console.error(`Cannot read log directory ${logDir}: ${error.message}`);
          }
        }
      } else {
        console.error(`Log directory does not exist: ${logDir}`);
        console.error('Check the compose volume mount and recreate the container after fixing it.');
      }
    };

    if (!fs.existsSync(logPath)) {
      console.log(`Waiting for log file to exist: ${logPath}`);
      logMountDiagnostics();
      await waitOn({
        resources: [
          logPath,
        ],
      });
    }

    const logStat = fs.statSync(logPath);
    if (!logStat.isFile()) {
      console.error(`SATISFACTORY_BOT_LOG_LOCATION is not a file: ${logPath}`);
      if (logStat.isDirectory()) {
        console.error('The path is a directory. With Docker, this usually means the bind-mount source on the host did not exist when the container was created — Docker creates a directory instead of mounting a file.');
        console.error('Remove the wrongly-created path on the host, point compose.yaml at the real Satisfactory Logs folder, then recreate the container.');
      }
      process.exit(4);
    }

    const tail = new Tail(logPath, {
      fromBeginning: true,
      useWatchFile: (process.env.SATISFACTORY_BOT_LOG_USE_WATCH_FILE === 'true'),
    });

    tail.on('error', (error) => {
      console.error('Log file tail error:', error.message);
      process.exit(3);
    });

    tail.on('line', (message) => {
      const data = parse(message);

      if (data !== null) {
        let userId;
        let leftPlayerName;
        let leftPlayerJoinTime;
        let commandLine;
        let commandLineArgument;

        switch (data.type) {
          case 'Log file open':
            // new log file
            console.log('Log file open', data.date);
            db.players = {};
            fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
            break;
          case 'Command line':
            commandLine = data.commandLine.match(/\S+/g);
            if (Array.isArray(commandLine)) {
              commandLine.forEach((arg) => {
                commandLineArgument = arg.match(/^-(?:NoLogTimes|LocalLogTimes|LogTimeCode)$/i);
                if (Array.isArray(commandLineArgument)) {
                  console.error(`Unsupported command line argument '${commandLineArgument[0]}' detected. Aborting...`);
                  process.exit(2);
                }
              });
            }

            break;
          case 'Login request':
            // if player not in database
            console.log('Login request', data.userId, data.name);
            if (invalidUnknownNamesAndIds.includes(data.userId)) {
              if (data.timestamp >= initTime && (process.env.SATISFACTORY_BOT_IGNORE_POLL_STATE_WHEN_MESSAGING !== 'false' || db?.server?.online)) {
                sendMessage(`:warning: **${data.name}'s** user ID is **${formatList(invalidUnknownNamesAndIds)}**. Character inventory may be missing. Please try restarting and rejoining...`);
              }
            } else if (!getPlayerFromDB(data.userId)) {
              db.players[data.userId] = {
                userId: data.userId,
                name: data.name,
                joinRequested: 0,
                joined: 0,
              };
            } else {
              // update/reset player
              getPlayerFromDB(data.userId).name = data.name;
              getPlayerFromDB(data.userId).joinRequested = 0;
              getPlayerFromDB(data.userId).joined = 0;
            }
            break;
          case 'Join request':
            console.log('Join request', data.name);
            userId = Object.values(db.players)
              .filter(({ name }) => name === data.name)?.[0]?.userId;
            if (userId && getPlayerFromDB(userId)) {
              // increment joinRequested
              getPlayerFromDB(userId).joinRequested += 1;
            }
            break;
          case 'Join succeeded':
            console.log('Join succeeded', data.name);
            userId = Object.values(db.players)
              .filter(({ name }) => name === data.name)?.[0]?.userId;
            if (userId && getPlayerFromDB(userId) && getPlayerFromDB(userId).joinRequested > 0) {
              getPlayerFromDB(userId).joined += 1;

              // set joinTime based on most recent join
              getPlayerFromDB(userId).joinTime = data.timestamp;

              // notify of each new join
              if (data.timestamp >= initTime && (process.env.SATISFACTORY_BOT_IGNORE_POLL_STATE_WHEN_MESSAGING !== 'false' || db?.server?.online)) {
                const onlinePlayers = getOnlinePlayers(db);
                sendMessage(buildJoinMessage(
                  data.name,
                  onlinePlayers,
                  process.env.SATISFACTORY_BOT_SERVER_MAX_PLAYERS,
                ));
                if (db?.server?.online) {
                  client.user.setActivity(`online: ${getOnlinePlayers(db).length}/${process.env.SATISFACTORY_BOT_SERVER_MAX_PLAYERS}`);
                }
              }
            }

            break;
          case 'Connection close':
            // if the player is in database
            console.log('Connection close', data.userId);
            if (invalidUnknownNamesAndIds.includes(data.userId)) {
              if (data.timestamp >= initTime && (process.env.SATISFACTORY_BOT_IGNORE_POLL_STATE_WHEN_MESSAGING !== 'false' || db?.server?.online)) {
                sendMessage(`:information_source: An **${formatList(invalidUnknownNamesAndIds)}** connection was closed.`);
              }
            } else if (getPlayerFromDB(data.userId)) {
              // delete
              leftPlayerName = getPlayerFromDB(data.userId).name;
              leftPlayerJoinTime = getPlayerFromDB(data.userId).joinTime;
              delete db.players[data.userId];

              // notify of each leave
              if (data.timestamp >= initTime && (process.env.SATISFACTORY_BOT_IGNORE_POLL_STATE_WHEN_MESSAGING !== 'false' || db?.server?.online)) {
                const onlinePlayers = getOnlinePlayers(db);
                const playTimeInMinutes = Math
                  .round((new Date().getTime() - leftPlayerJoinTime) / 60000);
                sendMessage(buildLeaveMessage(
                  leftPlayerName,
                  playTimeInMinutes,
                  onlinePlayers,
                  process.env.SATISFACTORY_BOT_SERVER_MAX_PLAYERS,
                ));
                if (db?.server?.online) {
                  client.user.setActivity(`online: ${getOnlinePlayers(db).length}/${process.env.SATISFACTORY_BOT_SERVER_MAX_PLAYERS}`);
                }
              }
            }
            break;
          default:
            break;
        }

        fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
      }
    });
  } catch (error) {
    console.error(error);
    process.exit(3);
  }
});

const initialise = () => {
  console.log(`Poll interval: ${pollIntervalMillis} milliseconds`);
  if (fs.existsSync(dbPath)) {
    try {
      db = merge(db, JSON.parse(fs.readFileSync(dbPath, 'utf8')));
      // reset players
      db.players = {};
      fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
      console.log(`Found: ${dbPath}`);
    } catch (e) {
      console.error(`Unable to read: ${dbPath}`);
    }
  } else {
    console.log(`New DB written: ${dbPath}`);
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
  }

  client.login(process.env.SATISFACTORY_BOT_DISCORD_TOKEN);
};

process.on('beforeExit', (code) => {
  console.log('Process beforeExit event with code: ', code);
});

onExit(() => {
  console.log('Logging out');
  client.destroy();
});

initialise();
