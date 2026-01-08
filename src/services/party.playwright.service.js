import axios from "axios";
import { enc } from "../utils/ncltEncoder.js"; // ✅ IMPORT THIS

export async function partySearchDirect({
  bench_name,
  party_name,
  party_type,
  case_year,
  case_status = "",
  page = 1,
}) {
  const params = {
    bench: enc(bench_name),
    party_type: enc(party_type),
    party_name: enc(party_name.toLowerCase()),
    case_year: enc(case_year),
    case_status: case_status ? enc(case_status) : "",
    page, // 🔥 CRITICAL FOR PAGINATION
  };

  const res = await axios.get("https://nclt.gov.in/party-name-wise-search", {
    params,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      Referer: "https://nclt.gov.in/party-name-wise",
      Accept: "text/html",
    },
    timeout: 15000,
  });

  return res.data;
}
