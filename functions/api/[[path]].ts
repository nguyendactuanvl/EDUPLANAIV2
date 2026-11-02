export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-gemini-api-key',
    },
  });
}

export async function onRequest(context: { request: Request; env: any; params: any }) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') {
    return onRequestOptions();
  }

  try {
    const apiKey = env.GEMINI_API_KEY || request.headers.get('x-gemini-api-key') || request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Missing Gemini API Key.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const body = await request.json().catch(() => ({}));
    const promptText = body.prompt || body.message || JSON.stringify(body);

    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }]
      })
    });

    const data = await geminiRes.json();
    const textResult = data?.candidates?.[0]?.content?.parts?.[0]?.text || JSON.stringify(data);

    return new Response(JSON.stringify({ result: textResult }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
