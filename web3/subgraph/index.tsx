import { request, ClientError } from 'graphql-request';
import { coreURI } from 'shared_code/web3/shared.const.web3';

export const useSubgraph = async <T,>(query: string, uri?: string): Promise<T> => {
  try {
    const data = await request<T>(uri || coreURI, query);
    return data;
  } catch (err) {
    // eslint-disable-next-line @typescript-eslint/no-throw-literal
    throw {
      status: 400,
      name: 'Subgraph error',
      message:
        err instanceof ClientError
          ? err.response.errors
            ? err.response.errors[0].message
            : 'Unknown error'
          : 'Unknown error',
    };
  }
};
