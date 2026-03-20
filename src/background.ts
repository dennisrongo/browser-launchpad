chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.type === 'FETCH_PAGE_TITLE' && request.url) {
    console.log('[Background] Fetching title for:', request.url)
    fetchPageTitle(request.url)
      .then(title => {
        console.log('[Background] Fetched title:', title)
        sendResponse({ success: true, title })
      })
      .catch(error => {
        console.error('[Background] Fetch error:', error)
        sendResponse({ success: false, error: error.message })
      })
    return true
  }

  if (request.type === 'FETCH_X_TIMELINE') {
    fetchXTimeline(request.cookies, request.timelineType)
      .then(result => sendResponse(result))
      .catch(error => {
        console.error('[Background] X timeline fetch error:', error)
        sendResponse({ success: false, error: error.message, tweets: [] })
      })
    return true
  }
})

async function fetchPageTitle(url: string): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)
    
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'text/html,application/xhtml+xml' },
      signal: controller.signal,
    })
    
    clearTimeout(timeoutId)
    
    if (!response.ok) return null
    
    const text = await response.text()
    const match = text.match(/<title[^>]*>([^<]+)<\/title>/i)
    return match && match[1] ? match[1].trim() : null
  } catch {
    return null
  }
}

import type { XTweet } from './types'

// X GraphQL API query IDs (may need updating if X changes them)
const X_QUERY_IDS = {
  foryou: 'c-CzHF1LboFilMpsx4ZCrQ',    // HomeTimeline (For You)
  following: 'BKB7oi212Fi7kQtCBGE4zA',  // HomeLatestTimeline (Following)
}

const X_FEATURES = {
  rweb_tipjar_consumption_enabled: true,
  responsive_web_graphql_exclude_directive_enabled: true,
  verified_phone_label_enabled: false,
  responsive_web_graphql_timeline_navigation_enabled: true,
  responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
  articles_preview_enabled: true,
  view_counts_everywhere_api_enabled: true,
  tweetypie_unmention_optimization_enabled: true,
  responsive_web_edit_tweet_api_enabled: true,
  graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
  longform_notetweets_consumption_enabled: true,
  responsive_web_twitter_article_tweet_consumption_enabled: true,
  freedom_of_speech_not_reach_fetch_enabled: true,
  standardized_nudges_misinfo: true,
  tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
  longform_notetweets_rich_text_read_enabled: true,
  longform_notetweets_inline_media_enabled: true,
  rweb_video_timestamps_enabled: true,
  responsive_web_enhance_cards_enabled: false,
}

const X_BEARER_TOKEN = 'AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA'

async function fetchXTimeline(
  cookies: { authToken: string; ct0: string },
  timelineType: 'foryou' | 'following'
): Promise<{ success: boolean; error?: string | null; tweets: XTweet[] }> {
  const queryId = X_QUERY_IDS[timelineType]
  const endpointName = timelineType === 'foryou' ? 'HomeTimeline' : 'HomeLatestTimeline'
  const url = `https://x.com/i/api/graphql/${queryId}/${endpointName}`

  const body = {
    variables: {
      count: 20,
      includePromotedContent: true,
      latestControlAvailable: true,
      requestContext: 'launch',
      withCommunity: true,
    },
    features: X_FEATURES,
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${X_BEARER_TOKEN}`,
        'Content-Type': 'application/json',
        'x-csrf-token': cookies.ct0,
        'x-twitter-active-user': 'yes',
        'x-twitter-auth-type': 'OAuth2Session',
        'x-twitter-client-language': 'en',
        'Cookie': `auth_token=${cookies.authToken}; ct0=${cookies.ct0}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      if (response.status === 401 || response.status === 403) {
        return { success: false, error: 'Not authenticated. Please log in to x.com and try again.', tweets: [] }
      }
      return { success: false, error: `X API error (${response.status}): ${errorText.slice(0, 200)}`, tweets: [] }
    }

    const data = await response.json() as Record<string, unknown>
    const tweets = parseTimelineResponse(data)
    return { success: true, error: null, tweets }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return { success: false, error: 'Request timed out. Please try again.', tweets: [] }
    }
    throw error
  }
}

function extractTweetFromResult(tweetResult: Record<string, unknown> | undefined): XTweet | null {
  if (!tweetResult) return null

  let tweet = tweetResult

  if (tweetResult.__typename === 'TweetUnavailable') return null

  if (tweetResult.__typename === 'TweetWithVisibilityResults') {
    tweet = tweetResult.tweet as Record<string, unknown>
    if (!tweet) return null
  }

  const legacy = tweet.legacy as Record<string, unknown> | undefined
  const core = tweet.core as Record<string, unknown> | undefined
  const userResult = core?.user_results as Record<string, unknown> | undefined
  const user = userResult?.result as Record<string, unknown> | undefined
  const userLegacy = user?.legacy as Record<string, unknown> | undefined

  if (!legacy || !userLegacy) return null

  const restId = tweet.rest_id as string | undefined
  const screenName = userLegacy.screen_name as string | undefined
  if (!restId || !screenName) return null

  const quotedStatusResult = (legacy.quoted_status_result ?? tweet.quoted_status_result) as Record<string, unknown> | undefined
  const quotedStatusLegacy = legacy.quoted_status as Record<string, unknown> | undefined
  
  let quotedTweet: XTweet | undefined
  if (quotedStatusResult?.result) {
    quotedTweet = extractTweetFromResult(quotedStatusResult.result as Record<string, unknown>) ?? undefined
  } else if (quotedStatusLegacy) {
    const quotedUser = quotedStatusLegacy.user as Record<string, unknown> | undefined
    const quotedRestId = quotedStatusLegacy.id_str as string | undefined
    const quotedScreenName = quotedUser?.screen_name as string | undefined
    if (quotedRestId && quotedScreenName) {
      quotedTweet = {
        id: quotedRestId,
        authorName: (quotedUser?.name as string) || quotedScreenName,
        authorHandle: quotedScreenName,
        authorProfileImage: (quotedUser?.profile_image_url_https as string) || undefined,
        text: (quotedStatusLegacy.full_text as string) || '',
        createdAt: (quotedStatusLegacy.created_at as string) || '',
        url: `https://x.com/${quotedScreenName}/status/${quotedRestId}`,
      }
    }
  }

  if (quotedTweet) {
    console.log('[Background] Extracted quoted tweet for', restId, quotedTweet)
  }

  let replyTo: XTweet | undefined
  const inReplyToStatusIdStr = legacy.in_reply_to_status_id_str as string | undefined
  const inReplyToScreenName = legacy.in_reply_to_screen_name as string | undefined
  if (inReplyToStatusIdStr && inReplyToScreenName) {
    console.log('[Background] Found reply for tweet', restId, 'replying to', inReplyToScreenName)
    replyTo = {
      id: inReplyToStatusIdStr,
      authorName: inReplyToScreenName,
      authorHandle: inReplyToScreenName,
      text: '',
      createdAt: '',
      url: `https://x.com/${inReplyToScreenName}/status/${inReplyToStatusIdStr}`,
    }
  }

  return {
    id: restId,
    authorName: (userLegacy.name as string) || screenName,
    authorHandle: screenName,
    authorProfileImage: (userLegacy.profile_image_url_https as string) || undefined,
    text: (legacy.full_text as string) || '',
    createdAt: (legacy.created_at as string) || '',
    url: `https://x.com/${screenName}/status/${restId}`,
    quotedTweet,
    replyTo,
  }
}

function parseTimelineResponse(data: Record<string, unknown>): XTweet[] {
  const tweets: XTweet[] = []

  try {
    const dataData = data.data as Record<string, unknown> | undefined
    const homeWrapper = dataData?.home as Record<string, unknown> | undefined
    const home = homeWrapper?.home as Record<string, unknown> | undefined
    
    const homeTimeline = home?.home_timeline_urt ?? homeWrapper?.home_timeline_urt
    const timeline = (homeTimeline ?? null) as Record<string, unknown> | null
    const instructions = timeline?.instructions as Array<Record<string, unknown>> | undefined

    if (!instructions) return tweets

    console.log('[Background] Parsing data:', { 
      hasHome: !!home, 
      hasTimeline: !!timeline, 
      instructionsCount: instructions?.length 
    })

    if (!instructions) return tweets

    for (const instruction of instructions) {
      const entries = instruction.entries as Array<Record<string, unknown>> | undefined
      if (!entries) continue

      for (const entry of entries) {
        const content = entry.content as Record<string, unknown> | undefined
        if (!content) continue

        const typename = content.__typename as string | undefined

        if (typename === 'TimelineTimelineItem') {
          const itemContent = content.itemContent as Record<string, unknown> | undefined
          if (!itemContent) continue

          if (itemContent.promotedMetadata) continue

          const tweetResult = itemContent.tweet_results as Record<string, unknown> | undefined
          const tweet = tweetResult?.result as Record<string, unknown> | undefined
          const extractedTweet = extractTweetFromResult(tweet)
          if (extractedTweet) {
            tweets.push(extractedTweet)
          }
        } else if (typename === 'TimelineTimelineModule') {
          const items = content.items as Array<Record<string, unknown>> | undefined
          if (!items) continue

          for (const item of items) {
            const itemContent = item.itemContent as Record<string, unknown> | undefined
            if (!itemContent) continue

            const tweetResult = itemContent.tweet_results as Record<string, unknown> | undefined
            const tweet = tweetResult?.result as Record<string, unknown> | undefined
            const extractedTweet = extractTweetFromResult(tweet)
            if (extractedTweet) {
              tweets.push(extractedTweet)
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('[Background] Failed to parse X timeline response:', error)
  }

  return tweets
}

export {}
