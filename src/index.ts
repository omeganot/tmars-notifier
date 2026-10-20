import path from "path"

import express from "express"

import { env } from "./config"
import {
  assertNotificationEngine,
  listAvailableNotificationEngines,
  sendNotification,
  setNotificationEndpoint,
  setNotificationEngine,
} from "./notifications/index"
import { startGamesRouting } from "./routines/games"
import { TmarsApi } from "./tmars"

const tmarsApi = new TmarsApi()
const app = express()

app.listen(env.port, () => {
  console.log(`Server is running on http://localhost:${env.port}`)
})

app.use(express.json())

// Servir les fichiers statiques du frontend sur /ui
app.use("/ui", express.static(path.join(__dirname, "../dist/frontend")))

// Routes API avec préfixe /api
app.get("/api/participants", async (_req, res) => {
  const participants = await tmarsApi.listParticipants()
  return res.json(participants)
})

app.get("/api/notification/engines", (_req, res) => res.json(listAvailableNotificationEngines()))

app.get("/api/notification/set/:engine", async (req, res) => {
  const { engine } = req.params
  const { username, endpoint } = req.query
  if (typeof username !== "string" || typeof endpoint !== "string") {
    return res.status(400).send("Invalid query parameters")
  }

  if (!assertNotificationEngine(engine)) {
    return res.status(400).send("Invalid engine type")
  }

  console.log(`Setting notification engine for user: ${username}, engine: ${engine}`)
  await setNotificationEngine(username, engine)
  if (endpoint) {
    console.log(`Setting notification endpoint for user: ${username}, endpoint: ${endpoint}`)
    await setNotificationEndpoint(username, endpoint)
  }
  return res.sendStatus(200)
})

app.get("/api/notification/test", async (req, res) => {
  console.log("Testing notification endpoint")
  const { username } = req.query
  if (typeof username !== "string") {
    return res.status(400).send("Invalid query parameter")
  }

  const link = `${env.tmarsUrl}/player?id=${1000}`
  await sendNotification("1000", username, "TEST: Your turn to play!", link)
  return res.sendStatus(200)
})

// Route pour servir l'application Vue.js sur /ui/*
app.get("/ui/*", (_req, res) => {
  res.sendFile(path.join(__dirname, "../dist/frontend/index.html"))
})

startGamesRouting()
