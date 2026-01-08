import { chromium } from "playwright";

export async function searchCase({
  bench_name,
  case_type,
  case_no,
  case_year,
}) {
  const bench = bench_name;
  const caseType = case_type;
  const caseNumber = case_no;
  const caseYear = case_year;

  console.log("SEARCH CASE INPUT:", {
    bench_name,
    case_type,
    case_no,
    case_year,
  });

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();

    await page.goto("https://nclt.gov.in/case-number-wise", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    // 1️⃣ Wait for captcha
    await page.waitForSelector("#mainCaptcha", { timeout: 15000 });

    const captcha = (await page.textContent("#mainCaptcha"))
      ?.replace(/\s+/g, "")
      .trim();

    if (!captcha) {
      throw new Error("Captcha not generated");
    }

    // 2️⃣ Validate dropdown values (STRICT)
    for (const [selector, value] of [
      ["#bench", bench],
      ["#case_type", caseType],
      ["#case_year", caseYear],
    ]) {
      const exists = await page.$(`${selector} option[value="${value}"]`);
      if (!exists) {
        throw new Error(`Invalid value "${value}" for ${selector}`);
      }
    }

    // 3️⃣ Fill form
    await page.selectOption("#bench", bench);
    await page.waitForTimeout(300);

    await page.selectOption("#case_type", caseType);
    await page.waitForTimeout(300);

    await page.click("#case_number");
    await page.keyboard.type(caseNumber, { delay: 80 });
    await page.keyboard.press("Tab");

    await page.selectOption("#case_year", caseYear);
    await page.click("#txtInput");
    await page.keyboard.type(captcha, { delay: 60 });

    await page.evaluate(() => {
      document.querySelector("input[value='Search']").click();
    });

    await page.waitForFunction(
      () => {
        const rows = document.querySelectorAll("table tbody tr");
        const text = document.body.innerText;

        return (
          rows.length > 0 ||
          text.includes("No Record") ||
          text.includes("Invalid Captcha") ||
          text.includes("Please enter valid")
        );
      },
      { timeout: 30000 }
    );

    const html = await page.content();

    if (html.includes("Invalid Captcha")) {
      throw new Error("Captcha failed");
    }

    if (html.includes("No Record")) {
      return { data: [], message: "No record found" };
    }

    if (!html.includes("<table")) {
      throw new Error("Search did not execute (JS validation failed)");
    }

    return html;
  } finally {
    await browser.close();
  }
}
