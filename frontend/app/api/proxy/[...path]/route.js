export const dynamic = 'force-dynamic';

const BACKEND_BASE = process.env.BACKEND_BASE_URL || 'https://api.edilcipriano.peels.it/api';

async function proxyRequest(request, { params }) {
  const { path = [] } = params || {};
  const targetUrl = `${BACKEND_BASE}/${Array.isArray(path) ? path.join('/') : path}`;

  try {
    console.log(`[PROXY] ${request.method} ${targetUrl}`);
    
    const headers = new Headers();
    
    // Copia solo header necessari dal request originale
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      headers.set('Authorization', authHeader);
    }
    
    const contentType = request.headers.get('content-type');
    if (contentType) {
      headers.set('Content-Type', contentType);
    }
    
    // Assicura che il backend riceva JSON (se inviato)
    if (!headers.get('content-type') && request.method !== 'GET') {
      headers.set('content-type', 'application/json');
    }
    
    // Aggiungi header necessari per l'API
    headers.set('Accept', 'application/json');
    headers.set('X-Requested-With', 'XMLHttpRequest');

    const init = {
      method: request.method,
      headers,
      redirect: 'manual',
    };

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      const body = await request.text();
      console.log(`[PROXY] Body: ${body.substring(0, 100)}...`);
      init.body = body;
    }

    const res = await fetch(targetUrl, init);
    console.log(`[PROXY] Response status: ${res.status}`);

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
  } catch (error) {
    console.error(`[PROXY] Error proxying to ${targetUrl}:`, error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function GET(request, ctx) { return proxyRequest(request, ctx); }
export async function POST(request, ctx) { return proxyRequest(request, ctx); }
export async function PUT(request, ctx) { return proxyRequest(request, ctx); }
export async function PATCH(request, ctx) { return proxyRequest(request, ctx); }
export async function DELETE(request, ctx) { return proxyRequest(request, ctx); }
export async function OPTIONS() { return new Response('OK', { status: 200 }); }


