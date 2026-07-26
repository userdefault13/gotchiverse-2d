import { getRealmUrlSync, resolveRealmBaseUrl } from 'helpers/realm.url';

interface HttpResponse<T> extends Response {
  parsedBody?: T;
}

export async function http<T>(request: RequestInfo, init?: RequestInit): Promise<HttpResponse<T>> {
  let base = getRealmUrlSync();
  if (!base) {
    try {
      base = await resolveRealmBaseUrl();
    } catch {
      base = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
    }
  }
  const response: HttpResponse<T> = await fetch(`${base}${request}`, init);
  response.parsedBody = await response.json();
  return response;
}
