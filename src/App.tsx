// LegionForge — Control Center
// Standalone (browser) build of the LegionForge web panel.
//
// "use client";
import "./app/globals.css";
import "./lib/client-api"; // installs the in-browser /api/* bridge before first fetch
import Dashboard from "./app/dashboard";

export default function App() {
  return <Dashboard />;
}
