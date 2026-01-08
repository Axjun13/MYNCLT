import express from "express";
import { createSession } from "../services/session.service.js";
import { fetchCaptcha } from "../services/captcha.service.js";
import { partySearchDirect } from "../services/party.playwright.service.js";
import axios from "axios";
import { enc } from "../utils/ncltEncoder.js";
import { parseResults } from "../parsers/result.parser.js";
import { parseCaseDetails } from "../parsers/result.parser.js";
import { advocateSearchDirect } from "../services/advocate.service.js";
import { getCaptchaAndPage } from "../services/playwrightCaptcha.service.js";

const router = express.Router();

router.get("/pdf", async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) {
      return res.status(400).send("Missing PDF url");
    }

    const pdfResponse = await axios.get(`https://nclt.gov.in/${url}`, {
      responseType: "arraybuffer",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        Referer: "https://nclt.gov.in/",
      },
      timeout: 20000,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline; filename=nclt-order.pdf");

    res.send(pdfResponse.data);
  } catch (err) {
    console.error("PDF fetch failed:", err.message);
    res.status(500).send("Failed to load PDF");
  }
});

// routes/nclt.routes.js
router.post("/case-details", async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: "case details url missing" });
    }

    // ✅ FIX: always prefix with /
    const normalizedPath = url.startsWith("/") ? url : `/${url}`;

    const fullUrl = `https://nclt.gov.in${normalizedPath}`;

    const response = await axios.get(fullUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "text/html",
        Referer: "https://nclt.gov.in/",
      },
      timeout: 15000,
    });

    const html = response.data;

    const data = parseCaseDetails(html);

    res.json({ data });
  } catch (err) {
    console.error("Case details fetch failed:", err.message);
    res.status(500).json({ error: "Failed to load case details" });
  }
});

// playwright captcha
router.get("/captcha-playwright/:mode", async (req, res) => {
  try {
    const { captcha } = await getCaptchaAndPage(req.params.mode);
    res.json({ captcha });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/session", async (req, res) => {
  try {
    const sessionId = await createSession();
    res.json({ sessionId });
  } catch (err) {
    res.status(500).json({ error: "Session init failed" });
  }
});

// legacy captcha (optional – can remove later)
router.get("/captcha/:mode/:sessionId", async (req, res) => {
  try {
    const { mode, sessionId } = req.params;
    const result = await fetchCaptcha(sessionId, mode);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/search/case", async (req, res) => {
  try {
    const { bench_name, case_type, case_number, case_year } = req.body;

    // ✅ Mandatory validation (matches NCLT UI)
    if (!bench_name || !case_type || !case_number || !case_year) {
      return res.status(400).json({
        error: "bench_name, case_type, case_number, case_year are mandatory",
      });
    }

    // ✅ Build query exactly like NCLT
    const params = {
      bench: enc(bench_name),
      case_type: enc(case_type),
      case_no: enc(case_number),
      case_year: enc(case_year),
    };

    const response = await axios.get(
      "https://nclt.gov.in/case-number-wise-search",
      {
        params,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Accept: "text/html",
          Referer: "https://nclt.gov.in/case-number-wise",
        },
        timeout: 15000,
      }
    );

    const html = response.data;
    const PAGE_SIZE = 10;

    const data = parseResults(html);

    const hasNext = data.length === PAGE_SIZE;

    if (!data || data.length === 0) {
      return res.json({
        data: [],
        message: "No record found",
      });
    }

    res.json({
      data,
      page: Number(page),
      pageSize: PAGE_SIZE,
      hasNext,
    });
  } catch (err) {
    console.error("Case number search failed:", err.message);
    res.status(500).json({
      error: "NCLT case search failed",
    });
  }
});

// other existing routes
router.post("/search/filing", async (req, res) => {
  try {
    const { bench_name, filing_no, case_year } = req.body;

    // ✅ strict validation (NCLT requires all 3)
    if (!bench_name || !filing_no || !case_year) {
      return res.status(400).json({
        error: "bench_name, filing_no and case_year are mandatory",
      });
    }

    const params = {
      bench: enc(bench_name),
      filing_no: enc(filing_no),
      case_year: enc(case_year),
    };

    const response = await axios.get(
      "https://nclt.gov.in/diary-number-wise-search",
      {
        params,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Accept: "text/html",
          Referer: "https://nclt.gov.in/diary-number-wise",
        },
        timeout: 15000,
      }
    );

    const html = response.data;
    const data = parseResults(html);

    if (!data.length) {
      return res.json({ data: [], message: "No record found" });
    }

    res.json({ data });
  } catch (err) {
    console.error("Filing number search failed:", err.message);
    res.status(500).json({ error: "NCLT filing search failed" });
  }
});

router.post("/search/party", async (req, res) => {
  try {
    const {
      bench_name,
      party_name,
      party_type,
      case_year,
      case_status,
      page = 1, // 🔥 ADD THIS
    } = req.body;

    // ✅ STRICT (matches NCLT)
    if (!bench_name || !party_name || !party_type || !case_year) {
      return res.status(400).json({
        error: "bench_name, party_name, party_type, case_year are mandatory",
      });
    }

    const html = await partySearchDirect({
      bench_name,
      party_name,
      party_type, // 1 / 2 / 3
      case_year,
      case_status: case_status || "",
      page, // 🔥 ADD THIS
    });

    const data = parseResults(html);

    if (!data.length) {
      return res.json({ data: [], message: "No record found" });
    }

    res.json({
      data,
      page: Number(page),
      pageSize: 10,
      hasNext: data.length === 10, // 🔥 NCLT rule
    });
  } catch (err) {
    console.error("Party search failed:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/search/advocate", async (req, res) => {
  const { bench_name, advocate_name, year, page = 1 } = req.body;

  if (!bench_name || !advocate_name || !year) {
    return res.status(400).json({
      error: "bench_name, advocate_name, year are mandatory",
    });
  }

  const html = await advocateSearchDirect({
    bench_name,
    advocate_name,
    year,
    page,
  });

  const data = parseResults(html);

  res.json({
    data,
    page,
    pageSize: 10,
    hasNext: data.length === 10,
  });
});

export default router;
