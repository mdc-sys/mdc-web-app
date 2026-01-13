import { DynamoDBClient, GetItemCommand, PutItemCommand } from "@aws-sdk/client-dynamodb";

/* -------------------- helpers -------------------- */

function tableName() {
  const name = process.env.DDB_INSTRUCTOR_AVAILABILITY_TABLE;
  if (!name) throw new Error("Missing DDB_INSTRUCTOR_AVAILABILITY_TABLE");
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

/* -------------------- types -------------------- */

export type WeeklyBlock = { day: number; start: string; end: string };

export type AvailabilityRules = {
  instructorId: string;
  timezone: string;
  weekly: WeeklyBlock[];
  updatedAt: string;
};

/* -------------------- loaders -------------------- */

export async function loadAvailabilityRules(
  instructorId: string
): Promise<AvailabilityRules | undefined> {
  assertNonEmptyString(instructorId, "instructorId");

  const res = await client.send(
    new GetItemCommand({
      TableName: tableName(),
      Key: { instructorId: { S: instructorId } },
      ConsistentRead: true,
    })
  );

  const json = res.Item?.rulesJson?.S;
  const updatedAt = res.Item?.updatedAt?.S || new Date().toISOString();
  if (!json) return undefined;

  try {
    const parsed = JSON.parse(json) as { timezone?: string; weekly?: WeeklyBlock[] };

    const timezone =
      typeof parsed.timezone === "string" && parsed.timezone.trim().length > 0
        ? parsed.timezone.trim()
        : "America/New_York";

    const weekly = Array.isArray(parsed.weekly) ? parsed.weekly : [];

    return { instructorId, timezone, weekly, updatedAt };
  } catch (e) {
    console.warn("Invalid rulesJson for instructorId:", instructorId, e);
    return undefined;
  }
}

/* -------------------- savers -------------------- */

export async function saveAvailabilityRules(
  instructorId: string,
  data: { timezone: string; weekly: WeeklyBlock[] }
) {
  assertNonEmptyString(instructorId, "instructorId");
  assertNonEmptyString(data.timezone, "timezone");

  const now = new Date().toISOString();

  const json = JSON.stringify({
    timezone: data.timezone,
    weekly: data.weekly ?? [],
  });

  await client.send(
    new PutItemCommand({
      TableName: tableName(),
      Item: {
        instructorId: { S: instructorId },
        rulesJson: { S: json },
        updatedAt: { S: now },
      },
    })
  );
}
