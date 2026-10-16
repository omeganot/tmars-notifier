import { env } from "../config"
import { deleteNotification, sendNotification } from "../notifications"
import { redis } from "../redis"
import { TmarsApi } from "../tmars"
import { SimplePlayerModel } from "../tmars/types/SimpleGameModel"

const playerIntervals = new Map<string, NodeJS.Timeout>()

const tmarsApi = new TmarsApi()

export async function startPlayerRoutine(user: SimplePlayerModel) {
  if (playerIntervals.has(user.id)) {
    return
  }
  console.log(`Starting player routine for ${user.name} (${user.id})`)
  const interval = setInterval(async () => checkPlayer(user), 5000)
  playerIntervals.set(user.id, interval)
}

export async function clearPlayer(user: SimplePlayerModel) {
  console.log(`Clearing player ${user.name} (${user.id})`)
  const interval = playerIntervals.get(user.id)
  if (interval) {
    clearInterval(interval)
    playerIntervals.delete(user.id)
  }
  await redis.delete(`tmars:${user.id}:notification`)
  // Unset the redis status for the player
  console.log(`Removing status for user ${user.name} (${user.id})`)
  await redis.delete(`tmars:${user.id}:status`)
}

async function checkPlayer(user: SimplePlayerModel) {
  // console.log(`Checking player ${user.name} (${user.id})`)
  const currentStatus = await redis.get(`tmars:${user.id}:status`)
  console.log(`Current status for player ${user.name}: ${currentStatus}`)
  try {
    const { result } = await tmarsApi.waitingFor(user.id)
    if (currentStatus !== result) {
      await redis.set(`tmars:${user.id}:status`, result)
      if (result === "GO") {
        console.log(`User ${user.name} is ready to play!`)
        const link = `${env.tmarsUrl}/player?id=${user.id}`
        await sendNotification(user.id, user.name, "Your turn to play!", link)
     // } else {
      } else if (currentStatus === "GO") { // This could prevent a user notification from being deleted when the game ends.
        // The waited-for player has changed away from this user — dismiss their notification
        const notificationId = await redis.get(`tmars:${user.id}:notification`)
        if (notificationId) {
          console.log(`Deleting last notification ${notificationId} for ${user.name} (${user.id})`)
          await deleteNotification(user.name, notificationId)
          await redis.delete(`tmars:${user.id}:notification`)
        }
      }
    }
  } catch (error) {
    console.error(`Error checking player ${user.name} (${user.id}):`, (error as Error).message)
    return
  }
}
