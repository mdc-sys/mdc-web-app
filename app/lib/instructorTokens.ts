import { DynamoDBClient, GetItemCommand, PutItemCommand } from "@aws-sdk/client-dynamodb";

function tableName() {
  const name = process.env.DDB_INSTRUCTOR_TOKENS_TABLE;
  if (!name) throw new Error("Missing DDB_INSTRUCTOR_TOKENS_TABLE");
  return name;
}

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-2",
});

function assertNonEmptyString(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} is missing or empty`);
  }
}

/**
 * Store tokens as JSON string to avoid marshalling ambiguity.
 * NOTE: DynamoDB does not allow empty strings for { S: ... } values.
 */
export async function saveInstructorTokens(instructorId: string, googleTokens: any) {
  assertNonEmptyString(instructorId, "instructorId");

  const now = new Date().toISOString();
  const json = JSON.stringify(googleTokens ?? {});

  // DynamoDB also does not allow empty strings; ensure json isn't empty.
  if (json.trim().length === 0) {
    throw new Error("googleTokens JSON is empty");
  }

  await client.send(
    new PutItemCommand({
      TableName: tableName(),
      Item: {
        instructorId: { S: instructorId },
        googleTokensJson: { S: json },
        updatedAt: { S: now },
      },
    })
  );
}

export async function loadInstructorTokens(instructorId: string) {
  assertNonEmptyString(instructorId, "instructorId");

  const params = {
    TableName: tableName(),
    Key: {
      instructorId: { S: instructorId },
    },
    ConsistentRead: true,
  };

  // TEMP DEBUG: confirms exactly what we send (no secrets here)
  console.log("LOAD TOKENS DEBUG:", {
    table: params.TableName,
    key: params.Key,
    instructorId,
  });

  const res = await client.send(new GetItemCommand(params));

  const json = res.Item?.googleTokensJson?.S;
  if (!json) return undefined;

  try {
    return JSON.parse(json);
  } catch (e) {
    console.error("Failed to parse googleTokensJson from DynamoDB:", e);
    return undefined;
  }
}
