Request for Quotation (RFQ): Redmine Smart Desktop Collaboration Tool
1. Project Overview
The objective of this project is to develop a high-performance, lightweight Redmine Smart Desktop Quick Tool based on the Electron framework. By integrating with internal Redmine systems via REST APIs, this tool aims to eliminate the friction of the web interface, enhancing team productivity in task management, time tracking, and requirement decomposition.

2. Core Technical Requirements
Tech Stack: Electron, HTML5, CSS3, JavaScript (ES6+), IPC Communication.

Security: * Implementation of preload.js with Context Bridge for strict isolation between the main and renderer processes.

Sensitive data (e.g., API Keys) must be stored using OS-level secure storage (e.g., Keytar or equivalent encryption).

Architecture: Support for local caching, background polling mechanisms, and native OS notifications.

3. Detailed Scope of Work
Phase 1: Infrastructure & Security
System Integration: Implement System Tray residency and window toggle logic.

Global Hotkeys: * Cmd/Ctrl+Shift+R: Toggle main window.

Cmd/Ctrl+Shift+N: Quick issue creation.

Credential Management: Secure storage for Redmine Base URL and API Key.

Phase 2: Core Issue Management
Data Sync: Automated fetching of "Open" issues assigned to the current user.

UI/UX: Filterable issue list (by Project/Priority) with Markdown rendering for descriptions.

Phase 3: Frictionless Time Tracking
One-Click Logging: Rapid time entry input.

Smart Timer: Integrated Pomodoro/Stopwatch that auto-converts duration to decimal hours for Redmine API submission.

Phase 4: Quick Creation & Attachments
Spotlight UI: A minimalist, command-bar style interface for new issues with auto-completion for projects/trackers.

Clipboard Integration: Intercept system clipboard images and upload them directly as Redmine attachments.

Phase 5: Notifications & Polish
Native Alerts: Push notifications for status changes or new assignments detected via polling.

System Aesthetics: Automatic Dark Mode detection and UI switching.

Phase 6: Build & Deployment
Cross-Platform: Configuration for electron-builder (Windows, macOS, Linux).

Updates: Implementation of an Auto-updater mechanism for seamless background deployments.

Phase 7: Advanced Issue CRUD
Status Transitions: Inline buttons for updating status, assignees, and progress.

Hierarchy Visualization: Tree view rendering for Parent/Sub-task relationships.

Phase 8: AI & Smart Automation
AI Bridge: Integration with local AI CLIs (e.g., Ollama) via streaming IPC.

Requirement Breakdown: Generate Acceptance Criteria (AC) and sub-tasks from a single feature sentence using AI.

Git Intelligence: AI-generated commit summarization based on local Git diffs, with automated journaling to Redmine.

4. Deliverables
Code Quality: Complete, "Ready-to-run" source code. Placeholders like // TODO are strictly prohibited.

Version Control: Clean Git repository history segmented by development phases.

Distribution: Packaged executables for all supported platforms