export const fetchJson = async <T>(url: string, init?: RequestInit) => {
  const response = await fetch(url, init);

  if (!response.ok) {
    throw new Error(`Request failed (${response.status} ${response.statusText})`);
  }

  return (await response.json()) as T;
};

export const expectStatus = async (url: string, status: number, init?: RequestInit) => {
  const response = await fetch(url, init);

  if (response.status !== status) {
    throw new Error(`Expected ${status} from ${url}, received ${response.status}`);
  }

  return response;
};

