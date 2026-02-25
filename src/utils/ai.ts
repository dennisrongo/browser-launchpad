/**
 * AI Provider API utilities
 * Handles API calls to OpenAI and Straico
 */

export interface OpenAIModel {
  id: string
  name: string
}

export interface StraicoModel {
  id: string
  name: string
  description?: string
}

/**
 * Fetch available models from Straico API
 */
export async function fetchStraicoModels(apiKey: string): Promise<StraicoModel[]> {
  try {
    const response = await fetch('https://api.straico.com/v2/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        errorData.message || `Failed to fetch models: ${response.status} ${response.statusText}`
      )
    }

    const data = await response.json()

    // Map Straico API response to our format
    // Adjust based on actual Straico API response structure
    const models: StraicoModel[] = (data.models || data.data || []).map((model: any) => ({
      id: model.id || model.model,
      name: model.name || model.display_name || model.id || model.model,
      description: model.description,
    }))

    return models
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Failed to fetch Straico models')
  }
}

/**
 * Validate OpenAI API key
 */
export async function validateOpenAIKey(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    })

    return response.ok
  } catch {
    return false
  }
}

/**
 * Get available OpenAI models (static list)
 * OpenAI doesn't have a public models endpoint that works with API keys
 */
export function getOpenAIModels(): OpenAIModel[] {
  return [
    { id: 'gpt-4', name: 'GPT-4' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
    { id: 'gpt-4-turbo-preview', name: 'GPT-4 Turbo Preview' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
    { id: 'gpt-3.5-turbo-16k', name: 'GPT-3.5 Turbo 16K' },
  ]
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface ChatCompletionResponse {
  content: string
  model: string
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

/**
 * Send chat completion request to OpenAI
 */
export async function sendOpenAIChat(
  apiKey: string,
  model: string,
  messages: ChatMessage[]
): Promise<ChatCompletionResponse> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: messages.map(({ role, content }) => ({ role, content })),
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        errorData.error?.message || `OpenAI API error: ${response.status} ${response.statusText}`
      )
    }

    const data = await response.json()

    return {
      content: data.choices[0]?.message?.content || '',
      model: data.model,
      usage: data.usage,
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Failed to send chat completion to OpenAI')
  }
}

/**
 * Send chat completion request to Straico
 */
export async function sendStraicoChat(
  apiKey: string,
  model: string,
  messages: ChatMessage[]
): Promise<ChatCompletionResponse> {
  try {
    const response = await fetch('https://api.straico.com/v0/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: messages.map(({ role, content }) => ({ role, content })),
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        errorData.message || errorData.error?.message || `Straico API error: ${response.status} ${response.statusText}`
      )
    }

    const data = await response.json()

    return {
      content: data.choices?.[0]?.message?.content || data.message?.content || '',
      model: data.model || model,
      usage: data.usage,
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Failed to send chat completion to Straico')
  }
}
