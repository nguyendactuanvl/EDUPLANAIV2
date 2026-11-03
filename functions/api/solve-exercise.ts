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

export async function onRequestPost(context: { request: Request; env: any }) {
  const { request, env } = context;
  try {
    const apiKey = env.GEMINI_API_KEY || request.headers.get('x-gemini-api-key') || request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Missing Gemini API Key.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const body = await request.json().catch(() => ({}));
    const parts: any[] = [];
    if (body.files && Array.isArray(body.files)) {
      body.files.forEach((f: any) => {
        if (f.data) {
          const cleanData = f.data.replace(/^data:[^;]+;base64,/, '');
          parts.push({
            inlineData: {
              mimeType: f.type || 'image/png',
              data: cleanData
            }
          });
        }
      });
    }
    if (body.croppedImage) {
      const cleanImg = body.croppedImage.replace(/^data:[^;]+;base64,/, '');
      parts.push({
        inlineData: {
          mimeType: 'image/png',
          data: cleanImg
        }
      });
    }
    parts.push({
      text: body.prompt || "Giải bài tập này chi tiết theo từng bước, trình bày rõ ràng, mạch lạc."
    });

    const candidateModels = ['gemini-1.5-flash', 'gemini-1.5-flash-8b', 'gemini-2.0-flash', 'gemini-3.8-flash'];
    let textResult = '';
    let lastErr = '';

    for (const model of candidateModels) {
      try {
        const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts }] })
        });

        if (geminiRes.ok) {
          const data = await geminiRes.json();
          textResult = data?.candidates?.[0]?.content?.parts?.[0]?.text || JSON.stringify(data);
          if (textResult) break;
        } else if (geminiRes.status === 429) {
          continue;
        } else {
          lastErr = await geminiRes.text();
        }
      } catch (e: any) {
        lastErr = e.message;
      }
    }

    if (!textResult) {
      return new Response(JSON.stringify({ error: `Lỗi kết nối AI: ${lastErr || 'Vượt quá hạn mức Google'}` }), {
        status: 429,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

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
