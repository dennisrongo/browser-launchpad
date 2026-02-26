import { useState, useRef, useEffect, useMemo } from 'react'
import { AlertTriangle, Send, Sparkles } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { AIChatWidgetConfig, ChatMessage, Widget } from '../types'
import { sendOpenAIChatStream, sendStraicoChatStream, validateApiKeyFormat, RateLimitInfo } from '../utils/ai'
import { decodeApiKey } from '../utils/security'

interface AIChatWidgetProps {
  title: string
  config: AIChatWidgetConfig
  onConfigChange?: (newConfig: Partial<AIChatWidgetConfig>) => void
  pageWidgets?: Widget[]
}

interface TokenUsage {
  promptTokens?: number
  completionTokens?: number
  totalTokens?: number
  cost?: number
}

interface GlobalAIConfig {
  activeProvider: 'openai' | 'straico'
  openai: { apiKey: string; model: string }
  straico: { apiKey: string; model: string }
}

function buildWidgetContext(widgets: Widget[]): string {
  const contextParts: string[] = []
  contextParts.push('You are a helpful assistant with access to the user\'s dashboard context. You can reference information from their widgets when relevant to answer questions.')
  contextParts.push('')
  contextParts.push('## Current Dashboard Context')
  contextParts.push('')

  widgets.forEach(widget => {
    switch (widget.type) {
      case 'bookmark': {
        const config = widget.config as { bookmarks?: Array<{ url: string; title: string }> }
        if (config.bookmarks && config.bookmarks.length > 0) {
          contextParts.push(`### Bookmarks (${widget.title})`)
          config.bookmarks.forEach(bm => {
            contextParts.push(`- [${bm.title}](${bm.url})`)
          })
          contextParts.push('')
        }
        break
      }
      case 'todo': {
        const config = widget.config as { 
          items?: Array<{ 
            text: string; 
            completed: boolean; 
            priority: string; 
            dueDate?: string;
            archived: boolean;
          }> 
        }
        if (config.items && config.items.length > 0) {
          const activeItems = config.items.filter(i => !i.archived)
          if (activeItems.length > 0) {
            contextParts.push(`### Todo List (${widget.title})`)
            activeItems.forEach(item => {
              const status = item.completed ? '✓' : '○'
              const priority = item.priority !== 'medium' ? ` [${item.priority}]` : ''
              const due = item.dueDate ? ` (due: ${item.dueDate})` : ''
              contextParts.push(`- ${status} ${item.text}${priority}${due}`)
            })
            const completed = activeItems.filter(i => i.completed).length
            const total = activeItems.length
            contextParts.push(`_Progress: ${completed}/${total} completed_`)
            contextParts.push('')
          }
        }
        break
      }
      case 'weather': {
        const config = widget.config as { city?: string; units?: string }
        if (config.city) {
          contextParts.push(`### Weather (${widget.title})`)
          contextParts.push(`- Location: ${config.city}`)
          contextParts.push(`- Units: ${config.units === 'fahrenheit' ? '°F' : '°C'}`)
          contextParts.push('')
        }
        break
      }
      case 'clock': {
        const config = widget.config as { timezone?: string; format12Hour?: boolean }
        const now = new Date()
        let timeStr: string
        if (config.timezone) {
          try {
            timeStr = now.toLocaleTimeString('en-US', { 
              timeZone: config.timezone, 
              hour: '2-digit', 
              minute: '2-digit',
              hour12: config.format12Hour !== false 
            })
          } catch {
            timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        } else {
          timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
        contextParts.push(`### Clock (${widget.title})`)
        contextParts.push(`- Current time: ${timeStr}`)
        if (config.timezone) {
          contextParts.push(`- Timezone: ${config.timezone}`)
        }
        contextParts.push('')
        break
      }
    }
  })

  if (contextParts.length <= 3) {
    contextParts.push('_No widgets with data available on this page._')
  }

  contextParts.push('When answering questions, you can reference this context if relevant. If the user asks about their bookmarks, tasks, weather, or time, use the information above. Be concise and helpful.')

  return contextParts.join('\n')
}

export function AIChatWidget({ config, onConfigChange, pageWidgets = [] }: AIChatWidgetProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(config.messages || [])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo | null>(null)
  const [tokenUsage, setTokenUsage] = useState<TokenUsage | null>(null)
  const [globalConfig, setGlobalConfig] = useState<GlobalAIConfig | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const isInitialMount = useRef(true)

  const widgetContext = useMemo(() => buildWidgetContext(pageWidgets), [pageWidgets])

  const hasWidgetContext = pageWidgets.some(w => 
    (w.type === 'bookmark' && (w.config as any).bookmarks?.length > 0) ||
    (w.type === 'todo' && (w.config as any).items?.some((i: any) => !i.archived)) ||
    (w.type === 'weather' && (w.config as any).city) ||
    w.type === 'clock'
  )

  useEffect(() => {
    loadGlobalConfig()

    const listener = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.ai_config) {
        loadGlobalConfig()
      }
    }
    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }, [])

  const loadGlobalConfig = async () => {
    try {
      const result = await chrome.storage.local.get(['ai_config'])
      if (result.ai_config && typeof result.ai_config === 'object' && 'activeProvider' in result.ai_config) {
        setGlobalConfig(result.ai_config as GlobalAIConfig)
      } else {
        setGlobalConfig(null)
      }
    } catch (error) {
      console.error('Failed to load global AI config:', error)
    }
  }

  useEffect(() => {
    setMessages(config.messages || [])
  }, [config.messages])

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const activeProvider = globalConfig?.activeProvider || 'openai'
  const providerConfig = globalConfig?.[activeProvider]
  const hasApiKey = !!(providerConfig?.apiKey)
  const hasModel = !!(providerConfig?.model)
  const model = providerConfig?.model || ''

  const handleSend = async () => {
    const trimmedInput = input.trim()
    if (!trimmedInput || isLoading) return

    if (!hasApiKey) {
      setError('Please configure your API key in Settings')
      return
    }

    if (!hasModel) {
      setError('Please select a model in Settings')
      return
    }

    const encodedApiKey = providerConfig?.apiKey
    if (!encodedApiKey) {
      setError('API key not configured')
      return
    }

    const apiKey = decodeApiKey(encodedApiKey)

    if (apiKey) {
      const formatCheck = validateApiKeyFormat(activeProvider, apiKey)
      if (!formatCheck.valid) {
        setError(`Invalid API key: ${formatCheck.error}`)
        return
      }
    }

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

    if (onConfigChange) {
      onConfigChange({ messages: updatedMessages })
    }

    const assistantMessageId = `msg-${Date.now() + 1}`
    const assistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
    }

    setMessages([...updatedMessages, assistantMessage])
    setRateLimitInfo(null)

    const systemMessage: ChatMessage = {
      id: 'system-context',
      role: 'system',
      content: widgetContext,
      timestamp: new Date().toISOString(),
    }

    const messagesWithContext = [systemMessage, ...updatedMessages]

    try {
      if (activeProvider === 'openai') {
        await sendOpenAIChatStream(apiKey, model, messagesWithContext, {
          onChunk: (content) => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, content: msg.content + content }
                  : msg
              )
            )
          },
          onComplete: (response) => {
            if (response.usage || response.cost !== undefined) {
              setTokenUsage({
                promptTokens: response.usage?.prompt_tokens,
                completionTokens: response.usage?.completion_tokens,
                totalTokens: response.usage?.total_tokens,
                cost: response.cost,
              })
            }

            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, content: response.content }
                  : msg
              )
            )

            if (onConfigChange) {
              onConfigChange({
                messages: [
                  ...updatedMessages,
                  { ...assistantMessage, content: response.content }
                ]
              })
            }
          },
          onError: (error) => { throw error },
        })
      } else {
        await sendStraicoChatStream(apiKey, model, messagesWithContext, {
          onChunk: (content) => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, content: msg.content + content }
                  : msg
              )
            )
          },
          onComplete: (response) => {
            if (response.usage || response.cost !== undefined) {
              setTokenUsage({
                promptTokens: response.usage?.prompt_tokens,
                completionTokens: response.usage?.completion_tokens,
                totalTokens: response.usage?.total_tokens,
                cost: response.cost,
              })
            }

            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, content: response.content }
                  : msg
              )
            )

            if (onConfigChange) {
              onConfigChange({
                messages: [
                  ...updatedMessages,
                  { ...assistantMessage, content: response.content }
                ]
              })
            }
          },
          onError: (error) => { throw error },
        })
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get response'

      if (errorMessage.includes('Rate limit') || errorMessage.includes('Too many')) {
        const retryMatch = errorMessage.match(/wait (\d+) seconds/)
        const retryAfter = retryMatch ? parseInt(retryMatch[1], 10) : undefined

        setRateLimitInfo({
          isRateLimited: true,
          retryAfter,
          message: errorMessage,
        })
      }

      setError(errorMessage)
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
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto mb-3 space-y-3 pr-1" style={{ maxHeight: 'calc(100% - 180px)' }}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <p className="text-text-secondary text-sm">
              {!hasApiKey ? 'Configure your API key in Settings' :
               !hasModel ? 'Select a model in Settings' :
               hasWidgetContext ? 'Ask me about your bookmarks, tasks, or weather!' :
               'Start a conversation with AI'}
            </p>
            {hasWidgetContext && hasApiKey && hasModel && (
              <p className="text-text-muted text-xs mt-2">
                I can see your dashboard widgets and answer questions about them.
              </p>
            )}
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
                    ? 'bg-primary text-[var(--color-on-primary)]'
                    : 'bg-surface border border-border text-text'
                }`}
              >
                {msg.role === 'user' ? (
                  <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                    {msg.content}
                  </p>
                ) : (
                  <div className="text-sm break-words leading-relaxed prose prose-sm max-w-none prose-p:my-1 prose-p:text-text prose-headings:my-2 prose-headings:text-text prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-li:text-text prose-strong:text-text prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-background prose-pre:border prose-pre:border-border prose-blockquote:text-text-secondary prose-blockquote:border-l-primary">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                )}
                <p
                  className={`text-xs mt-1 ${
                    msg.role === 'user' ? 'text-[var(--color-on-primary)]/70' : 'text-text-secondary'
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
        <div className={`mb-3 p-3 glass-card rounded-lg text-sm ${
          rateLimitInfo?.isRateLimited
            ? 'bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-400'
            : 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'
        }`}>
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium">{rateLimitInfo?.isRateLimited ? 'Rate Limit Exceeded' : 'Error'}</p>
              <p className="text-xs mt-1 opacity-90">{error}</p>
              {rateLimitInfo?.retryAfter && (
                <p className="text-xs mt-2 font-medium">
                  Please wait {rateLimitInfo.retryAfter} seconds before retrying.
                </p>
              )}
            </div>
          </div>
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
              ? 'Configure API key in Settings...'
              : !hasModel
              ? 'Select a model in Settings...'
              : hasWidgetContext
              ? 'Ask about your bookmarks, tasks, weather...'
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
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
