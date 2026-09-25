require("../../module-alias.js");

require("@/config/index.js");

const fs = require("fs");

const http = require("http");

const pino = require("pino");

const mongoose = require("mongoose");

const logger = require("@/log/index.js");

const dbdata = require("@/config/dbdata.js");

const BloomAuthy = require("@/auth/BloomAuthy.js");

const { default: makeWASocket, useMultiFileAuthState, makeInMemoryStore, Browsers } = require("@whiskeysockets/baileys");

process.env.NODE_NO_WARNINGS = "1";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const port = Number(process.env.PORT || 3000);

http.createServer((req, res) => { res.writeHead(200, { "Content-Type": "text/plain" }); res.end("BloomBot running\n"); }).listen(port, "0.0.0.0");

async function start() {
  
  if (dbdata.MONGO_URL) await mongoose.connect(dbdata.MONGO_URL);
  
  const sequelize = dbdata.DATABASE;
  
  await sequelize.authenticate();
  
  await sequelize.sync();
  
  const store = makeInMemoryStore({ logger: pino({ level: "silent" }) });
  
  let state, saveCreds;
  
  try { ({ state, saveCreds } = await BloomAuthy()); } catch (_) { ({ state, saveCreds } = await useMultiFileAuthState("application")); }
  
  const sock = makeWASocket({ auth: state, syncFullHistory: true, fireInitQueries: true, downloadHistory: true, printQRInTerminal: true, logger: pino({ level: "silent" }), browser: Browsers.macOS("Desktop"), getMessage: async key => { const msg = await store.loadMessage(key.remoteJid, key.id); return msg?.message; } });
  
  const phone = String(process.env.PAIRING_PHONE || "").replace(/\D/g, "");
  
  if (!state.creds.registered && phone && typeof sock.requestPairingCode === "function") setTimeout(async () => { try { const code = await sock.requestPairingCode(phone); console.log(`PAIRING_CODE=${code}`); } catch (e) { console.error("PAIRING_ERROR", e); } }, 5000);
  
  store.bind(sock.ev);
  
  await require("./brain.js")(sock);
  
  await require("@/events/connection_update")(sock, start, logger);
  
  await require("@/events/messages_upsert")(sock, store, logger);
  
  await require("@/events/group_participants_update")(sock, store, logger);
  
  await require("@/events/cb_call")(sock, store, logger);
  
  await require("@/events/contacts_update")(sock, store, logger);
  
  await require("@/events/creds_update")(sock, saveCreds, logger);
  
}

start().catch(console.error);




















