import { WebSearchResult } from '@/types';

/**
 * 分层 fallback 搜索：SearXNG → DuckDuckGo Instant Answer API
 * 未配置或全部失败时静默降级，返回空数组。
 */
export async function searchWeb(query: string): Promise<WebSearchResult[]> {
  // Layer 1: SearXNG (if configured)
  const searxResults = await searchSearXNG(query);
  if (searxResults.length > 0) return searxResults;

  // Layer 2: DuckDuckGo Instant Answer API (free, no key needed)
  const ddgResults = await searchDuckDuckGo(query);
  if (ddgResults.length > 0) return ddgResults;

  return [];
}

/**
 * SearXNG search via SEARCH_API_URL environment variable
 */
async function searchSearXNG(query: string): Promise<WebSearchResult[]> {
  const searchApiUrl = process.env.SEARCH_API_URL;
  if (!searchApiUrl) return [];

  try {
    const url = new URL(searchApiUrl);
    url.searchParams.set('q', query);
    url.searchParams.set('format', 'json');

    const response = await fetch(url.toString(), {
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.error(`[WebSearcher] SearXNG 搜索失败: HTTP ${response.status}`);
      return [];
    }

    const data = await response.json();
    const rawResults = Array.isArray(data.results) ? data.results : Array.isArray(data) ? data : [];

    return rawResults.slice(0, 5).map((r: Record<string, unknown>) => ({
      title: ((r.title as string) || '').slice(0, 100),
      url: (r.url as string) || '',
      snippet: ((r.content as string) || (r.snippet as string) || '').slice(0, 300),
    }));
  } catch (error) {
    console.error('[WebSearcher] SearXNG 搜索异常:', error);
    return [];
  }
}

/**
 * DuckDuckGo Instant Answer API — free, no API key required
 * https://api.duckduckgo.com/?q=...&format=json
 */
async function searchDuckDuckGo(query: string): Promise<WebSearchResult[]> {
  try {
    const url = new URL('https://api.duckduckgo.com/');
    url.searchParams.set('q', query);
    url.searchParams.set('format', 'json');
    url.searchParams.set('no_html', '1');
    url.searchParams.set('skip_disambig', '1');

    const response = await fetch(url.toString(), {
      signal: AbortSignal.timeout(10000),
      headers: {
        'User-Agent': 'AIDiscuss/1.0',
      },
    });

    if (!response.ok) {
      console.error(`[WebSearcher] DuckDuckGo 搜索失败: HTTP ${response.status}`);
      return [];
    }

    const data = await response.json();
    const results: WebSearchResult[] = [];

    // AbstractText — main answer
    if (data.AbstractText) {
      results.push({
        title: data.Heading || query,
        url: data.AbstractURL || '',
        snippet: (data.AbstractText as string).slice(0, 300),
      });
    }

    // RelatedTopics — additional related results
    if (Array.isArray(data.RelatedTopics)) {
      for (const topic of data.RelatedTopics) {
        if (results.length >= 5) break;

        if (topic.Text && topic.FirstURL) {
          results.push({
            title: (topic.Text as string).slice(0, 100),
            url: topic.FirstURL as string,
            snippet: (topic.Text as string).slice(0, 300),
          });
        }

        // Nested topics (subtopics)
        if (Array.isArray(topic.Topics)) {
          for (const sub of topic.Topics) {
            if (results.length >= 5) break;
            if (sub.Text && sub.FirstURL) {
              results.push({
                title: (sub.Text as string).slice(0, 100),
                url: sub.FirstURL as string,
                snippet: (sub.Text as string).slice(0, 300),
              });
            }
          }
        }
      }
    }

    return results;
  } catch (error) {
    console.error('[WebSearcher] DuckDuckGo 搜索异常:', error);
    return [];
  }
}

export function formatSearchResultsForContext(results: WebSearchResult[]): string {
  if (results.length === 0) return '';

  let context = '\n\n## 联网搜索结果\n';
  for (const r of results) {
    context += `\n**${r.title}**\n${r.snippet}\n来源: ${r.url}\n`;
  }
  return context;
}
