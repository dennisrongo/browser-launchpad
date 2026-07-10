import { logger } from '../utils/logger'
import type { GoogleTask, GoogleTaskList } from '../types'

const TASKS_SCOPES = ['https://www.googleapis.com/auth/tasks']

const TASKS_API_BASE = 'https://tasks.googleapis.com/tasks/v1'

async function getAuthToken(interactive: boolean): Promise<string> {
  const result = await chrome.identity.getAuthToken({
    interactive,
    scopes: TASKS_SCOPES,
  })

  if (!result.token) {
    throw new Error(
      interactive
        ? 'Google Tasks sign-in did not return an access token.'
        : 'Google Tasks is not connected.'
    )
  }

  return result.token
}

export async function initiateGoogleTasksAuth(): Promise<string> {
  return getAuthToken(true)
}

export async function getTasksAccessToken(): Promise<string> {
  return getAuthToken(false)
}

export async function fetchGoogleTaskLists(accessToken: string): Promise<GoogleTaskList[]> {
  const response = await fetch(`${TASKS_API_BASE}/users/@me/lists`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Unauthorized - please reconnect Google Tasks')
    }
    const error = await response.text()
    throw new Error(`Failed to fetch task lists: ${error}`)
  }

  const data = await response.json()

  return (data.items || []).map((item: any) => ({
    id: item.id,
    title: item.title,
    selfLink: item.selfLink,
  }))
}

export async function fetchGoogleTasks(
  accessToken: string,
  taskListId: string,
  showCompleted: boolean
): Promise<GoogleTask[]> {
  const params = new URLSearchParams({
    showCompleted: String(showCompleted),
    showDeleted: 'false',
    showHidden: 'true',
    maxResults: '100',
  })

  const response = await fetch(
    `${TASKS_API_BASE}/lists/${encodeURIComponent(taskListId)}/tasks?${params}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  )

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Unauthorized - please reconnect Google Tasks')
    }
    const error = await response.text()
    throw new Error(`Failed to fetch tasks: ${error}`)
  }

  const data = await response.json()

  return (data.items || []).map((item: any) => ({
    id: item.id,
    title: item.title,
    status: item.status,
    completed: item.completed ?? null,
    updated: item.updated,
    due: item.due ?? null,
    notes: item.notes,
    position: item.position,
  }))
}

export async function createGoogleTask(
  accessToken: string,
  taskListId: string,
  title: string
): Promise<GoogleTask> {
  const response = await fetch(`${TASKS_API_BASE}/lists/${encodeURIComponent(taskListId)}/tasks`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title }),
  })

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Unauthorized - please reconnect Google Tasks')
    }
    const error = await response.text()
    throw new Error(`Failed to create task: ${error}`)
  }

  const item = await response.json()

  return {
    id: item.id,
    title: item.title,
    status: item.status,
    completed: item.completed ?? null,
    updated: item.updated,
    due: item.due ?? null,
    notes: item.notes,
    position: item.position,
  }
}

export async function updateGoogleTask(
  accessToken: string,
  taskListId: string,
  taskId: string,
  patch: Partial<Pick<GoogleTask, 'title' | 'status' | 'completed' | 'due' | 'notes'>>
): Promise<GoogleTask> {
  const response = await fetch(
    `${TASKS_API_BASE}/lists/${encodeURIComponent(taskListId)}/tasks/${encodeURIComponent(taskId)}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id: taskId, ...patch }),
    }
  )

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Unauthorized - please reconnect Google Tasks')
    }
    const error = await response.text()
    throw new Error(`Failed to update task: ${error}`)
  }

  const item = await response.json()

  return {
    id: item.id,
    title: item.title,
    status: item.status,
    completed: item.completed ?? null,
    updated: item.updated,
    due: item.due ?? null,
    notes: item.notes,
    position: item.position,
  }
}

export async function deleteGoogleTask(
  accessToken: string,
  taskListId: string,
  taskId: string
): Promise<void> {
  const response = await fetch(
    `${TASKS_API_BASE}/lists/${encodeURIComponent(taskListId)}/tasks/${encodeURIComponent(taskId)}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  )

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Unauthorized - please reconnect Google Tasks')
    }
    const error = await response.text()
    throw new Error(`Failed to delete task: ${error}`)
  }
}

export async function disconnectGoogleTasks(): Promise<void> {
  try {
    const token = await getAuthToken(false).catch(() => null)

    if (token) {
      try {
        await chrome.identity.removeCachedAuthToken({ token })
      } catch (error) {
        logger.error('Error removing cached Google Tasks token:', error)
      }
    }

    try {
      await chrome.identity.clearAllCachedAuthTokens()
    } catch (error) {
      logger.error('Error clearing cached Google auth tokens:', error)
    }
  } catch (error) {
    logger.error('Error disconnecting Google Tasks:', error)
  }
}