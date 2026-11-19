export function isPhone({ userAgent = "", userAgentData, platform = "", maxTouchPoints }) {
  // iPads can include "Mobile" in Safari's UA or identify as a multi-touch Mac.
  if (platform === "iPad" || /iPad|Tablet|Kindle|Silk|PlayBook/i.test(userAgent)) return false;
  if (/iPhone|iPod/i.test(platform) || /iPhone|iPod|Windows Phone|IEMobile|BlackBerry|BB10|Opera Mini/i.test(userAgent)) return true;
  const mobileToken = /\bMobi/i.test(userAgent);
  // Some Android tablets send a mobile client hint but omit the phone-only UA token.
  if (/Android/i.test(userAgent)) return mobileToken;
  if ((platform === "MacIntel" || /Macintosh/i.test(userAgent)) && maxTouchPoints > 1) return false;
  return userAgentData?.mobile === true || mobileToken;
}

export function openAppPage() {
  const device = isPhone(navigator) ? "phone" : "supported";
  for (const template of document.querySelectorAll("template[data-device]")) {
    if (template.dataset.device !== device) {
      template.remove();
      continue;
    }
    const fragment = document.importNode(template.content, true);
    // Keep the original module order when activating the app markup.
    for (const script of fragment.querySelectorAll("script")) script.async = false;
    template.replaceWith(fragment);
  }
  if (device === "supported") return;

  document.body.insertAdjacentHTML("afterbegin", `
    <main class="phone-notice" aria-labelledby="phoneNoticeTitle">
      <section class="phone-notice__card glass">
        <a class="brand" href="https://developers.arcgis.com/" target="_blank" rel="noopener noreferrer"
           title="Develop with ArcGIS — opens in a new tab">
          <span class="brand__logo-wrap">
            <img class="brand__logo" src="./assets/dev-logo.png" alt="Esri Developers" width="40" height="40">
            <span class="brand__glow" aria-hidden="true"></span>
          </span>
          <span class="brand__text">
            <span class="brand__badge">Develop with <span class="brand__accent">ArcGIS</span></span>
            <span class="brand__title">Construction Timelapse</span>
          </span>
        </a>
        <svg class="phone-notice__icon" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
          <rect x="4" y="6" width="40" height="28" rx="3"></rect>
          <path d="M17 42h14M24 34v8M4 28h40"></path>
        </svg>
        <h1 id="phoneNoticeTitle">Please open on a tablet or computer</h1>
        <p>Construction Timelapse isn’t available on phones. Open this link on an iPad,
           another tablet, or a computer to explore the project:</p>
        <p class="phone-notice__url"></p>
      </section>
    </main>`);
  document.querySelector(".phone-notice__url").textContent = location.href;
}
