# PROJECT STATE

## Active Branch
`main`

## Active Issue
None — ready for Phase 5

## Status
**Phase 4 complete — PR #10 squash-merged to main**

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
- src/main/api/uploadClient.js: uploadImage() via Redmine uploads API
- src/main/ipc/upload.ipc.js: clipboard read in main process, uploads image
- src/main/ipc/issues.ipc.js: ISSUES_CREATE handler
- src/main/ipc/index.js: uploadIpc registered
- src/main/preload.js: issues.create, upload.fromClipboard, spotlight.close exposed
- src/renderer/js/components/autocomplete.js: fuzzy subsequence search
- src/renderer/js/spotlight.js: full Quick Create flow
- src/renderer/spotlight.html: form with clipboard upload button
- src/renderer/css/spotlight.css: styling + validation flash + hidden class

**Fixes applied in fix-iteration commit (7f1e197):**
- hotkeys.js: Cmd+Shift+N now toggles hide/show — prevents double-press transparent+opaque overlap
- spotlight redesigned: dedicated title input, project/tracker always visible, assignee dropdown per project
- redmineClient.js + constants.js + issues.ipc.js + preload.js: PROJECT_MEMBERS channel
- spotlight window height 320 → 440px
- spotlight.css: new layout, removed autocomplete styles

**Fixes applied in fix-iteration commit (58793ad):**
- src/main/index.js: removed app.dock.hide() — app now visible in macOS Dock
- src/renderer/spotlight.html: added theme-light/dark CSS links — fixes invisible/transparent window
- src/renderer/css/base.css: sidebar padding-top 12px → 42px — clears hiddenInset traffic-light buttons

## Next Step
Phase 5 — Notifications & Polish (Issue #5)
- Background polling for issue changes
- Native OS notifications
- Dark mode auto-switch

## Blockers
None currently.
