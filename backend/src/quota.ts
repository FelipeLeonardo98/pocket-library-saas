import { createHash, timingSafeEqual } from "node:crypto";
import { DynamoDBClient, UpdateItemCommand } from "@aws-sdk/client-dynamodb";

export function hashAccessKey(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function isValidAccessKey(value: string, expectedHash: string) {
  const actual = Buffer.from(hashAccessKey(value), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function consumeDailyQuota(accessKey: string) {
  const tableName = process.env.QUOTA_TABLE_NAME;
  if (!tableName) throw new Error("Tabela de quotas não configurada.");
  const limit = Number(process.env.DAILY_AI_LIMIT ?? "30");
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const quotaKey = `${hashAccessKey(accessKey).slice(0, 16)}:${date}`;
  const expiresAt = Math.floor(now.getTime() / 1000) + 60 * 60 * 24 * 35;
  const client = new DynamoDBClient({ region: process.env.AWS_REGION ?? "us-east-1" });

  try {
    const result = await client.send(new UpdateItemCommand({
      TableName: tableName,
      Key: { quotaKey: { S: quotaKey } },
      UpdateExpression: "ADD #used :one SET #expires = if_not_exists(#expires, :expires)",
      ConditionExpression: "attribute_not_exists(#used) OR #used < :limit",
      ExpressionAttributeNames: { "#used": "used", "#expires": "expiresAt" },
      ExpressionAttributeValues: { ":one": { N: "1" }, ":limit": { N: String(limit) }, ":expires": { N: String(expiresAt) } },
      ReturnValues: "UPDATED_NEW",
    }));
    const used = Number(result.Attributes?.used?.N ?? "1");
    return { used, remaining: Math.max(0, limit - used), limit, quotaKey };
  } catch (error) {
    if (error instanceof Error && error.name === "ConditionalCheckFailedException") {
      const quotaError = new Error("Limite diário de interações atingido.");
      quotaError.name = "QuotaExceededError";
      throw quotaError;
    }
    throw error;
  }
}

export async function releaseDailyQuota(quotaKey: string) {
  const tableName = process.env.QUOTA_TABLE_NAME;
  if (!tableName) return;
  const client = new DynamoDBClient({ region: process.env.AWS_REGION ?? "us-east-1" });

  await client.send(new UpdateItemCommand({
    TableName: tableName,
    Key: { quotaKey: { S: quotaKey } },
    UpdateExpression: "ADD #used :minusOne",
    ConditionExpression: "#used > :zero",
    ExpressionAttributeNames: { "#used": "used" },
    ExpressionAttributeValues: { ":minusOne": { N: "-1" }, ":zero": { N: "0" } },
  })).catch((error) => {
    if (!(error instanceof Error && error.name === "ConditionalCheckFailedException")) throw error;
  });
}
