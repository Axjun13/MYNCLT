import { chromium } from "playwright";

export async function getCaptchaAndPage(mode) {
  const URLS = {
    advocate: "https://nclt.gov.in/advocate-name-wise",
    filing: "https://nclt.gov.in/diary-number-wise",
    case: "https://nclt.gov.in/case-number-wise",
    party: "https://nclt.gov.in/party-name-wise",
  };

  if (!URLS[mode]) {
    throw new Error(`Invalid mode: ${mode}`);
  }

  const browser = await chromium.launch({
    headless: false, // keep false while debugging
  });

  try {
    const page = await browser.newPage();

    await page.goto(URLS[mode], {
      waitUntil: "domcontentloaded",
    });

    await page.waitForSelector("#mainCaptcha", { timeout: 10000 });

    const captchaRaw = await page.textContent("#mainCaptcha");

    const captcha = captchaRaw.replace(/\s+/g, "").trim();

    if (!captcha) {
      throw new Error("Captcha empty after render");
    }

    return { captcha };
  } finally {
    // ✅ ALWAYS close browser
    await browser.close();
  }
}
