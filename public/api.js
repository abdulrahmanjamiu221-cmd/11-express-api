export class ApiError extends Error {
  constructor(message, status, fields = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fields = fields;
  }
}

export async function request(url, options = {}) {
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');

  if (options.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, { ...options, headers });
  let payload = null;

  if (response.status !== 204) {
    const text = await response.text();
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        throw new Error('The server returned an invalid response.');
      }
    }
  }

  if (!response.ok) {
    const error = payload?.error ?? {};
    throw new ApiError(
      error.message || `Request failed with status ${response.status}.`,
      response.status,
      error.fields ?? {},
    );
  }

  return payload?.data ?? null;
}

export function getHealth(options) {
  return request('/api/health', options);
}

export function listProducts(filters = {}, options) {
  const params = new URLSearchParams();

  for (const key of ['category', 'q', 'sort']) {
    if (filters[key]) {
      params.set(key, filters[key]);
    }
  }

  const query = params.toString();
  return request(`/api/products${query ? `?${query}` : ''}`, options);
}

export function createProduct(product) {
  return request('/api/products', {
    method: 'POST',
    body: JSON.stringify(product),
  });
}

export function updateProductStock(id, stock) {
  return request(`/api/products/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ stock }),
  });
}

export function deleteProduct(id) {
  return request(`/api/products/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}
