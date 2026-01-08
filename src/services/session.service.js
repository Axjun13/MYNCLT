import axios from "axios";
import { wrapper } from "axios-cookiejar-support";
import { CookieJar } from "tough-cookie";

const sessions = new Map();

export async function createSession() {
  const jar = new CookieJar();

  const client = wrapper(
    axios.create({
      jar,
      withCredentials: true,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome",
      },
    })
  );

  // 🔑 IMPORTANT: Hit page ONCE to create session
  await client.get("https://nclt.gov.in/party-name-wise");

  const sessionId = Date.now().toString();

  sessions.set(sessionId, client);

  return sessionId;
}

export function getClient(sessionId) {
  if (!sessions.has(sessionId)) {
    throw new Error("Invalid or expired session");
  }
  return sessions.get(sessionId);
}
