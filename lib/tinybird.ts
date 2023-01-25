import { NextRequest, userAgent } from "next/server";
import { LOCALHOST_GEO_DATA } from "./constants";
import { capitalize, getDomainWithoutWWW } from "./utils";
import { conn } from "./planetscale";

/**
 * Recording clicks with geo, ua, referer and timestamp data
 * If key is not specified, record click as the root click ("_root", e.g. dub.sh, vercel.fyi)
 **/
export async function recordClick(
  domain: string,
  req: NextRequest,
  key?: string,
) {
  const geo = process.env.VERCEL === "1" ? req.geo : LOCALHOST_GEO_DATA;
  const ua = userAgent(req);
  const referer = req.headers.get("referer");

  return await Promise.allSettled([
    fetch(
      "https://api.us-east.tinybird.co/v0/events?name=click_events&wait=true",
      {
        method: "POST",
        body: JSON.stringify({
          timestamp: new Date(Date.now()).toISOString(),
          domain,
          key: key || "_root",
          country: geo.country || "Unknown",
          city: geo.city || "Unknown",
          region: geo.region || "Unknown",
          latitude: geo.latitude || "Unknown",
          longitude: geo.longitude || "Unknown",
          ua: ua.ua || "Unknown",
          browser: ua.browser.name || "Unknown",
          browser_version: ua.browser.version || "Unknown",
          engine: ua.engine.name || "Unknown",
          engine_version: ua.engine.version || "Unknown",
          os: ua.os.name || "Unknown",
          os_version: ua.os.version || "Unknown",
          device: ua.device.type ? capitalize(ua.device.type) : "Desktop",
          device_vendor: ua.device.vendor || "Unknown",
          device_model: ua.device.model || "Unknown",
          cpu_architecture: ua.cpu?.architecture || "Unknown",
          bot: ua.isBot,
          referer: getDomainWithoutWWW(referer) || "(direct)",
          referer_url: referer || "(direct)",
        }),
        headers: {
          Authorization: `Bearer ${process.env.TINYBIRD_API_KEY}`,
        },
      },
    ).then((res) => res.json()),
    // increment the click count for the link if key is specified (not root click)
    ...(key && [
      conn.execute(
        "UPDATE Link SET clicks = clicks + 1 WHERE domain = ? AND `key` = ?",
        [domain, key],
      ),
    ]),
  ]);
}

export async function getClicksUsage({
  domain,
  start,
  end,
}: {
  domain: string;
  start?: string;
  end?: string;
}) {
  const response = await fetch(
    `https://api.us-east.tinybird.co/v0/pipes/usage.json?domain=${domain}${
      start ? `&start=${start}` : ""
    }${end ? `&end=${end}` : ""}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.TINYBIRD_API_KEY}`,
      },
    },
  )
    .then((res) => res.json())
    .then((res) => res.data);

  let clicks = 0;
  try {
    clicks = response[0]["count()"];
  } catch (e) {
    console.log(e);
  }
  return clicks;
}
