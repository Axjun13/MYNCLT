import { ncltHttp } from "./ncltHttp.js";

let initialized = false;

export async function initNcltSession() {
  if (initialized) return;

  // This request creates the Drupal session cookie
  await ncltHttp.get("https://nclt.gov.in/advocate-name-wise");

  initialized = true;
}
