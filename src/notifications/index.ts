import { redis } from "../redis"
import * as Discord from "./discord"
import * as Gotify from "./gotify"
import { Notifier } from "./notifier"
import * as Ntfy from "./ntfy"

type NotificationEngine = "gotify" | "ntfy" | "discord"

type NotificationData = {
  id: string
  name: string
  placeholder: string
  helpText: string // Optional help text for the UI
}

export function assertNotificationEngine(notificationEngine: string): notificationEngine is NotificationEngine {
  switch (notificationEngine) {
    case "gotify":
    case "ntfy":
    case "discord":
      return true
    default:
      throw new Error(`Invalid notification engine: ${notificationEngine}`)
  }
}

function getNotifier(engine: NotificationEngine): Notifier {
  switch (engine) {
    case "gotify":
      return Gotify
    case "ntfy":
      return Ntfy
    case "discord":
      return Discord
    default:
      throw new Error(`Unknown notification engine: ${engine}`)
  }
}

export function listAvailableNotificationEngines(): NotificationData[] {
  return [
    {
      id: "gotify",
      name: "Gotify",
      placeholder: "https://gotify.example.com/message?clientToken=VOTRE_CLIENT_TOKEN&appToken=VOTRE_APP_TOKEN",
      helpText: "URL de votre serveur Gotify avec le token d'application",
    },
    {
      id: "ntfy",
      name: "Ntfy",
      placeholder: "https://ntfy.sh/votre-topic",
      helpText: "URL de votre topic ntfy.sh (ex: https://ntfy.sh/tmars-notifications)",
    },
    {
      id: "discord",
      name: "Discord",
      placeholder: "https://discord.com/api/webhooks/123456789/AbCdEf...",
      helpText: "URL du webhook Discord (Paramètres du serveur > Intégrations > Webhooks)",
    },
  ]
}

export async function setNotificationEngine(userName: string, engine: NotificationEngine): Promise<void> {
  await redis.set(`notification:${userName}`, engine)
}

export async function checkNotificationEngine(userName: string): Promise<boolean> {
  const value = await redis.get(`notification:${userName}`)
  const hasEngine = !value ? false : true;
  return hasEngine;
}

export async function getNotificationEngine(userName: string): Promise<NotificationEngine> {
  const value = await redis.get(`notification:${userName}`)
  if (!value) {
    throw new Error(`No notification engine set for user: ${userName}`)
  }
  return value as NotificationEngine
}

export async function setNotificationEndpoint(userName: string, endpoint: string): Promise<void> {
  const engine = await getNotificationEngine(userName)

  const notifier = getNotifier(engine)
  await notifier.setEndpoint(userName, endpoint)
  await redis.set(`${engine}:${userName}`, endpoint)
}

export async function getNotificationEndpoint(userName: string): Promise<string | null> {
  const engine = await getNotificationEngine(userName)
  return redis.get(`${engine}:${userName}`)
}

export async function sendNotification(userId: string, userName: string, message: string, link?: string | null): Promise<string | null> {
  const hasEngine = await checkNotificationEngine(userName)
  console.log(`User ${userName} has engine: ${hasEngine}`)
  if (hasEngine) {
    const engine = await getNotificationEngine(userName)

    try {
      const notifier = getNotifier(engine)

      const oldNotif = await redis.get(`tmars:${userId}:notification`)
      if (oldNotif) {
        await deleteNotification(userName, oldNotif)
      }

      const notificationId = await notifier.sendNotification(userName, message, link)
      if (notificationId) {
        await redis.set(`tmars:${userId}:notification`, notificationId)
      }
      return notificationId
    } catch (error) {
      console.log(`Error sending notification to ${userName} using ${engine}:`)
      return null
    }
  }
  else {
    return null
  }
}

export async function sendGameEndNotification(userId: string, userName: string, gameId: string, link?: string | null): Promise<string | null> {
  const hasEngine = await checkNotificationEngine(userName)
  console.log(`User ${userName} has engine: ${hasEngine}`)
  if (hasEngine) {
    const engine = await getNotificationEngine(userName)

    try {
      const notifier = getNotifier(engine)

      const oldNotif = await redis.get(`tmars:${userId}:notification`)
      if (oldNotif) {
        await deleteNotification(userName, oldNotif)
      }

      const notificationId = await notifier.sendGameEndNotification(userName, gameId, link)
      // if (notificationId) {
      //   await redis.set(`tmars:${userId}:notification`, notificationId)
      // }
      return notificationId
    } catch (error) {
      console.log(`Error sending notification to ${userName} using ${engine}:`)
      return null
    }
  }
  else {
    return null
  }
}

export async function deleteNotification(userName: string, notificationId: string): Promise<void> {
  const engine = await getNotificationEngine(userName)

  try {
    const notifier = getNotifier(engine)
    await notifier.deleteNotification(userName, notificationId)
  } catch (error) {
    console.log(`Error deleting notification ${notificationId} for ${userName} using ${engine}:`)
  }
}
