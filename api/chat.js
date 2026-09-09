export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  // Environment variables
  const apiKey = process.env.APINEX_API_KEY;

  const baseUrl =
    process.env.APINEX_BASE_URL ||
    "https://api.apinex.bond/v1";

  const defaultModel =
    process.env.APINEX_MODEL ||
    "free/gemini-3.8-flash";

  // Check API key
  if (!apiKey) {
    console.error("APINEX_API_KEY is missing.");

    return res.status(500).json({
      error:
        "APINEX_API_KEY is not configured in the Vercel environment.",
    });
  }

  try {
    const {
      messages,
      model,
      temperature = 0.7,
    } = req.body || {};

    // Validate messages
    if (!Array.isArray(messages)) {
      return res.status(400).json({
        error: "messages must be an array.",
      });
    }

    const selectedModel =
      model || defaultModel;

    const endpoint =
      `${baseUrl.replace(/\/$/, "")}/chat/completions`;

    console.log("APInex request:", {
      endpoint,
      model: selectedModel,
      messageCount: messages.length,
    });

    // Call APInex
    const response = await fetch(endpoint, {
      method: "POST",

      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },

      body: JSON.stringify({
        model: selectedModel,
        messages,
        temperature,
        stream: true,
      }),
    });

    // Handle errors
    if (!response.ok) {
      const contentType =
        response.headers.get("content-type") || "";

      const errorText =
        await response.text();

      console.error("APInex error:", {
        status: response.status,
        contentType,
        body: errorText.slice(0, 2000),
      });

      // Cloudflare / HTML error
      if (
        contentType.includes("text/html") ||
        errorText.includes("<!DOCTYPE html") ||
        errorText.includes("<html")
      ) {
        return res.status(response.status).json({
          error:
            `APInex returned HTTP ${response.status}. ` +
            `The APInex server/proxy returned an HTML error page. ` +
            `Please try again later or check the model ID.`,
          status: response.status,
          model: selectedModel,
        });
      }

      // JSON error
      let apiError = errorText;

      try {
        const parsed =
          JSON.parse(errorText);

        apiError =
          parsed.error?.message ||
          parsed.error ||
          errorText;
      } catch {
        // Response wasn't JSON
      }

      return res.status(response.status).json({
        error:
          apiError ||
          "APInex request failed.",
        status: response.status,
        model: selectedModel,
      });
    }

    // No stream
    if (!response.body) {
      return res.status(502).json({
        error:
          "APInex returned an empty response.",
      });
    }

    // SSE headers
    res.statusCode = 200;

    res.setHeader(
      "Content-Type",
      "text/event-stream"
    );

    res.setHeader(
      "Cache-Control",
      "no-cache, no-transform"
    );

    res.setHeader(
      "Connection",
      "keep-alive"
    );

    res.setHeader(
      "X-Accel-Buffering",
      "no"
    );

    // Stream APInex → browser
    const reader =
      response.body.getReader();

    const decoder =
      new TextDecoder();

    try {
      while (true) {
        const {
          done,
          value,
        } = await reader.read();

        if (done) {
          break;
        }

        const chunk =
          decoder.decode(value, {
            stream: true,
          });

        res.write(chunk);
      }
    } finally {
      reader.releaseLock();

      if (!res.writableEnded) {
        res.end();
      }
    }
  } catch (error) {
    console.error(
      "APInex connection error:",
      error
    );

    if (!res.headersSent) {
      return res.status(500).json({
        error:
          error?.message ||
          "Unable to connect to APInex.",
      });
    }

    if (!res.writableEnded) {
      res.end();
    }
  }
}
