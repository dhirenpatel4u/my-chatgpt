export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  if (!process.env.APINEX_API_KEY) {
    return res.status(500).json({
      error: "APINEX_API_KEY is not configured.",
    });
  }

  try {
    const {
      messages,
      model,
      temperature = 0.7,
    } = req.body || {};

    if (!Array.isArray(messages)) {
      return res.status(400).json({
        error: "messages must be an array.",
      });
    }

    const selectedModel =
      model || process.env.APINEX_MODEL || "free/gemini-3.8-flash";

    const response = await fetch(
      "https://api.apinex.bond/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.APINEX_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: selectedModel,
          messages,
          temperature,
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();

      return res.status(response.status).json({
        error: errorText || "APInex request failed.",
      });
    }

    res.statusCode = 200;
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    if (!response.body) {
      return res.end();
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        const chunk = decoder.decode(value, {
          stream: true,
        });

        res.write(chunk);
      }
    } finally {
      reader.releaseLock();
      res.end();
    }
  } catch (error) {
    console.error("APInex error:", error);

    if (!res.headersSent) {
      return res.status(500).json({
        error: error?.message || "Internal server error.",
      });
    }

    res.end();
  }
}
