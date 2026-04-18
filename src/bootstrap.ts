// Simple entry point — just start the server.
// DNS resolution is no longer needed since we use the pg driver adapter
// which uses Node.js networking (handles Railway internal DNS natively).
import "./server";
