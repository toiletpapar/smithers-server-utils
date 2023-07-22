import { CrawlTarget, ICrawlTarget } from "./CrawlTarget";
import { MangaUpdate, IMangaUpdate } from "./MangaUpdate";
import { SQLManga } from "../repositories/MangaRepository";

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
    return new this({
      crawler: CrawlTarget.fromSQL(data.crawler),
      mangaUpdates: data.manga_updates.map((update) => MangaUpdate.fromSQL(update))
    })
  }

  public getObject(): IManga {
    return {
      crawler: this.data.crawler.getObject(),
      mangaUpdates: this.data.mangaUpdates.map((update) => update.getObject())
    }
  }

  public serialize() {
    return {
      ...this.data,
      crawler: this.data.crawler.serialize(),
      mangaUpdates: this.data.mangaUpdates.map((update) => update.serialize())
    }
  }
}

export {
  Manga,
}