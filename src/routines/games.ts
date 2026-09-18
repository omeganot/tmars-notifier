import { env } from "../config"
import { sendNotification } from "../notifications"
import { redis } from "../redis"
import { TmarsApi } from "../tmars"
import { Phase } from "../tmars/types/phase"
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

async function checkGame(gameId: string) {
  try {
    const game = await tmarsApi.game(gameId)

    // Do not handle games with only one player
    console.log(`Checking game ${gameId}`)
    if (game.phase == Phase.END) {
      console.log(`Game ${gameId} has ended`)

      const alreadyNotified = await redis.get(`tmars:game:${gameId}:ended`)
      if (!alreadyNotified) {
        for (const user of game.players) {
          const link = `${env.tmarsUrl}/the-end?id=${user.id}`
          await sendNotification(user.id, user.name, `Game ${gameId} has ended`, link)
        }
      }
      await redis.set(`tmars:game:${gameId}:ended`, "true")

      await clearGame(gameId)
      return
    }

    for (const user of game.players) {
      await startPlayerRoutine(user)
    }
  } catch (error) {
    console.error(`Error checking game ${gameId}:`, (error as Error).message)
  }
}

export async function startGamesRouting() {
  const games = await tmarsApi.games()

  for (const { gameId } of games) {
    console.log(`Initialization, found game ${gameId}`)
    const game = await tmarsApi.game(gameId)

    if (game.players.length <= 1) {
      console.log(`Game ${gameId} has only one player, skipping`)
      continue
    }

    if (game.phase == Phase.END) {
      console.log(`Game ${gameId} has ended, clearing it`)
      await clearGame(gameId)
      continue
    }
    await checkGame(gameId)
    const interval = setInterval(async () => checkGame(gameId), 50000)
    gameIntervals.set(gameId, interval)
  }
}
