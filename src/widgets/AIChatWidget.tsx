import { useState, useRef, useEffect } from 'react'
import { AIChatWidgetConfig, ChatMessage } from '../types'
import { sendOpenAIChatStream, sendStraicoChatStream, ChatCompletionResponse } from '../utils/ai'

interface AIChatWidgetProps {
  title: string
  config: AIChatWidgetConfig
  onConfigChange?: (newConfig: Partial<AIChatWidgetConfig>) => void
}

interface TokenUsage {
  promptTokens?: number
  completionTokens?: number
  totalTokens?: number
  cost?: number
}

export function AIChatWidget({ title, config, onConfigChange }: AIChatWidgetProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(config.messages || [])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tokenUsage, setTokenUsage] = useState<TokenUsage | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Sync messages with config
  useEffect(() => {
    setMessages(config.messages || [])
  }, [config.messages])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const hasApiKey = config.provider === 'openai'
    ? !!config.openaiApiKey
    : !!config.straicoApiKey

  const hasModel = !!config.model

  const handleSend = async () => {
    const trimmedInput = input.trim()
    if (!trimmedInput || isLoading) return

    // Check if API key and model are configured
    if (!hasApiKey) {
      setError('Please configure your API key in widget settings')
      return
    }

    if (!hasModel) {
      setError('Please select a model in widget settings')
      return
    }

    // Add user message
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: trimmedInput,
      timestamp: new Date().toISOString(),
    }

    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInput('')
    setError(null)
    setTokenUsage(null)
    setIsLoading(true)

    // Update config with new messages
    if (onConfigChange) {
      onConfigChange({ messages: updatedMessages })
    }

    // Create a placeholder assistant message for streaming
    const assistantMessageId = `msg-${Date.now() + 1}`
    const assistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
    }

    setMessages([...updatedMessages, assistantMessage])

    try {
      // Call AI API with streaming
      await callAIStream(config, updatedMessages, (content) => {
        // Update the assistant message content as it streams in
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, content: msg.content + content }
              : msg
          )
        )
      }, (response) => {
        // On complete, update token usage
        if (response.usage || response.cost !== undefined) {
          setTokenUsage({
            promptTokens: response.usage?.prompt_tokens,
            completionTokens: response.usage?.completion_tokens,
            totalTokens: response.usage?.total_tokens,
            cost: response.cost,
          })
        }

        // Final update to ensure full content is saved
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, content: response.content }
              : msg
          )
        )

        // Update config with final messages
        if (onConfigChange) {
          onConfigChange({
            messages: [
              ...updatedMessages,
              { ...assistantMessage, content: response.content }
            ]
          })
        }
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get response')
      // Remove the assistant message on error
      setMessages(updatedMessages)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleClearHistory = () => {
    setMessages([])
    setError(null)
    if (onConfigChange) {
      onConfigChange({ messages: [] })
    }
  }

  return (
    <div className="flex flex-col h-full min-h-[300px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 pb-2 border-b border-border">
        <h3 className="text-sm font-semibold text-text">{title}</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-0.5 bg-surface rounded text-text-secondary border border-border">
            {config.provider === 'openai' ? 'OpenAI' : 'Straico'}
          </span>
          {hasModel && (
            <span className="text-xs px-2 py-0.5 bg-primary/10 rounded text-primary" title={config.model}>
              {config.model.length > 15 ? config.model.substring(0, 15) + '...' : config.model}
            </span>
          )}
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto mb-3 space-y-3 pr-1" style={{ maxHeight: 'calc(100% - 180px)' }}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <div className="text-4xl mb-3">💬</div>
            <p className="text-text-secondary text-sm">
              {!hasApiKey ? 'Configure your API key to start chatting' :
               !hasModel ? 'Select a model to start chatting' :
               'Start a conversation with AI'}
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 ${
                  msg.role === 'user'
                    ? 'bg-primary text-white'
                    : 'bg-surface border border-border text-text'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                  {msg.content}
                </p>
                <p
                  className={`text-xs mt-1 ${
                    msg.role === 'user' ? 'text-white/70' : 'text-text-secondary'
                  }`}
                >
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-surface border border-border rounded-lg px-4 py-3">
              <div className="flex space-x-2 items-center">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
                <span className="text-xs text-text-secondary ml-2">AI is typing...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Token Usage Display */}
      {tokenUsage && (tokenUsage.totalTokens || tokenUsage.promptTokens) && (
        <div className="mb-3 p-2 bg-surface border border-border rounded-lg text-text-secondary text-xs">
          <div className="flex items-center gap-2">
            <span className="font-medium">Token Usage:</span>
            {tokenUsage.promptTokens && (
              <span>Input: {tokenUsage.promptTokens}</span>
            )}
            {tokenUsage.completionTokens && (
              <span>Output: {tokenUsage.completionTokens}</span>
            )}
            {tokenUsage.totalTokens && (
              <span className="text-primary font-medium">Total: {tokenUsage.totalTokens}</span>
            )}
          </div>
          {tokenUsage.cost !== undefined && (
            <div className="mt-1 text-text-secondary">
              Cost: ${tokenUsage.cost.toFixed(6)}
            </div>
          )}
        </div>
      )}

      {/* Input Area */}
      <div className="flex flex-col gap-2 pt-2 border-t border-border">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            !hasApiKey
              ? 'Configure API key in settings...'
              : !hasModel
              ? 'Select a model in settings...'
              : 'Type your message... (Enter to send, Shift+Enter for new line)'
          }
          disabled={!hasApiKey || !hasModel || isLoading}
          className="w-full px-3 py-2 border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary text-sm bg-background text-text placeholder:text-text-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          rows={2}
        />
        <div className="flex justify-between items-center">
          <button
            onClick={handleClearHistory}
            disabled={messages.length === 0}
            className="text-xs text-text-secondary hover:text-text disabled:opacity-50 disabled:cursor-not-allowed transition-colors px-2 py-1 rounded hover:bg-surface"
          >
            Clear History ({messages.length})
          </button>
          <button
            onClick={handleSend}
            disabled={!input.trim() || !hasApiKey || !hasModel || isLoading}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                Send
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// AI API call function with streaming support
async function callAIStream(
  config: AIChatWidgetConfig,
  messages: ChatMessage[],
  onChunk: (content: string) => void,
  onComplete: (response: ChatCompletionResponse) => void
): Promise<void> {
  const provider = config.provider

  if (provider === 'openai') {
    const apiKey = config.openaiApiKey
    if (!apiKey) {
      throw new Error('OpenAI API key not configured')
    }

    const model = config.model || 'gpt-3.5-turbo'

    await sendOpenAIChatStream(apiKey, model, messages, {
      onChunk,
      onComplete,
      onError: (error) => { throw error },
    })
  } else if (provider === 'straico') {
    const apiKey = config.straicoApiKey
    if (!apiKey) {
      throw new Error('Straico API key not configured')
    }

    const model = config.model
    if (!model) {
      throw new Error('Straico model not selected')
    }

    await sendStraicoChatStream(apiKey, model, messages, {
      onChunk,
      onComplete,
      onError: (error) => { throw error },
    })
  } else {
    throw new Error('Unknown provider')
  }
}
