// ─── Plan notification service ─────────────────────────────────────
// Extracted from createPlanSlice to separate API concerns from state management.

const DEFAULT_API_BASE = 'https://egolessdo.freebytes.net';

// Configurable API base URL - set from app layer
let _apiBase: string | null = null;

/** Set the API base URL (call from app layer). */
export function setNotificationApiBase(url: string): void {
  _apiBase = url;
}

function getApiBase(): string {
  return _apiBase || DEFAULT_API_BASE;
}

/**
 * Notify the server about delayed plans (sends email notification).
 * Returns true if the notification was sent successfully.
 */
export async function notifyDelayedPlan(params: {
  planId: string;
  planName: string;
  endDate: string;
  userId: string;
  token: string;
}): Promise<boolean> {
  const response = await fetch(`${getApiBase()}/api/plan/notify-delayed`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${params.token}`,
    },
    body: JSON.stringify({
      planId: params.planId,
      planName: params.planName,
      endDate: params.endDate,
      userId: params.userId,
    }),
  });
  return response.ok;
}
