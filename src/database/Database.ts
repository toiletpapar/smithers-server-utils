// TODO: Refactor DB to parent package: used in smithers-server && smithers-crawler
import { Pool, PoolClient, PoolConfig, QueryConfig, QueryResult, QueryResultRow } from 'pg'

interface DatabaseQueryable {
  query: <T extends QueryResultRow>(query: string | QueryConfig) => Promise<QueryResult<T>>
}

// Manage a single instance of a client in a pg pool
class DatabaseClient implements DatabaseQueryable {
  private client: PoolClient;

  constructor(client: PoolClient) {
    this.client = client
  }

  public query<T extends QueryResultRow>(query: string | QueryConfig): Promise<QueryResult<T>> {
    return this.client.query(query)
  }

  public release(): void {
    this.client.release()
  }
}

// Manage a single instance of a pool
class Database implements DatabaseQueryable {
  private pool: Pool;
  private static db: Database | null = null;

  constructor(config: PoolConfig) {
    if (Database.db) {
      console.log('A database instance already exists...attempting to create new instance anyway')
    }

    this.pool = new Pool(config)
    Database.db = this
  }

  // Query any available client
  public query<T extends QueryResultRow>(query: string | QueryConfig): Promise<QueryResult<T>> {
    return this.pool.query(query)
  }

  // Get a client from the pool, remember to return it via client.release()
  public async getClient(): Promise<DatabaseClient> {
    return new DatabaseClient(await this.pool.connect())
  }

  // Used with other pgClient tools, prefer class methods instead
  public getPoolInstance(): Pool {
    return this.pool
  }

  public end(): Promise<void> {
    return this.pool.end()
  }
}

export {
  Database,
  DatabaseClient,
  DatabaseQueryable
}