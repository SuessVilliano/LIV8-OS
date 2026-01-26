
// This script runs on pages matching the manifest patterns (e.g. app.gohighlevel.com)

console.log("LIV8 OS Content Script Loaded");

// Example: Inject a floating button into the GHL dashboard
// In a real build, you might inject the full React app into a Shadow DOM here.

const initOperator = () => {
  // Check if we are on a valid page
  if (!window.location.href.includes("gohighlevel.com") && !window.location.href.includes("leadconnector")) return;
  
  // Check if button already exists
  if (document.getElementById("liv8-launcher")) return;

  const btn = document.createElement("button");
  btn.id = "liv8-launcher";
  btn.innerText = "🤖";
  btn.style.position = "fixed";
  btn.style.bottom = "20px";
  btn.style.right = "20px";
  btn.style.zIndex = "99999";
  btn.style.width = "50px";
  btn.style.height = "50px";
  btn.style.borderRadius = "50%";
  btn.style.backgroundColor = "#0f172a"; // Slate-900
  btn.style.color = "white";
  btn.style.fontSize = "24px";
  btn.style.border = "none";
  btn.style.boxShadow = "0 10px 15px -3px rgba(0, 0, 0, 0.1)";
  btn.style.cursor = "pointer";
  btn.style.transition = "transform 0.2s";

  btn.onmouseover = () => btn.style.transform = "scale(1.1)";
  btn.onmouseout = () => btn.style.transform = "scale(1)";

  btn.onclick = () => {
    alert("LIV8 OS Operator is active. Use the Chrome Extension popup to manage your agents.");
  };

  document.body.appendChild(btn);
};

// Attempt to initialize
setTimeout(initOperator, 2000);
