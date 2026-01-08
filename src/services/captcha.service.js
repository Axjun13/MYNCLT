import { getClient } from "./session.service.js";
import * as cheerio from "cheerio";
import fs from "fs";

const PAGE_URLS = {
  advocate: "https://nclt.gov.in/advocate-name-wise",
  filing: "https://nclt.gov.in/diary-number-wise",
  case: "https://nclt.gov.in/case-number-wise",
  party: "https://nclt.gov.in/party-name-wise",
};

export async function fetchCaptcha(sessionId, mode) {
  const client = getClient(sessionId);

  const url = PAGE_URLS[mode];
  if (!url) throw new Error("Invalid captcha mode");

  // 🔥 THIS IS CRITICAL
  const res = await client.get(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html",
      Referer: "https://nclt.gov.in/",
    },
  });

  fs.writeFileSync("debug.html", res.data);
  console.log("HTML dumped to debug.html");

  const $ = cheerio.load(res.data);

  // 🔍 DEBUG (optional – keep for now)
  // console.log($("#mainCaptcha").parent().html());

  let captchaText = $("#mainCaptcha").text();

  if (!captchaText) {
    throw new Error(`Captcha not found on ${mode} page`);
  }

  captchaText = captchaText.replace(/\s+/g, "").trim();

  if (!captchaText) {
    throw new Error("Captcha empty after cleanup");
  }

  return { captcha: captchaText };
}
