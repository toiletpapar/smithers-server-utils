import axios, { Axios } from 'axios'

interface HttpConfig {
  params?: {
    [p: string]: any
  },
  data?: {
    [d: string]: any
  },
  headers?: {
    [h: string]: string
  },
  responseType?: 'arraybuffer' | 'json',
}

class HttpClient {
  private client: Axios

  constructor() {
    this.client = axios.create()
  }

  get(url: string, config: HttpConfig = {}) {
    return this.client.get(url, config)
  }
}

const httpClient = new HttpClient()

export {
  HttpClient,
  httpClient
}