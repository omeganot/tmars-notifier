import { redis } from "../redis"

export async function setEndpoint(userName: string, endpoint: string): Promise<void> {
  await redis.set(`ntfy:${userName}`, endpoint)
}

export async function getEndpoint(userName: string): Promise<string | null> {
  return redis.get(`ntfy:${userName}`)
}

export async function sendNotification(userName: string, message: string, link?: string | null): Promise<string | null> {
  const endpoint = await getEndpoint(userName)
  if (!endpoint) {
    return null
  }

  // Convert the link into markdown format
  const mdLink = link ? `[Click here](${link})` : null

  console.log(`Sending Ntfy notification to ${userName} with message: ${message} and link: ${link} (endpoint: ${endpoint})`)

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      body: message + (mdLink ? `\n\n${mdLink}` : ""),
    })
    if (!response.ok) {
      return null
    }
    const data = await response.json()
    return data?.id ?? null
  } catch {
    return null
  }
}

export async function sendGameEndNotification(userName: string, gameId: string, link?: string | null): Promise<string | null> {
  const endpoint = await getEndpoint(userName)
  if (!endpoint) {
    return null
  }

  // Convert the link into markdown format
  const mdLink = link ? `[Click here](${link})` : null

  console.log(`Sending Ntfy game end notification to ${userName} with link: ${link} (endpoint: ${endpoint})`)

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      body: `Game ${gameId} has ended.` + (mdLink ? `\n\n${mdLink}` : ""),
    })
    if (!response.ok) {
      return null
    }
    const data = await response.json()
    return data?.id ?? null
  } catch {
    return null
  }
}

export async function deleteNotification(userName: string, notificationId: string): Promise<void> {
  const endpoint = await getEndpoint(userName)
  if (!endpoint) {
    return
  }

  try {
    const url = new URL(endpoint)
    const deleteUrl = `${url.origin}/v1/messages/${notificationId}`
    await fetch(deleteUrl, { method: "DELETE" })
    console.log(`Deleted Ntfy notification ${notificationId} for ${userName}`)
  } catch {
    // Best-effort deletion — ignore errors
  }
}
