# LIV8 OS Chrome Extension

> **Create it in the Mind, Watch it Come Alive**

The LIV8 OS Chrome Extension brings your AI business co-pilot directly into your browser. Capture content, chat with AI staff, create marketing materials, and manage leads without leaving any webpage.

## Features

### 🎯 Quick Capture
- Select any text and send it to your AI staff
- Capture entire pages for analysis
- Right-click context menus for instant actions
- Add leads to CRM from any webpage

### 🤖 AI Staff Access
- Chat with Marketing Manager, Sales Rep, Support Agent, and more
- Voice commands with "Hey LIV" wake word
- Create content on the fly
- Get instant assistance

### 🎨 Seamless Integration
- Theme syncs with LIV8 dashboard
- Side panel for non-intrusive access
- Keyboard shortcuts for power users
- Works on any website

## Installation

### From Chrome Web Store (Coming Soon)
1. Visit the Chrome Web Store
2. Search for "LIV8 OS"
3. Click "Add to Chrome"

### Manual Installation (Developer Mode)
1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (top right)
4. Click "Load unpacked"
5. Select the `chrome-extension` folder
6. The extension icon will appear in your toolbar

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+L` | Open LIV8 Assistant |
| `Ctrl+Shift+V` | Toggle Voice Commands |
| `Ctrl+Shift+C` | Quick Capture Page |

*Mac users: Replace `Ctrl` with `Cmd`*

## Usage

### Side Panel
Click the extension icon or press `Ctrl+Shift+L` to open the AI assistant panel. From here you can:

- **Chat Tab**: Converse with your AI assistant
- **Staff Tab**: Select a specific AI staff member
- **Tools Tab**: Access content creation tools
- **Settings Tab**: Configure preferences

### Context Menu
Right-click on any webpage to:
- Send selected text to AI Staff
- Capture the entire page
- Create content from selection
- Add information as a lead

### Voice Commands
Enable voice commands to control LIV8 hands-free:
- "Hey LIV" - Wake word
- "Create a post about [topic]"
- "Write an email to [recipient]"
- "Show my dashboard"

## Configuration

### Theme Sync
The extension automatically syncs its theme with your LIV8 dashboard. Change the theme in Settings, and it updates everywhere.

### API Connection
The extension connects to your LIV8 account automatically when you're logged into the dashboard. Your API keys and settings sync securely.

## Development

### Project Structure
```
chrome-extension/
├── manifest.json      # Extension manifest (MV3)
├── background.js      # Service worker
├── popup.html/js      # Toolbar popup
├── sidepanel.html/js  # Side panel UI
├── content.js/css     # Page injection
└── icons/             # Extension icons
```

### Building
No build step required - load the folder directly in Chrome.

### Testing
1. Load the extension in developer mode
2. Click the extension icon to test popup
3. Press `Ctrl+Shift+L` to test side panel
4. Right-click on pages to test context menus

## Privacy

- We only capture data you explicitly select
- No tracking or analytics
- All communication uses secure HTTPS
- Your API keys are stored locally in Chrome storage

## Support

- **Documentation**: [docs.liv8.ai](https://docs.liv8.ai)
- **Issues**: [GitHub Issues](https://github.com/liv8ai/extension/issues)
- **Email**: support@liv8.ai

## License

Copyright © 2026 LIV8 AI. All rights reserved.
