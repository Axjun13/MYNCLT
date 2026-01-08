import { ncltHttp } from "./ncltHttp.js";
import { initNcltSession } from "./ncltSession.service.js";

const b64 = (v) =>
  Buffer.from(String(v).trim().toLowerCase()).toString("base64");

export async function advocateSearchDirect({
  bench_name,
  advocate_name,
  year,
  page = 1,
}) {
  // ✅ IMPORTANT
  await initNcltSession();

  const res = await ncltHttp.get(
    "https://nclt.gov.in/advocate-name-wise-search",
    {
      params: {
        bench: b64(bench_name),
        advocate_name: b64(advocate_name),
        year: b64(year),
        page,
      },
      headers: {
        Referer: "https://nclt.gov.in/advocate-name-wise",
      },
    }
  );

  return res.data; // HTML
}
