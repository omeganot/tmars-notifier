import { join } from "path"


import { env } from "../config"
import { Phase } from "./types/phase"
import { SimpleGameModel } from "./types/SimpleGameModel"
import { WaitingForModel } from "./types/WaitingForModel"
import { clearGame } from "../routines/games"

type GameId = string
type Games = {
  gameId: GameId
  participantIds: string[]
}[]

export class TmarsApi {
  public async games(): Promise<Games> {
    return this.request<Games>("/games", {})
  }

  public async game(id: string): Promise<SimpleGameModel> {
    return this.request<SimpleGameModel>("/game", { id })
  }

  public async listParticipants(): Promise<string[]> {
    const games = await this.games()
    const participants: Set<string> = new Set()

    for (const { gameId } of games) {
      const { players, phase } = await this.game(gameId)

      if (players.length <= 1) {
        console.log(`Game ${gameId} has only one player, skipping`)
        continue
      }

      if (phase == Phase.END) {
        console.log(`Game ${gameId} has ended, ignoring its participants`)
        continue
      }

      const names = players.map((p) => p.name)
      for (const name of names) {
        participants.add(name)
      }
    }

    return Array.from(participants.values())
  }

  public async waitingFor(id: string): Promise<WaitingForModel> {
    return this.request<WaitingForModel>("/waitingfor", { id, "gameAge":"", "undoCount":"" })
  }

  private async request<T>(endpoint: string, params: Record<string, string>): Promise<T> {
    const url = new URL(join(env.tmarsUrl, "api", endpoint))
    url.searchParams.append("serverId", env.tmarsToken)
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.append(key, value)
    }
    const result = await fetch(url)
    if (!result.ok) {
      throw new Error(`Failed to fetch ${endpoint} with params ${JSON.stringify(params)}: ${result.status} ${result.statusText}`)
    }
    const data = await result.json()
    return data as T
  }
}
