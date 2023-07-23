import { Database } from "./database/Database"
import { SecretClient } from "./secrets/SecretClient"

import { CrawlTarget, CrawlerTypes, ICrawlTarget } from "./models/CrawlTarget"
import { CrawlTargetListOptions, ICrawlTargetListOptions } from "./models/CrawlTargetListOptions"
import { SQLCrawlTarget, CrawlTargetRepository } from "./repositories/CrawlTargetRepository"

import { MangaUpdate, IMangaUpdate } from "./models/manga/MangaUpdate"
import { MangaUpdateListOptions, IMangaUpdateListOptions } from "./models/manga/MangaUpdateListOptions"
import { SQLMangaUpdate, MangaUpdateRepository } from "./repositories/manga/MangaUpdateRepository"

import { Manga } from "./models/manga/Manga"
import { MangaListOptions, IMangaListOptions } from "./models/manga/MangaListOptions"
import { SQLManga, MangaRepository } from "./repositories/manga/MangaRepository"
import { MangaSyncOptions, IMangaSyncOptions } from "./models/manga/MangaSyncOptions"
import { CrawlTargetGetOptions, ICrawlTargetGetOptions } from "./models/CrawlTargetGetOptions"
import { SmithersError, SmithersErrorTypes } from "./errors/SmithersError"

export {
  Database,
  SecretClient,
  SmithersError,
  SmithersErrorTypes,

  // Crawler
  CrawlTarget,
  CrawlerTypes,
  ICrawlTarget,
  CrawlTargetListOptions,
  ICrawlTargetListOptions,
  CrawlTargetGetOptions,
  ICrawlTargetGetOptions,
  SQLCrawlTarget,
  CrawlTargetRepository,

  // MangaUpdate
  MangaUpdate,
  IMangaUpdate,
  MangaUpdateListOptions,
  IMangaUpdateListOptions,
  SQLMangaUpdate,
  MangaUpdateRepository,

  // Manga
  Manga,
  MangaListOptions,
  IMangaListOptions,
  MangaSyncOptions,
  IMangaSyncOptions,
  SQLManga,
  MangaRepository
}