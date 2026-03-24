export interface Env {
  // Resolves the empty interface warning and gives us a place to securely inject
  // your production URL later via the Cloudflare Dashboard.
  NEXTJS_ORIGIN?: string;
}

// A standard list of jurisdictions with strict online gambling prohibitions
const RESTRICTED_COUNTRIES = [
  "US", // United States
  "GB", // United Kingdom
  "AU", // Australia
  "FR", // France
  "NL", // Netherlands
];

/**
 * Generates the 403 Forbidden HTML page.
 * Extracted from the main handler to keep the proxy logic clean.
 */
function generateForbiddenHtml(countryCode: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Access Denied - Aegis Casino</title>
        <style>
            body { background-color: #020617; color: #94a3b8; font-family: monospace; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; padding: 20px; }
            h1 { color: #ef4444; font-size: 2rem; text-transform: uppercase; letter-spacing: 0.1em; }
            p { max-width: 500px; line-height: 1.5; }
            .country-code { color: #10b981; font-weight: bold; font-size: 1.2rem; }
        </style>
    </head>
    <body>
        <h1>403: Jurisdiction Restricted</h1>
        <p>We're sorry, but Aegis Casino is not available in your region due to local online gambling regulations.</p>
        <p>Your detected region code: <span class="country-code">${countryCode}</span></p>
    </body>
    </html>
  `;
}

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    // 1. Edge Geofence Check
    const country = (request.cf?.country as string) || "XX";

    if (RESTRICTED_COUNTRIES.includes(country)) {
      return new Response(generateForbiddenHtml(country), {
        status: 403,
        headers: { "Content-Type": "text/html; charset=UTF-8" },
      });
    }

    // 2. Prepare Proxy Request Details
    const url = new URL(request.url);
    const targetOrigin = env.NEXTJS_ORIGIN || "http://web:3000";
    const targetUrl = targetOrigin + url.pathname + url.search;

    // Clone the request headers so we can append edge-computed data for the backend
    const proxyHeaders = new Headers(request.headers);
    proxyHeaders.set("X-Aegis-Country", country);
    
    // Ensure the backend knows the real IP of the client, not the Cloudflare Worker IP
    const clientIp = request.headers.get("cf-connecting-ip");
    if (clientIp) {
      proxyHeaders.set("X-Real-IP", clientIp);
    }

    // 3. Construct and Forward the Request
    const proxiedRequest = new Request(targetUrl, {
      method: request.method,
      headers: proxyHeaders,
      body: request.body,
      redirect: "manual",
    });

    return fetch(proxiedRequest);
  },
};
