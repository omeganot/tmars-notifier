import { redis } from "../redis"

export async function setEndpoint(userName: string, endpoint: string): Promise<void> {
  await redis.set(`gotify:${userName}`, endpoint)
}

export async function getEndpoint(userName: string): Promise<string | null> {
  return redis.get(`gotify:${userName}`)
}

export async function sendNotification(userName: string, message: string, link?: string | null): Promise<string | null> {
  const endpoint = await getEndpoint(userName)
  if (!endpoint) {
    return null
  }

  const endpointUrl = new URL(endpoint)
  const appToken = endpointUrl.searchParams.get("appToken")
  const clientToken = endpointUrl.searchParams.get("clientToken")

  // Convert the link into markdown format
  const mdLink = link ? `[Click here](${link})` : null
  try {
    const url = new URL(endpoint)
    url.searchParams.set("token", appToken ?? "")
    const result = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Gotify-Key": clientToken ?? "" },
      body: JSON.stringify({
        title: `Tmars Notification for ${userName}`,
        message: message + (mdLink ? `\n\n${mdLink}` : ""),
        extras: {
          "client::display": {
            contentType: "text/markdown",
          },
        },
      }),
    })

    const response = await result.json()

    return response.id != null ? String(response.id) : null
  } catch {
    return null
  }
}

export async function sendGameEndNotification(userName: string, gameId: string, link?: string | null): Promise<string | null> {
  const endpoint = await getEndpoint(userName)
  if (!endpoint) {
    return null
  }

  const endpointUrl = new URL(endpoint)
  const appToken = endpointUrl.searchParams.get("appToken")
  const clientToken = endpointUrl.searchParams.get("clientToken")

  // Convert the link into markdown format
  const mdLink = link ? `[Click here](${link})` : null
  try {
    const url = new URL(endpoint)
    url.searchParams.set("token", appToken ?? "")
    const result = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Gotify-Key": clientToken ?? "" },
      body: JSON.stringify({
        title: `Tmars Game ${gameId} Has Ended`,
        message: "View the results here" + (mdLink ? `\n\n${mdLink}` : ""),
        extras: {
          "client::display": {
            contentType: "text/markdown",
          },
        },
      }),
    })

    const response = await result.json()

    return response.id != null ? String(response.id) : null
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
    const endpointUrl = new URL(endpoint)
    const clientToken = endpointUrl.searchParams.get("clientToken")
    const deleteUrl = new URL(`${endpointUrl.origin}/message/${notificationId}`)

    const result = await fetch(deleteUrl, {
      method: "DELETE",
      headers: {
        "X-Gotify-Key": clientToken ?? "",
      },
    })
    if (result.ok) {
      console.log(`Deleted Gotify notification ${notificationId} for ${userName}`)
    } else {
      console.log(`Could not delete Gotify notification ${notificationId} for ${userName}`)
    }
  } catch {
    // Best-effort deletion — ignore errors
  }
}
