export const onRequestOptions = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-gemini-api-key",
      "Access-Control-Max-Age": "86400",
    },
  });
};

export const onRequestPost = async (context: { request: Request; env: Record<string, any> }) => {
  const { request, env } = context;

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-gemini-api-key",
    "Content-Type": "application/json; charset=utf-8",
  };

  try {
    const authHeader = request.headers.get("Authorization") || request.headers.get("x-gemini-api-key") || "";
    let apiKeyFromHeader = "";
    if (authHeader.startsWith("Bearer ")) {
      apiKeyFromHeader = decodeURIComponent(authHeader.substring(7));
    } else if (authHeader) {
      apiKeyFromHeader = decodeURIComponent(authHeader);
    }

    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {
      body = {};
    }

    const apiKey = (body.apiKey || apiKeyFromHeader || env.GEMINI_API_KEY || "").trim();

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Thiếu API Key trong yêu cầu. Thầy/cô vui lòng kiểm tra Cài đặt." }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Cloudflare Edge server calls Google Gemini (gemini-3.8-flash)
    const targetUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${encodeURIComponent(apiKey)}`;

    let rawContents = body.contents;
    let contents: any = rawContents;
    if (!contents) {
      if (body.prompt) {
        contents = [{ role: "user", parts: [{ text: body.prompt }] }];
      } else if (body.text) {
        contents = [{ role: "user", parts: [{ text: body.text }] }];
      } else if (body.messages && Array.isArray(body.messages)) {
        contents = body.messages.map((m: any) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) }]
        }));
      } else {
        contents = [{ role: "user", parts: [{ text: JSON.stringify(body) }] }];
      }
    } else if (Array.isArray(contents)) {
      if (contents.length > 0 && !contents[0].role) {
        contents = [{ role: "user", parts: contents }];
      }
    } else if (typeof contents === 'object' && contents !== null) {
      if (contents.role && contents.parts) {
        contents = [contents];
      } else if (contents.parts) {
        contents = [{ role: "user", parts: contents.parts }];
      } else {
        contents = [{ role: "user", parts: [contents] }];
      }
    }

    const googlePayload: any = { contents };

    const sysInst = body.systemInstruction || body.system_instruction;
    if (sysInst) {
      googlePayload.systemInstruction = typeof sysInst === 'string'
        ? { parts: [{ text: sysInst }] }
        : sysInst;
    }

    const response = await fetch(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(googlePayload),
    });

    const dataText = await response.text();

    return new Response(dataText, {
      status: response.status,
      headers: corsHeaders,
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Lỗi máy chủ nội bộ." }),
      { status: 500, headers: corsHeaders }
    );
  }
};

export const onRequestGet = async () => {
  return new Response(
    JSON.stringify({ status: "ok", message: "EduPlan AI Cloudflare Pages Function is active." }),
    {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json; charset=utf-8",
      },
    }
  );
};
