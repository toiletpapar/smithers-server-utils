import { QueryResult } from 'pg'
import { DatabaseQueryable } from '../../database/Database'
import { LogTypes, Log, ILog } from '../../models/log/Log'

interface SQLLog {
  log_id: number;
  log_type: LogTypes;
  explanation: string;
  info: LogTypes;
  logged_on: Date;
}

namespace LogRepository {
  export const insert = async (db: DatabaseQueryable, log: Omit<ILog, 'logId'>): Promise<Log> => {
    const result: QueryResult<SQLLog> = await db.query({
      text: 'INSERT INTO logs (log_type, explanation, info, logged_on) VALUES ($1, $2, $3, $4) RETURNING *;',
      values: [
        log.logType,
        log.explanation,
        log.info,
        log.loggedOn,
      ]
    })
  
    return Log.fromSQL(result.rows[0])
  }
}

export {
  SQLLog,
  LogRepository
}