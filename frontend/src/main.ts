import "./ui/tokens.css";
import "./ui/base.css";
import "./ui/components.css";
import { initApp } from "./app";

const el = document.getElementById("app");
if (el) initApp(el);

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js");
}
