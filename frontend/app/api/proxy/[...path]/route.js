export const dynamic = 'force-dynamic';

const BACKEND_BASE = process.env.BACKEND_BASE_URL || 'https://api.edilcipriano.peels.it/api';

async function proxyRequest(request, { params }) {
  const { path = [] } = params || {};
  const targetUrl = `${BACKEND_BASE}/${Array.isArray(path) ? path.join('/') : path}`;

  const headers = new Headers(request.headers);
  // Rimuovi header host per sicurezza
  headers.delete('host');
  // Assicura che il backend riceva JSON (se inviato)
  if (!headers.get('content-type')) {
    headers.set('content-type', 'application/json');
  }

  const init = {
    method: request.method,
    headers,
    redirect: 'manual',
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const body = await request.text();
    init.body = body;
  }

  const res = await fetch(targetUrl, init);

  // Costruisci risposta passando attraverso status, headers e body
  const responseHeaders = new Headers(res.headers);
  // Abilita credenziali tra stesso dominio del frontend
  responseHeaders.set('Access-Control-Allow-Origin', '*');
  responseHeaders.set('Access-Control-Allow-Credentials', 'true');

  const body = await res.arrayBuffer();
  return new Response(body, {
    status: res.status,
    statusText: res.statusText,
    headers: responseHeaders,
  });
}

export async function GET(request, ctx) { return proxyRequest(request, ctx); }
export async function POST(request, ctx) { return proxyRequest(request, ctx); }
export async function PUT(request, ctx) { return proxyRequest(request, ctx); }
export async function PATCH(request, ctx) { return proxyRequest(request, ctx); }
export async function DELETE(request, ctx) { return proxyRequest(request, ctx); }
export async function OPTIONS() { return new Response('OK', { status: 200 }); }


