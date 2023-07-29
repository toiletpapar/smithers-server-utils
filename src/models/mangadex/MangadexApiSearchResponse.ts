interface IMangadexApiSearchManga {
  id: string; // MangadexId of the chapter
  attributes: {
    title: {
      en: string;
    };
  }
}

interface IMangadexApiSearchResponse {
  "result": string;
  "response": string;
  "data": IMangadexApiSearchManga[];
  "limit": number;
  "offset": number;
  "total": number;  // The number of remaining manga
}

class MangadexApiSearchResponse {
  private data: IMangadexApiSearchResponse

  constructor(data: IMangadexApiSearchResponse) {
    this.data = data
  }

  public getObject(): IMangadexApiSearchResponse {
    return {
      ...this.data
    }
  }
}

export {
  MangadexApiSearchResponse,
  IMangadexApiSearchResponse,
  IMangadexApiSearchManga
}