// Ambient declarations for react-native-health-connect (ships no types).
// Covers only the members used in HealthService.ts.
declare module 'react-native-health-connect' {
  interface ReadRecordsResult { records: Array<Record<string, unknown>>; }
  export function initialize(): Promise<unknown>;
  export function requestPermissions(
    permissions: Array<{ accessType: string; recordType: string }>,
  ): Promise<Array<unknown>>;
  export function readRecords(
    recordType: string,
    options: Record<string, unknown>,
  ): Promise<ReadRecordsResult>;
  export function insertRecords(records: Array<Record<string, unknown>>): Promise<unknown>;
}
