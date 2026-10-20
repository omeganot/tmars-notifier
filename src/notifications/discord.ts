import { redis } from "../redis"

export async function setEndpoint(userName: string, endpoint: string): Promise<void> {
  await redis.set(`discord:${userName}`, endpoint)
}

export async function getEndpoint(userName: string): Promise<string | null> {
  return redis.get(`discord:${userName}`)
}

export async function sendNotification(userName: string, message: string, link?: string | null): Promise<string | null> {
  const webhookUrl = await getEndpoint(userName)
  if (!webhookUrl) {
    return null
  }
  console.log(`Sending Discord notification to ${userName} with message: ${message} and link: ${link} (webhook: ${webhookUrl})`)

  const payload = {
    content: `🚀 **TMars Notification**\n\n${message}`,
    username: "TMars Notifier",
    avatar_url: "https://raw.githubusercontent.com/terraforming-mars/terraforming-mars/refs/heads/main/assets/favicon.ico",
    embeds: [
      {
        title: "Terraforming Mars",
        description: message,
        url: link, // Add the game link to the embed
        color: 0xff6b35, // Orange color for Mars theme
        fields: [
          {
            name: `Action Required for player ${userName}`,
            value: link ? `[🎮 Join the game!](${link})` : "It's your turn!",
            inline: true,
          },
        ],
        timestamp: new Date().toISOString(),
        footer: {
          text: "TMars Notifier",
          icon_url: "https://raw.githubusercontent.com/terraforming-mars/terraforming-mars/refs/heads/main/assets/favicon.ico",
        },
      },
    ],
  }

  try {
    const response = await fetch(`${webhookUrl}?wait=true`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      console.error(`Discord notification failed: ${response.status} ${response.statusText}`)
      return null
    }

    const data = await response.json()
    return data?.id ?? null
  } catch {
    return null
  }
}

export async function sendGameEndNotification(userName: string, gameId: string, link?: string | null): Promise<string | null> {
  const webhookUrl = await getEndpoint(userName)
  if (!webhookUrl) {
    return null
  }
  console.log(`Sending Discord game end notification to ${userName} with link: ${link} (webhook: ${webhookUrl})`)

  const payload = {
    content: `🚀 **TMars Game ${gameId} Has Ended!**`,
    username: "TMars Notifier",
    avatar_url: "https://raw.githubusercontent.com/terraforming-mars/terraforming-mars/refs/heads/main/assets/favicon.ico",
    embeds: [
      {
        title: "Terraforming Mars",
        description: `Game ${gameId} has ended`,
        url: link, // Add the game link to the embed
        color: 0xff6b35, // Orange color for Mars theme
        fields: [
          {
            name: `Good game, ${userName}`,
            value: link ? `[🎮 View the game results](${link})` : "Thanks for playing!",
            inline: true,
          },
        ],
        timestamp: new Date().toISOString(),
        footer: {
          text: "TMars Notifier",
          icon_url: "https://raw.githubusercontent.com/terraforming-mars/terraforming-mars/refs/heads/main/assets/favicon.ico",
        },
      },
    ],
  }

  try {
    const response = await fetch(`${webhookUrl}?wait=true`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      console.error(`Discord notification failed: ${response.status} ${response.statusText}`)
      return null
    }

    const data = await response.json()
    return data?.id ?? null
  } catch {
    return null
  }
}

export async function deleteNotification(userName: string, notificationId: string): Promise<void> {
  const webhookUrl = await getEndpoint(userName)
  if (!webhookUrl) {
    return
  }

  try {
    const deleteUrl = `${webhookUrl}/messages/${notificationId}`
    await fetch(deleteUrl, { method: "DELETE" })
    console.log(`Deleted Discord notification ${notificationId} for ${userName}`)
  } catch {
    // Best-effort deletion — ignore errors
  }
}
