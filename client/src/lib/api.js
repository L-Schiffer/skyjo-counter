export async function api(method, url, body) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
    credentials: 'same-origin',
  }
  if (body) opts.body = JSON.stringify(body)
  const r = await fetch(url, opts)
  if (r.status === 401 && url !== '/api/login' && url !== '/api/me') {
    window.dispatchEvent(new Event('auth:expired'))
    return null
  }
  return r.json()
}
