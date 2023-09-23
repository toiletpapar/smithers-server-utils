import { CrawlTarget, ICrawlTarget } from "../crawlers/CrawlTarget";
import { MangaUpdate, IMangaUpdate } from "./MangaUpdate";
import { SQLManga } from "../../repositories/manga/MangaRepository";

// Manga - Internal Data
interface MangaData {
  crawler: CrawlTarget,
  mangaUpdates: MangaUpdate[]
}

// Manga - As POJO
interface IManga {
  crawler: ICrawlTarget;
  mangaUpdates: IMangaUpdate[];
}

class Manga {
  private data: MangaData;

  constructor (data: MangaData) {
    this.data = data
  }

  public static fromSQL(data: SQLManga) {
    // Transform data types that aren't supported in JSON to their proper model representation
    return new this({
      crawler: CrawlTarget.fromSQL({
        ...data.crawler,
        last_crawled_on: data.crawler.last_crawled_on !== null ? new Date(data.crawler.last_crawled_on) : data.crawler.last_crawled_on,
        cover_image: data.crawler.cover_image !== null ? Buffer.from(data.crawler.cover_image, 'hex') : data.crawler.cover_image,
        cover_signature: data.crawler.cover_signature !== null ? Buffer.from(data.crawler.cover_signature, 'hex') : data.crawler.cover_signature
      }),
      mangaUpdates: data.manga_updates.map((update) => MangaUpdate.fromSQL({
        ...update,
        crawled_on: new Date(update.crawled_on),
        date_created: new Date(update.date_created)
      }))
    })
  }

  public getObject(): IManga {
    return {
      crawler: this.data.crawler.getObject(),
      mangaUpdates: this.data.mangaUpdates.map((update) => update.getObject())
    }
  }

  public async serialize() {
    return {
      ...this.data,
      crawler: await this.data.crawler.serialize(),
      mangaUpdates: this.data.mangaUpdates.map((update) => update.serialize())
    }
  }
}

export {
  Manga,
}