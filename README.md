# Detoxer - Content Toxicity Filter

<p align="center">
<img width="80" alt="detoxer-icon" src="Detoxer/icons/icon.svg">
</p>

A Chrome extension that uses Google's Perspective API to detect and filter toxic content on web pages, helping create a safer browsing experience.

## Features

- 🛡️ **AI-Powered Detection**: Uses Google's Perspective API to analyze text for toxicity, insults, and identity attacks
- 🎯 **Smart Filtering**: Only filters content that exceeds configurable toxicity thresholds
- 👁️ **Visual Feedback**: Shows processing status and results with clear notifications
- ⚡ **Non-Destructive**: Replaces toxic content with helpful placeholders instead of removing it entirely
- 🔧 **Configurable**: Easy to adjust filtering sensitivity

## Installation

### 1. Get a Perspective API Key

1. Visit the [Perspective API](https://support.perspectiveapi.com/s/docs-get-started?language=en_US)
2. Follow the setup instructions to get your API key
3. The API has a free tier with generous limits for personal use

### 2. Configure the Extension

1. Open `Detoxer/background.js`
2. Find the line: `const PERSPECTIVE_API_KEY = "";`
3. Replace the empty string with your actual API key:
   ```javascript
   const PERSPECTIVE_API_KEY = "your-api-key-here";
   ```

### 3. Install in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked" and select the `Detoxer` folder
4. Pin the extension to your toolbar for easy access

## Usage

1. Visit any website with text content
2. Scroll down to load content (the extension analyzes visible text)
3. Click the Detoxer icon in your toolbar
4. Watch the processing indicator in the top-right corner
5. Toxic content will be replaced with clearly marked placeholders

## How It Works

The extension analyzes text content on web pages using Google's Perspective API, which scores content across multiple toxicity dimensions:

- **Toxicity**: General toxic behavior
- **Insult**: Insulting or disrespectful language
- **Identity Attack**: Targeting protected groups

Content with scores above the threshold (default: 70%) gets replaced with a placeholder that shows the toxicity score and explains why it was filtered.

## Configuration

You can adjust the filtering sensitivity by modifying `toxicityThreshold` in `background.js`:

```javascript
const toxicityThreshold = 0.7; // 0.0 to 1.0 (higher = less filtering)
```

## Troubleshooting

### "API Key Required" Error
- Make sure you've added your Perspective API key to `background.js`
- Verify the key is valid and has quota remaining

### No Content Being Filtered
- The page might not have highly toxic content
- Try lowering the `toxicityThreshold` for more aggressive filtering
- Check the browser console for any errors

### Extension Not Working
- Ensure the extension is enabled in `chrome://extensions/`
- Try refreshing the page and clicking the icon again
- Check if the website blocks content scripts

### API Errors
- Verify your API key is correct and active
- Check your API quota usage on the Google Cloud Console
- Network issues may cause temporary failures

## Privacy

- The extension only analyzes text content visible on the current page
- Content is sent to Google's Perspective API for analysis
- No browsing history or personal data is collected
- All processing happens locally in your browser

## Contributing

Feel free to submit issues and enhancement requests!

