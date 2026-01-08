import * as cheerio from "cheerio";

export function parseResults(html) {
  const $ = cheerio.load(html);
  const rows = $("table tbody tr");

  if (!rows.length) return [];

  const results = [];

  rows.each((_, row) => {
    const cols = $(row).find("td");

    if (cols.length < 6) return;

    // 🔹 STATUS CELL
    const statusTd = $(cols[5]);
    const statusAnchor = statusTd.find("a");

    const statusText = statusAnchor.length
      ? statusAnchor.text().trim()
      : statusTd.text().trim();

    const statusLink = statusAnchor.length ? statusAnchor.attr("href") : "";

    results.push({
      filingNumber: $(cols[1]).text().trim(),
      caseNumber: $(cols[2]).text().trim(),
      petitionerVsRespondent: $(cols[3]).text().trim(),
      filingDate: $(cols[4]).text().trim(),

      // ✅ FIXED
      statusText,
      statusLink,
    });
  });

  return results;
}

export function parseIAMa($) {
  const rows = [];

  $("#collapseThree table tbody tr").each((_, tr) => {
    const tds = $(tr).find("td");
    if (tds.length < 4) return;

    const filingNo = $(tds[1]).text().trim();
    const caseNumber = $(tds[2]).text().trim();
    const status = $(tds[3]).text().trim();

    // ❌ skip empty rows
    if (!filingNo && !caseNumber && !status) return;

    rows.push({
      filingNo,
      caseNumber,
      status,
    });
  });

  return rows;
}

export function parseCaseDetails(html) {
  const $ = cheerio.load(html);

  const getValue = (label) =>
    $(`td:contains("${label}")`).next("td").text().trim();

  return {
    filingNumber: getValue("Filing Number"),
    filingDate: getValue("Filing Date"),
    partyName: getValue("Party Name"),
    petitionerAdvocate: getValue("Petitioner Advocate(s)"),
    respondentAdvocate: getValue("Respondent Advocate(s)"),
    caseNumber: getValue("Case Number"),
    registeredOn: getValue("Registered On"),
    lastListed: getValue("Last Listed"),
    nextListingDate: getValue("Next Listing Date"),
    caseStatus: getValue("Case Status"),

    // 🔥 TEMP: comment these
    allParties: parseAllParties($),
    listingHistory: parseListingHistory($),
    iaMa: parseIAMa($),
    connectedMatters: parseConnectedMatters($),
  };
}

export function parseConnectedMatters($) {
  const results = [];

  // Target ONLY the Connected Matters table
  const table = $("#collapsefourth table");

  if (!table.length) return results;

  table.find("tbody tr").each((_, row) => {
    const cols = $(row).find("td");

    // Case: "No Data Found!"
    if (cols.length === 1) return;

    results.push({
      diaryNo: $(cols[1]).text().trim(),
      caseNumber: $(cols[2]).text().trim(),
      date: $(cols[3]).text().trim(),
      status: $(cols[4]).text().trim(),
    });
  });

  return results;
}

export function parseListingHistory($) {
  const rows = [];

  $("table tbody tr").each((_, tr) => {
    const tds = $(tr).find("td");
    if (tds.length < 4) return;

    const listingDate = $(tds[1]).text().trim();
    const uploadDate = $(tds[2]).text().trim();
    const orderAnchor = $(tds[3]).find("a");
    const orderLink = orderAnchor.attr("href") || "";

    // ✅ must be a valid date
    const isValidDate = /^\d{2}-\d{2}-\d{4}$/.test(listingDate);

    // ❌ skip rows without PDF
    if (!isValidDate || !orderLink) return;

    rows.push({
      listingDate,
      uploadDate: uploadDate || "",
      orderLink,
    });
  });

  return rows;
}

function parseAllParties($) {
  const parties = [];

  $("#casedetail table")
    .filter((_, table) =>
      $(table).find("th").first().text().includes("Petitioner")
    )
    .find("tbody tr")
    .each((_, row) => {
      const tds = $(row).find("td");
      if (tds.length >= 2) {
        parties.push({
          petitioner: $(tds[0]).text().trim(),
          respondent: $(tds[1]).text().trim(),
        });
      }
    });

  return parties;
}
