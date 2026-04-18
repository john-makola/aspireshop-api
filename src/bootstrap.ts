import dns from "dns";

// Force Node.js to prefer IPv4 — Railway internal DNS returns IPv6 first
// which causes pg connections to fail silently.
dns.setDefaultResultOrder("ipv4first");

import "./server";
