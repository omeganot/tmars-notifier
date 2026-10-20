import { env } from "../config"
import { checkNotificationEngine, sendNotification, sendGameEndNotification } from "../notifications"
import { redis } from "../redis"
import { TmarsApi } from "../tmars"
import { Phase } from "../tmars/types/phase"
import { SimpleGameModel } from "../tmars/types/SimpleGameModel"
import { clearPlayer, startPlayerRoutine } from "./players"

const gameIntervals = new Map<string, NodeJS.Timeout>()

const tmarsApi = new TmarsApi()

async function clearGame(gameId: string) {
  console.log(`Clearing game ${gameId}`)
  const game = await tmarsApi.game(gameId)
  // Clear all players in the game
  for (const user of game.players) {
    await clearPlayer(user)
  }

  // Clear the game interval
  if (gameIntervals.has(gameId)) {
    const interval = gameIntervals.get(gameId)
    clearInterval(interval)
    gameIntervals.delete(gameId)
  }
}

async function endGame(game: SimpleGameModel) {
  const gameId = game.id
  const alreadyNotified = await redis.get(`tmars:game:${gameId}:ended`)
  console.log(`Redis game notification state ${alreadyNotified}`)

  if (!alreadyNotified) {
    for (const user of game.players) {
      const link = `${env.tmarsUrl}/the-end?id=${user.id}`
      await sendGameEndNotification(user.id, gameId, `Game ${gameId} has ended`, link)
    }
  }
  await redis.set(`tmars:game:${gameId}:ended`, "true")

  await clearGame(gameId)
}

async function checkGame(gameId: string) {
  try {
    const game = await tmarsApi.game(gameId)

    // Do not handle games with only one player
    console.log(`Checking game ${gameId}`)
    if (game.phase == Phase.END) {
      console.log(`Game ${gameId} has ended`)
      endGame(game)
      return
    }

    for (const user of game.players) {
      const hasEngine = await checkNotificationEngine(user.name)
      if (hasEngine) {
        await startPlayerRoutine(user)
      }
    }
  } catch (error) {
    console.error(`Error checking game ${gameId}:`, (error as Error).message)
  }
}

export async function startGamesRouting() {
  await routeGames()
  setInterval(async () => routeGames(), 60000)
}

export async function routeGames()
{
  console.log(`Checking server for games...`)
  const games = await tmarsApi.games()

  for (const { gameId } of games) {
    console.log(`Found game ${gameId}`)
    const game = await tmarsApi.game(gameId)

    if (game.players.length <= 1) {
      console.log(`Game ${gameId} has only one player, skipping`)
      continue
    }

    if (game.phase == Phase.END) {
      const alreadyNotified = await redis.get(`tmars:game:${gameId}:ended`)
      if (!alreadyNotified)
      {
        console.log(`Game ${gameId} has ended, clearing it`)
        await endGame(game)
      }
      continue
    }
    if (!gameIntervals.has(gameId))
    {
      await checkGame(gameId)
      const interval = setInterval(async () => checkGame(gameId), 60000)
      gameIntervals.set(gameId, interval)
    }
  }
}
