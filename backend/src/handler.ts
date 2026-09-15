import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { askBedrock, validateAssistantInput } from "./assistant.js";
import { consumeDailyQuota, isValidAccessKey, releaseDailyQuota } from "./quota.js";

const json = (statusCode: number, body: object) => ({
  statusCode,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  body: JSON.stringify(body),
});

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const method = event.requestContext.http.method;
  const path = event.rawPath;
  if (method === "GET" && path.endsWith("/health")) return json(200, { status: "ok" });
  if (method !== "POST" || !path.endsWith("/assistant")) return json(404, { error: "Rota não encontrada." });

  const accessKey = event.headers["x-beta-key"] ?? "";
  const expectedHash = process.env.BETA_ACCESS_KEY_SHA256 ?? "";
  if (!expectedHash || !isValidAccessKey(accessKey, expectedHash)) return json(401, { error: "Chave de acesso inválida." });

  try {
    const input = validateAssistantInput(JSON.parse(event.body ?? "{}"));
    const quota = await consumeDailyQuota(accessKey);
    try {
      const result = await askBedrock(input);
      return json(200, {
        ...result,
        quota: { used: quota.used, remaining: quota.remaining, limit: quota.limit },
      });
    } catch (error) {
      await releaseDailyQuota(quota.quotaKey);
      throw error;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado.";
    const status = error instanceof SyntaxError ? 400 : error instanceof Error && error.name === "QuotaExceededError" ? 429 : message.includes("inválid") || message.includes("limite permitido") || message.includes("Selecione") || message.includes("Não há texto") ? 400 : 503;
    console.error(JSON.stringify({ event: "assistant_error", errorName: error instanceof Error ? error.name : "UnknownError" }));
    return json(status, { error: message });
  }
};
