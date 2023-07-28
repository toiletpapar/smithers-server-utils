interface IMangadexApiCover {
  id: string; // MangadexId of the cover
  attributes: {
    fileName: string;
  }
}

interface IMangadexApiCoverResponse {
  "result": string;
  "response": string;
  "data": IMangadexApiCover[];
  "limit": number;
  "offset": number;
  "total": number;  // The number of remaining covers
}

class MangadexApiCoverResponse {
  private data: IMangadexApiCoverResponse

  constructor(data: IMangadexApiCoverResponse) {
    this.data = data
  }

  public getObject(): IMangadexApiCoverResponse {
    return {
      ...this.data
    }
  }
}

export {
  MangadexApiCoverResponse,
  IMangadexApiCoverResponse
}