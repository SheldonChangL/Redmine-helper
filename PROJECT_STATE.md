# PROJECT STATE

## Active Branch
`feature/issue-6-build-deployment`

## Active Issue
GitHub Issue #6 — Phase 6: Build & Deployment

## Status
**Implementation complete — ready for PR**

## Completed Work

### Phase 1 — Infrastructure & Security (merged to main)
- Electron app scaffold, secure BrowserWindow, preload/contextBridge
- safeStorage credentials with AES-256-GCM fallback
- electron-store (ESM async workaround), IPC channel constants
- System tray, global hotkeys (Cmd+Shift+R / Cmd+Shift+N)
- Frameless spotlight window

### Phase 2 — Core Issue Management (merged to main)
- Axios Redmine client (ping, fetchMyOpenIssues, fetchIssue, etc.)
- IPC handlers: issues:fetch, issues:get, issues:update, issues:fetchChildren
- Issue list view: priority cards, filter bar (project/priority/search)
- Slide-in detail panel with Markdown description (marked + DOMPurify)

### Phase 3 — Frictionless Time Tracking (merged to main via PR #9)
- src/shared/utils.js: secondsToDecimalHours(), formatDuration()
- src/shared/constants.js: TIME_ACTIVITIES IPC channel added
- src/main/api/redmineClient.js: fetchTimeActivities()
- src/main/ipc/time.ipc.js: time:log and time:activities IPC handlers
- src/main/ipc/index.js: timeIpc registered
- src/main/preload.js: time.activities() exposed
- src/renderer/js/views/timer.js: stopwatch + Pomodoro widget
- src/renderer/js/views/timeLog.js: time-entry form wired to timer
- src/renderer/js/app.js: Time nav renders renderTimeLog()
- src/renderer/css/timer.css
- Fix: build/icons/tray-icon.png — real PNG to prevent macOS Tray crash
- Fix: markdownRenderer.js import path corrected (../../../../node_modules)

### Phase 4 — Quick Creation & Attachments (merged to main via PR #10)
- src/shared/constants.js: ISSUES_CREATE, UPLOAD_CLIPBOARD, SPOTLIGHT_CLOSE added
- src/main/api/redmineClient.js: createIssue()
- src/main/api/uploadClient.js: uploadBuffer() via Redmine uploads API
- src/main/ipc/upload.ipc.js: clipboard + file upload IPC handlers
- src/main/ipc/issues.ipc.js: ISSUES_CREATE handler
- src/main/preload.js: issues.create, upload.fromClipboard/file, spotlight.close exposed
- src/renderer/js/spotlight.js: full Quick Create flow with multi-attach
- src/renderer/spotlight.html + css/spotlight.css

### Phase 5 — Notifications & Polish (merged to main via PR #11)
- src/main/polling/issuePoller.js: snapshot diff — detects status changes + new assignments
- src/main/polling/pollerManager.js: setTimeout chain (no overlap), user-configurable interval
- src/main/ipc/notifications.js: Electron Notification API + IPC push to renderer
- src/main/ipc/index.js: starts/restarts poller on creds save/clear and pollInterval change
- src/main/index.js: passes () => mainWindow to registerIpc; stops poller on quit
- src/renderer/js/views/issueList.js: listens for NOTIFY_ISSUE_CHANGED → auto-refreshes
- Dark mode auto-switch: already complete in app.js (applyTheme + matchMedia listener)
- Settings UI for poll intervals: already complete in settings.js

### Phase 6 — Build & Deployment (feature/issue-6-build-deployment)
- electron-builder.yml: added afterSign hook; unified icon.png for all platforms
- src/main/updater.js: electron-updater autoUpdater — download dialog + restart dialog
- src/main/index.js: calls initAutoUpdater(mainWindow) on ready-to-show
- scripts/notarize.js: afterSign hook using @electron/notarize (notarytool)
- scripts/generate-icons.js: generates 512×512 placeholder icon.png (replace before ship)
- build/icons/icon.png: 512×512 placeholder app icon
- .github/workflows/build.yml: CI — macOS (x64+arm64 dmg+zip), Windows (nsis x64), Linux (AppImage+deb x64)
- package.json: added electron-updater (dep) + @electron/notarize (devDep)

## Next Step
Phase 7 — Advanced Issue CRUD (Issue #7)

## Blockers
- build/icons/icon.png is a placeholder (solid #B22222). Replace with real design before distributing.
- macOS notarization requires APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, APPLE_TEAM_ID in GitHub Actions secrets.
- Code signing requires CSC_LINK / WIN_CSC_LINK certs in GitHub Actions secrets.
