# Browser Launchpad 🚀

A modern Chrome Extension that replaces the new tab page with a customizable, widget-based dashboard.

## Features

- **Multiple Pages**: Create and organize your dashboard into multiple pages
- **Widget System**: Add and customize various widgets:
  - 📌 **Bookmarks**: Save and organize your favorite links
  - 🌤️ **Weather**: Display current weather for any city
  - 💬 **AI Chat**: Chat with AI (OpenAI or Straico)
  - ⏰ **Clock**: Show time for any timezone
- **Themes**: Modern Light and Dark Elegance themes
- **Grid Layout**: Customize the number of columns (1-6)
- **Import/Export**: Backup and restore your data

## Tech Stack

- **Frontend**: React + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Platform**: Chrome Extension Manifest v3
- **Storage**: Chrome Storage API

## Getting Started

### Prerequisites

- Node.js 18+ and npm/pnpm
- Chrome browser for development and testing

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd browser-launchpad
   ```

2. Initialize the development environment:
   ```bash
   ./init.sh
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Load the extension in Chrome:
   - Open `chrome://extensions`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder

5. Open a new tab to see the extension!

## Development

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build production bundle
- `npm run lint` - Run linter
- `npm run type` - Run TypeScript type check

### Project Structure

```
browser-launchpad/
├── src/
│   ├── components/     # React components
│   ├── widgets/        # Widget components
│   ├── hooks/          # Custom React hooks
│   ├── services/       # API and storage services
│   ├── types/          # TypeScript type definitions
│   └── main.tsx        # Extension entry point
├── public/
│   └── manifest.json   # Chrome Extension manifest
├── dist/               # Build output
└── init.sh             # Initialization script
```

## Configuration

### API Keys

To use the AI Chat and Weather widgets, you'll need to configure API keys:

1. Open the extension
2. Click the Settings button
3. Configure your API keys:
   - **OpenAI**: Get your API key from https://platform.openai.com
   - **Straico**: Get your API key from https://straico.com
   - **Weather**: Get your API key from https://openweathermap.org

## Import/Export

You can backup and restore your data:

1. Open Settings
2. Click "Export Data" to download a JSON file
3. Click "Import Data" to restore from a backup

**Note**: By default, API keys are excluded from exports for security.

### CSP Configuration

The Content Security Policy is defined in **two places** and must be kept in sync:
1. `public/manifest.json` - `content_security_policy.extension_pages`
2. `newtab.html` - `<meta http-equiv="Content-Security-Policy">`

When adding new API endpoints, update the `connect-src` directive in **both files**.

### Development Notes

⚠️ **Do not remove and re-add the extension during development** - this clears Chrome Storage and you will lose your API keys and widget configurations. Instead, use the **reload button** on the extension card in `chrome://extensions`.

## Credits

Created by **Dennis Rongo**

## License

MIT
