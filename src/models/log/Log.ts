import { SQLLog } from '../../repositories/log/LogRepository'

enum LogTypes {
  SMITHERS_SERVER_DEBUG = 'SMITHERS_SERVER_DEBUG',
  SMITHERS_SERVER_INFO = 'SMITHERS_SERVER_INFO',
  SMITHERS_SERVER_WARN = 'SMITHERS_SERVER_WARN',
  SMITHERS_SERVER_ERROR = 'SMITHERS_SERVER_ERROR',
  SMITHERS_SERVER_FATAL = 'SMITHERS_SERVER_FATAL',
  SMITHERS_CRAWLER_DEBUG = 'SMITHERS_CRAWLER_DEBUG',
  SMITHERS_CRAWLER_INFO = 'SMITHERS_CRAWLER_INFO',
  SMITHERS_CRAWLER_WARN = 'SMITHERS_CRAWLER_WARN',
  SMITHERS_CRAWLER_ERROR = 'SMITHERS_CRAWLER_ERROR',
  SMITHERS_CRAWLER_FATAL = 'SMITHERS_CRAWLER_FATAL'
}

interface ILog {
  logId: number;  // identifier, primary
  logType: LogTypes;  // Type of the log, identifies severity and location
  explanation: string;  // A description of what happened
  info: Object; // Technical information about the issue, like breadcrumbs
  loggedOn: Date; // When it occurred on the location
}

class Log {
  private data: ILog;

  public constructor(data: ILog) {
    this.data = data
  }

  public static fromSQL(data: SQLLog): Log {
    return new this({
      logId: data.log_id,
      logType: data.log_type,
      explanation: data.explanation,
      info: data.info,
      loggedOn: data.logged_on,
    })
  }

  public getObject(): ILog {
    return {
      ...this.data
    }
  }
} 

export {
  ILog,
  Log,
  LogTypes,
}