import { getClient } from "./session.service.js";
import { parseResults } from "../parsers/result.parser.js";

export async function partySearch(data) {
  const client = getClient(data.sessionId);

  const res = await client.post(
    "https://nclt.gov.in/party-name-wise",
    new URLSearchParams({
      bench: data.bench,
      party_type: data.partyType,
      party_name: data.partyName,
      case_year: data.caseYear,
      status: data.status,
      captcha: data.captcha,
    })
  );

  return parseResults(res.data);
}
