import { SmithersError, SmithersErrorTypes } from "../../errors/SmithersError"
import { CrawlTarget } from "../../models/crawlers/CrawlTarget"

const MANGADEX_API_BASE = 'https://api.mangadex.org'
const MANGADEX_BASE = 'https://mangadex.org'

// Example: https://mangadex.org/title/077a3fed-1634-424f-be7a-9a96b7f07b78/kingdom?order=desc
const getMangadexIdFromUrl = (crawlTarget: CrawlTarget): string => {
  const matches = crawlTarget.getObject().url.match(/https?:\/\/mangadex\.org\/title\/([a-z\d-]+)(?:\/|\?|$)/i)

  if (!matches || !matches[1]) {
    throw new SmithersError(SmithersErrorTypes.MANGADEX_CURSOR_FAILED_IDENTIFICATION, 'Unable to identify mangadex id from url')
  }

  return matches[1]
}

export {
  MANGADEX_API_BASE,
  MANGADEX_BASE,
  getMangadexIdFromUrl
}