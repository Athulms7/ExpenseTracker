const API_BASE_URL = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:8000`;

function describeDetail(detail) {
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map(issue => {
      const field = Array.isArray(issue.loc) ? issue.loc.filter(part => part !== 'body').join('.') : '';
      return `${field ? `${field}: ` : ''}${issue.msg || 'Invalid value'}`;
    }).join(' ');
  }
  return 'The request could not be completed.';
}

export async function apiRequest(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      credentials: 'include',
      headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new Error(`Cannot reach the API at ${API_BASE_URL}. Check that the API server is running.`);
  }

  if (!response.ok) {
    let payload;
    try { payload = await response.json(); } catch { payload = null; }
    const message = describeDetail(payload?.detail);
    const error = new Error(response.status === 503
      ? message
      : `${message} (HTTP ${response.status})`);
    error.status = response.status;
    throw error;
  }

  if (response.status === 204) return null;
  try { return await response.json(); }
  catch { throw new Error('The API returned an unreadable response.'); }
}
