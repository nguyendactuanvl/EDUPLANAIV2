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

  // 1. Get API Key from Header, Env, or Body
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

  const apiKey = (env.GEMINI_API_KEY || apiKeyFromHeader || body.apiKey || "").trim();

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-gemini-api-key",
    "Content-Type": "application/json; charset=utf-8",
  };

  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error: "API KEY KHÔNG HỢP LỆ (400): Mã Gemini API Key hiện tại chưa đúng hoặc chưa được cài đặt. Thầy/cô vui lòng dán lại mã API Key mới trong Cài đặt."
      }),
      { status: 400, headers: corsHeaders }
    );
  }

  try {
    // 2. Format contents for Gemini API (keep payload minimal to prevent 400 parameter errors)
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

    const geminiPayload: any = { contents };

    // System instruction if available
    const sysInst = body.systemInstruction || body.system_instruction;
    if (sysInst) {
      geminiPayload.systemInstruction = typeof sysInst === 'string'
        ? { parts: [{ text: sysInst }] }
        : sysInst;
    }

    // 3. Call Google Gemini API (gemini-2.5-flash)
    const targetUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;

    const geminiRes = await fetch(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(geminiPayload),
    });

    const data: any = await geminiRes.json();

    if (!geminiRes.ok) {
      const errMsg = data?.error?.message || "Lỗi từ dịch vụ Google Gemini API";
      return new Response(
        JSON.stringify({ error: `Lỗi từ API Key cá nhân của bạn: ${errMsg}` }),
        { status: geminiRes.status, headers: corsHeaders }
      );
    }

    let textResult = "";
    if (data.candidates && data.candidates[0]?.content?.parts) {
      textResult = data.candidates[0].content.parts.map((p: any) => p.text || "").join("\n");
    }

    return new Response(
      JSON.stringify({
        text: textResult,
        result: textResult,
        ...data
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || "Lỗi máy chủ khi xử lý yêu cầu AI" }),
      { status: 500, headers: corsHeaders }
    );
  }
};

export const onRequestGet = async () => {
  return new Response(
    JSON.stringify({ status: "ok", message: "EduPlan AI Cloudflare Function API is active." }),
    {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json; charset=utf-8",
      },
    }
  );
};
