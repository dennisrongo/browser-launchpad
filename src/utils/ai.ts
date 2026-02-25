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

export interface ValidationResult {
  valid: boolean
  error?: string
}

export interface RateLimitInfo {
  isRateLimited: boolean
  retryAfter?: number // seconds to wait
  limitType?: 'rpm' | 'rpd' | 'tpm' | 'unknown'
  message?: string
}

/**
 * Parse rate limit information from response headers and error data
 */
export function parseRateLimitInfo(response: Response, errorData: any): RateLimitInfo {
  if (response.status !== 429) {
    return { isRateLimited: false }
  }

  // Check for retry-after header
  const retryAfter = response.headers.get('Retry-After')
  let retryAfterSeconds: number | undefined

  if (retryAfter) {
    const parsed = parseInt(retryAfter, 10)
    if (!isNaN(parsed)) {
      retryAfterSeconds = parsed
    }
  }

  // Parse error message for limit type
  const errorMessage = errorData.error?.message || errorData.message || ''
  let limitType: RateLimitInfo['limitType'] = 'unknown'

  if (errorMessage.includes('requests per minute') || errorMessage.includes('rpm')) {
    limitType = 'rpm'
  } else if (errorMessage.includes('requests per day') || errorMessage.includes('rpd')) {
    limitType = 'rpd'
  } else if (errorMessage.includes('tokens per minute') || errorMessage.includes('tpm')) {
    limitType = 'tpm'
  }

  // Build user-friendly message
  let message = 'Rate limit exceeded. Please wait a moment before trying again.'
  if (retryAfterSeconds) {
    message = `Rate limit exceeded. Please wait ${retryAfterSeconds} seconds before trying again.`
  }
  if (limitType !== 'unknown') {
    const limitName = limitType === 'rpm' ? 'requests per minute' :
                      limitType === 'rpd' ? 'requests per day' :
                      limitType === 'tpm' ? 'tokens per minute' : 'requests'
    message = `Too many ${limitName}. Please wait before trying again.`
  }

  return {
    isRateLimited: true,
    retryAfter: retryAfterSeconds,
    limitType,
    message,
  }
}

/**
 * Client-side validation for API key format
 * Checks basic format before making API calls
 */
export function validateApiKeyFormat(provider: 'openai' | 'straico', apiKey: string): ValidationResult {
  if (!apiKey || apiKey.trim().length === 0) {
    return { valid: false, error: 'API key cannot be empty' }
  }

  if (provider === 'openai') {
    // OpenAI keys start with 'sk-' and are typically 51 characters
    if (!apiKey.startsWith('sk-')) {
      return { valid: false, error: 'OpenAI API key must start with "sk-"' }
    }
    if (apiKey.length < 20) {
      return { valid: false, error: 'OpenAI API key appears to be too short' }
    }
  } else if (provider === 'straico') {
    // Straico keys are typically JWT format or UUID-like
    // Basic validation: not empty and reasonable length
    if (apiKey.length < 10) {
      return { valid: false, error: 'API key appears to be too short' }
    }
  }

  return { valid: true }
}

/**
 * Validate OpenAI API key by making a test API call
 */
export async function fetchStraicoModels(apiKey: string): Promise<StraicoModel[]> {
  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error('Straico: API key is required')
  }
  
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
      const errorMessage = errorData.message || ''

      // Provider-specific error messages for model fetching
      if (response.status === 401) {
        throw new Error('Straico: Invalid API key. Please check your API key in widget settings.')
      }
      if (response.status === 403) {
        throw new Error('Straico: Access denied. Please verify your API key permissions.')
      }
      if (response.status === 429) {
        const rateLimitInfo = parseRateLimitInfo(response, errorData)
        throw new Error(`Straico: ${rateLimitInfo.message}`)
      }

      throw new Error(
        errorMessage || `Failed to fetch models: ${response.status} ${response.statusText}`
      )
    }

    const data = await response.json()

    // Map Straico API response to our format
    const models: StraicoModel[] = (data.models || data.data || []).map((model: any) => ({
      id: model.id || model.model,
      name: model.name || model.display_name || model.id || model.model,
      description: model.description,
    }))

    return models
  } catch (error) {
    if (error instanceof Error) {
      // Add network error context
      if (error.message.includes('fetch') || error.message.includes('network') || error.name === 'TypeError') {
        throw new Error('Straico: Network error. Please check your internet connection and try again.')
      }
      throw error
    }
    throw new Error('Failed to fetch Straico models')
  }
}

/**
 * Validate OpenAI API key by making a test API call
 */
export async function validateOpenAIKey(apiKey: string): Promise<ValidationResult> {
  // First check format
  const formatCheck = validateApiKeyFormat('openai', apiKey)
  if (!formatCheck.valid) {
    return formatCheck
  }

  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    })

    if (response.ok) {
      return { valid: true }
    }

    // Handle specific error codes
    if (response.status === 401) {
      return { valid: false, error: 'Invalid API key. Please check your OpenAI API key.' }
    } else if (response.status === 429) {
      return { valid: false, error: 'Rate limited. Please try again later.' }
    } else {
      const errorData = await response.json().catch(() => ({}))
      return {
        valid: false,
        error: errorData.error?.message || `API error: ${response.status} ${response.statusText}`
      }
    }
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Network error. Please check your connection.'
    }
  }
}

/**
 * Validate Straico API key by making a test API call
 */
export async function validateStraicoKey(apiKey: string): Promise<ValidationResult> {
  // First check format
  const formatCheck = validateApiKeyFormat('straico', apiKey)
  if (!formatCheck.valid) {
    return formatCheck
  }

  try {
    const response = await fetch('https://api.straico.com/v2/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    })

    if (response.ok) {
      return { valid: true }
    }

    // Handle specific error codes
    if (response.status === 401) {
      return { valid: false, error: 'Invalid API key. Please check your Straico API key.' }
    } else if (response.status === 403) {
      return { valid: false, error: 'Access denied. Please check your API key permissions.' }
    } else if (response.status === 429) {
      return { valid: false, error: 'Rate limited. Please try again later.' }
    } else {
      const errorData = await response.json().catch(() => ({}))
      return {
        valid: false,
        error: errorData.message || errorData.error?.message || `API error: ${response.status} ${response.statusText}`
      }
    }
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Network error. Please check your connection.'
    }
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
  timestamp?: string
}

export interface ChatCompletionResponse {
  content: string
  model: string
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
  cost?: number
}

export interface StreamingChatCallback {
  onChunk: (content: string) => void
  onComplete: (response: ChatCompletionResponse) => void
  onError: (error: Error) => void
}

/**
 * Send chat completion request to OpenAI (non-streaming)
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
      const errorMessage = errorData.error?.message || ''

      // Provide specific, actionable error messages for OpenAI
      if (response.status === 401) {
        throw new Error('OpenAI: Invalid API key. Please check your API key in widget settings.')
      }
      if (response.status === 429) {
        const rateLimitInfo = parseRateLimitInfo(response, errorData)
        throw new Error(`OpenAI: ${rateLimitInfo.message}`)
      }
      if (response.status === 500) {
        throw new Error('OpenAI: Service error. Please try again later.')
      }
      if (errorMessage.includes('insufficient_quota')) {
        throw new Error('OpenAI: Insufficient quota. Please check your billing details.')
      }
      if (errorMessage.includes('model_not_found')) {
        throw new Error('OpenAI: Model not found. Please select a valid model in settings.')
      }

      throw new Error(
        errorMessage || `OpenAI API error (${response.status}): ${response.statusText}`
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
      // Add network error context
      if (error.message.includes('fetch') || error.message.includes('network')) {
        throw new Error('OpenAI: Network error. Please check your internet connection and try again.')
      }
      throw error
    }
    throw new Error('Failed to send chat completion to OpenAI')
  }
}

/**
 * Send streaming chat completion request to OpenAI
 */
export async function sendOpenAIChatStream(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  callbacks: StreamingChatCallback
): Promise<void> {
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
        stream: true,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData.error?.message || ''

      // Provide specific, actionable error messages for OpenAI
      if (response.status === 401) {
        throw new Error('OpenAI: Invalid API key. Please check your API key in widget settings.')
      }
      if (response.status === 429) {
        const rateLimitInfo = parseRateLimitInfo(response, errorData)
        throw new Error(`OpenAI: ${rateLimitInfo.message}`)
      }
      if (response.status === 500) {
        throw new Error('OpenAI: Service error. Please try again later.')
      }
      if (errorMessage.includes('insufficient_quota')) {
        throw new Error('OpenAI: Insufficient quota. Please check your billing details.')
      }
      if (errorMessage.includes('model_not_found')) {
        throw new Error('OpenAI: Model not found. Please select a valid model in settings.')
      }

      throw new Error(
        errorMessage || `OpenAI API error (${response.status}): ${response.statusText}`
      )
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('Response body is not readable')
    }

    const decoder = new TextDecoder()
    let fullContent = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      const lines = chunk.split('\n')

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') {
            continue
          }

          try {
            const parsed = JSON.parse(data)
            const content = parsed.choices?.[0]?.delta?.content
            if (content) {
              fullContent += content
              callbacks.onChunk(content)
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }

    callbacks.onComplete({
      content: fullContent,
      model,
    })
  } catch (error) {
    if (error instanceof Error) {
      // Add network error context
      if (error.message.includes('fetch') || error.message.includes('network')) {
        callbacks.onError(new Error('OpenAI: Network error. Please check your internet connection and try again.'))
      } else {
        callbacks.onError(error)
      }
    } else {
      callbacks.onError(new Error('Failed to stream chat completion from OpenAI'))
    }
  }
}

/**
 * Send chat completion request to Straico (non-streaming)
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
      const errorMessage = errorData.message || errorData.error?.message || ''

      // Provide specific, actionable error messages for Straico
      if (response.status === 401) {
        throw new Error('Straico: Invalid API key. Please check your API key in widget settings.')
      }
      if (response.status === 403) {
        throw new Error('Straico: Access denied. Please verify your API key permissions.')
      }
      if (response.status === 429) {
        const rateLimitInfo = parseRateLimitInfo(response, errorData)
        throw new Error(`Straico: ${rateLimitInfo.message}`)
      }
      if (response.status === 500) {
        throw new Error('Straico: Service error. Please try again later.')
      }
      if (errorMessage.includes('invalid_api_key')) {
        throw new Error('Straico: Invalid API key format. Please check your API key in widget settings.')
      }
      if (errorMessage.includes('insufficient_credits') || errorMessage.includes('insufficient_quota')) {
        throw new Error('Straico: Insufficient credits. Please top up your account.')
      }
      if (errorMessage.includes('model_not_found') || errorMessage.includes('invalid_model')) {
        throw new Error('Straico: Model not found. Please select a valid model in settings.')
      }

      throw new Error(
        errorMessage || `Straico API error (${response.status}): ${response.statusText}`
      )
    }

    const data = await response.json()

    // Calculate cost if usage data is available (approximate pricing)
    let cost: number | undefined
    if (data.usage) {
      // Straico uses a credit system, cost is typically in credits
      // We'll display the token usage information
      cost = undefined // Will be calculated based on provider-specific pricing if needed
    }

    return {
      content: data.choices?.[0]?.message?.content || data.message?.content || '',
      model: data.model || model,
      usage: data.usage,
      cost,
    }
  } catch (error) {
    if (error instanceof Error) {
      // Add network error context
      if (error.message.includes('fetch') || error.message.includes('network')) {
        throw new Error('Straico: Network error. Please check your internet connection and try again.')
      }
      throw error
    }
    throw new Error('Failed to send chat completion to Straico')
  }
}

/**
 * Send streaming chat completion request to Straico
 */
export async function sendStraicoChatStream(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  callbacks: StreamingChatCallback
): Promise<void> {
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
        stream: true,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData.message || errorData.error?.message || ''

      // Provide specific, actionable error messages for Straico
      if (response.status === 401) {
        throw new Error('Straico: Invalid API key. Please check your API key in widget settings.')
      }
      if (response.status === 403) {
        throw new Error('Straico: Access denied. Please verify your API key permissions.')
      }
      if (response.status === 429) {
        const rateLimitInfo = parseRateLimitInfo(response, errorData)
        throw new Error(`Straico: ${rateLimitInfo.message}`)
      }
      if (response.status === 500) {
        throw new Error('Straico: Service error. Please try again later.')
      }
      if (errorMessage.includes('invalid_api_key')) {
        throw new Error('Straico: Invalid API key format. Please check your API key in widget settings.')
      }
      if (errorMessage.includes('insufficient_credits') || errorMessage.includes('insufficient_quota')) {
        throw new Error('Straico: Insufficient credits. Please top up your account.')
      }
      if (errorMessage.includes('model_not_found') || errorMessage.includes('invalid_model')) {
        throw new Error('Straico: Model not found. Please select a valid model in settings.')
      }

      throw new Error(
        errorMessage || `Straico API error (${response.status}): ${response.statusText}`
      )
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('Response body is not readable')
    }

    const decoder = new TextDecoder()
    let fullContent = ''
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
    }

    // Straico returns the full response as JSON, not SSE chunks
    // Try parsing as single JSON first
    try {
      const parsed = JSON.parse(buffer)
      const content = parsed.choices?.[0]?.message?.content
      if (content) {
        fullContent = content
        callbacks.onChunk(content)
      }
    } catch (e) {
      // Fall back to SSE parsing
      const lines = buffer.split('\n')
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') {
            continue
          }

          try {
            const parsed = JSON.parse(data)
            const content = parsed.choices?.[0]?.delta?.content || parsed.choices?.[0]?.message?.content
            if (content) {
              fullContent += content
              callbacks.onChunk(content)
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }

    callbacks.onComplete({
      content: fullContent,
      model,
    })
  } catch (error) {
    if (error instanceof Error) {
      // Add network error context
      if (error.message.includes('fetch') || error.message.includes('network')) {
        callbacks.onError(new Error('Straico: Network error. Please check your internet connection and try again.'))
      } else {
        callbacks.onError(error)
      }
    } else {
      callbacks.onError(new Error('Failed to stream chat completion from Straico'))
    }
  }
}
