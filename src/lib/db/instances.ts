import { openVerdictLog, DEFAULT_DB_PATH, type VerdictLog } from './verdictLog';
import { openResearchStore, type ResearchStore } from './researchStore';

/**
 * Shared database handles for the API routes, opened on first use. Null when
 * the database can't be opened (e.g. a read-only host): the app then works
 * without logging or cached research instead of failing.
 */
let verdictLog: VerdictLog | null | undefined;
let researchStore: ResearchStore | null | undefined;

const dbPath = () => process.env.KABUCHECK_DB_PATH || DEFAULT_DB_PATH;

export function getVerdictLog(): VerdictLog | null {
  if (verdictLog === undefined) {
    try {
      verdictLog = process.env.VERDICT_LOG_ENABLED === 'false' ? null : openVerdictLog(dbPath());
    } catch (err) {
      console.error('[db] verdict log unavailable:', err);
      verdictLog = null;
    }
  }
  return verdictLog;
}

export function getResearchStore(): ResearchStore | null {
  if (researchStore === undefined) {
    try {
      researchStore = openResearchStore(dbPath());
    } catch (err) {
      console.error('[db] research store unavailable:', err);
      researchStore = null;
    }
  }
  return researchStore;
}
