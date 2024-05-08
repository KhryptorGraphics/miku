import axios from 'axios'
import { NovelV3 } from '@mikugg/bot-utils'

export const spendSceneSuggestion = async (
  apiEndpoint: string
): Promise<void> => {
  await axios.post(
    `${apiEndpoint}/user/use-suggestion`,
    {},
    {
      withCredentials: true,
    }
  )
}

export const unlockAchievement = async (
  apiEndpoint: string,
  achievementId: string
): Promise<void> => {
  await axios.put(
    `${apiEndpoint}/achievement/${achievementId}`,
    {},
    {
      withCredentials: true,
    }
  )
}

export const getUnlockableAchievements = async (
  apiEndpoint: string,
  botId: string
): Promise<NovelV3.NovelObjective[]> => {
  if (!apiEndpoint || !botId) return []
  const { data } = await axios.get<
    {
      id: string
      name: string
      description: string
      condition: string
      scenes: string[]
      isEnabled: boolean
      botId: string
      inventoryItemId: string
      createdAt: Date
      updatedAt: Date
      inventoryItem: {
        id: string
        name: string
        description: string
        isPremium: boolean
        icon: string
        createdAt: Date
        updatedAt: Date
        actions: {
          id: string
          name: string
          prompt: string
          createdAt: Date
          updatedAt: Date
        }[]
      }
    }[]
  >(`${apiEndpoint}/achievements/${botId}/unlockable`, {
    withCredentials: true,
  })

  return data.map((achievement) => {
    return {
      id: achievement.id,
      name: achievement.name,
      description: achievement.description,
      sceneIds: achievement.scenes,
      condition: achievement.condition,
      action: {
        type: NovelV3.NovelObjectiveActionType.ACHIEVEMENT_UNLOCK,
        params: {
          achievementId: achievement.id,
          reward: {
            id: achievement.inventoryItem.id,
            name: achievement.inventoryItem.name,
            description: achievement.inventoryItem.description,
            image: achievement.inventoryItem.icon,
            isPremium: achievement.inventoryItem.isPremium,
            actions: achievement.inventoryItem.actions.map((action) => {
              return {
                name: action.name,
                prompt: action.prompt,
              }
            }),
          },
        },
      },
    }
  })
}

export const getUnlockedItems = async (
  apiEndpoint: string
): Promise<NovelV3.InventoryItem[]> => {
  if (!apiEndpoint) return []
  const { data } = await axios.get(`${apiEndpoint}/items/unlocked`, {
    withCredentials: true,
  })
  return data
}
