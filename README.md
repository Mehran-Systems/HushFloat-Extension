# HushFloat Browser Extension (`@mehransystems/hushfloat-extension`)

Cross-browser ambient sound sanctuary, sleep timer, brainwave synthesizer, and focus mixer by **Mehran Systems** — ported 1:1 from the **HushFloat** Android application (`com.mehransystems.hushfloat`) using **WXT + React + TypeScript + Web Audio API**.

## Supported Browsers
- **Mozilla Firefox** (`hushfloat@mehransystems.com`)
- **Opera**
- **Google Chrome**
- **Microsoft Edge / Brave / Vivaldi**

## Build Instructions (For Store Reviewers & Reproducible Builds)

### Prerequisites
- **Node.js:** `v20.x` or `v22.x` LTS
- **npm:** `v10.x` (included with Node.js)
- **Operating System:** Windows, macOS, or Linux

### Steps to Reproduce Build From Source
```bash
# 1. Install dependencies from package-lock.json
npm ci

# 2. Build & package for Mozilla Firefox (outputs .output/firefox-mv2 and .output/hushfloat-1.0.1-firefox.zip)
npm run zip:firefox

# 3. Build & package for Opera (outputs .output/opera-mv3 and .output/hushfloat-1.0.1-opera.zip)
npm run zip:opera

# 4. Build & package for Chrome / Edge (outputs .output/chrome-mv3 and .output/hushfloat-1.0.1-chrome.zip)
npm run zip
```

## Development Commands

```bash
# Development mode (opens browser with Hot Module Replacement)
npm run dev           # Chrome / Chromium
npm run dev:firefox   # Firefox
npm run dev:opera     # Opera
```
