import { env } from '../config/env';

async function graphql<T>(url: string, query: string): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) {
    throw new Error(`Subgraph HTTP ${res.status}`);
  }
  const json = (await res.json()) as { data?: T; errors?: Array<{ message: string }> };
  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join('; '));
  }
  if (!json.data) {
    throw new Error('Subgraph returned empty data');
  }
  return json.data;
}

/** Best-effort ownership check against Base core subgraph. */
export async function assertGotchiOwnedBy(address: string, gotchiId: string): Promise<void> {
  if (env.skipOwnershipCheck) return;

  const owner = address.toLowerCase();
  const id = String(gotchiId);
  const query = `{
    aavegotchis(where: { id: "${id}", owner: "${owner}" }, first: 1) {
      id
      owner { id }
    }
  }`;

  try {
    const data = await graphql<{ aavegotchis: Array<{ id: string }> }>(env.coreSubgraphUrl, query);
    if (!data.aavegotchis?.length) {
      // Fallback query shape used by some core schemas
      const alt = `{
        aavegotchi(id: "${id}") {
          id
          owner { id }
        }
      }`;
      const altData = await graphql<{ aavegotchi: { id: string; owner: { id: string } } | null }>(
        env.coreSubgraphUrl,
        alt,
      );
      const owned = altData.aavegotchi?.owner?.id?.toLowerCase() === owner;
      if (!owned) {
        throw new Error('Gotchi not owned by address');
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Ownership check failed: ${message}`);
  }
}
