import { defaultClientProfile, sanitizeClientProfile } from '../../src/lib/client-profile.js';

export function rowToClientProfile(row) {
  return {
    data: sanitizeClientProfile(row?.data || defaultClientProfile()),
    source: row?.source || 'manual',
    sourceId: row?.sourceId || '',
    sourceUrl: row?.sourceUrl || '',
    syncStatus: row?.syncStatus || 'not_connected',
    lastSyncedAt: row?.lastSyncedAt || null,
  };
}

export function profileToRow(profile) {
  return { data: sanitizeClientProfile(profile?.data || profile) };
}
