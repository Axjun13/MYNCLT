import { getClient } from "./session.service.js";
import { parseResults } from "../parsers/result.parser.js";

export async function filingSearch(data) {
  const client = getClient(data.sessionId);

  const res = await client.post(
    "https://nclt.gov.in/diary-number-wise",
    new URLSearchParams({
      bench: data.bench,
      filing_no: data.filingNumber,
      filing_year: data.filingYear,
      captcha: data.captcha,
    })
  );

  return parseResults(res.data);
}
