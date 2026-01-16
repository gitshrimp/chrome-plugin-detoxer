// Configuration - Replace with your actual Perspective API key
const PERSPECTIVE_API_KEY = ""; // TODO: Add your API key here

async function checkToxicity(text) {
  if (!PERSPECTIVE_API_KEY) {
    throw new Error("API key not configured. Please add your Perspective API key to background.js");
  }

  const human_data = {
    comment: {
      text: text,
    },
    requestedAttributes: {
      TOXICITY: {},
      INSULT: {},
      IDENTITY_ATTACK: {},
    },
    languages: ["en"],
  };

  try {
    const response = await fetch(`https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=${PERSPECTIVE_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(human_data),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Perspective API error:", error);
    throw error;
  }
}

  // Add visual feedback - processing indicator
  const processingIndicator = document.createElement('div');
  processingIndicator.id = 'detoxer-processing';
  processingIndicator.innerHTML = `
    <div style="
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(76, 175, 80, 0.9);
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      font-family: Arial, sans-serif;
      font-size: 14px;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      gap: 8px;
    ">
      <div style="width: 16px; height: 16px; border: 2px solid #fff; border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
      Filtering content...
    </div>
    <style>
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    </style>
  `;
  document.body.appendChild(processingIndicator);

  try {
    // Get all text nodes that are likely to contain natural language content
    const textNodes = [];
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function(node) {
          // Skip scripts, styles, and very short text
          if (node.parentElement &&
              !node.parentElement.closest('script, style, noscript') &&
              node.textContent.trim().length > 20) {
            return NodeFilter.FILTER_ACCEPT;
          }
          return NodeFilter.FILTER_SKIP;
        }
      }
    );

    let node;
    while (node = walker.nextNode()) {
      textNodes.push(node);
    }

    let filteredCount = 0;
    const toxicityThreshold = 0.7; // Higher threshold for less aggressive filtering

    // Process text nodes in batches to avoid overwhelming the API
    for (let i = 0; i < textNodes.length; i += 5) {
      const batch = textNodes.slice(i, i + 5);
      const promises = batch.map(async (textNode) => {
        const text = textNode.textContent.trim();
        if (text.length < 30) return; // Skip very short text

        try {
          const result = await checkToxicity(text);

          // Check if any toxicity score exceeds threshold
          let maxToxicity = 0;
          for (const attribute in result.attributeScores) {
            const score = result.attributeScores[attribute].summaryScore.value;
            maxToxicity = Math.max(maxToxicity, score);
          }

          if (maxToxicity > toxicityThreshold) {
            // Instead of removing completely, replace with a placeholder
            const placeholder = document.createElement('span');
            placeholder.style.cssText = `
              background: linear-gradient(45deg, #ffebee, #ffcdd2);
              border: 1px solid #e57373;
              border-radius: 4px;
              padding: 2px 6px;
              color: #c62828;
              font-style: italic;
              cursor: help;
              position: relative;
            `;
            placeholder.title = `Content filtered (toxicity score: ${(maxToxicity * 100).toFixed(0)}%)`;
            placeholder.textContent = '[Content filtered for toxicity]';

            // Replace the text node with the placeholder
            textNode.parentNode.replaceChild(placeholder, textNode);
            filteredCount++;
          }
        } catch (error) {
          console.warn('Failed to analyze text:', text.substring(0, 50) + '...', error);
        }
      });

      await Promise.all(promises);

      // Update progress indicator
      processingIndicator.querySelector('div').textContent = `Filtering content... (${Math.min(i + 5, textNodes.length)}/${textNodes.length})`;
    }

    // Update final status
    processingIndicator.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${filteredCount > 0 ? 'rgba(76, 175, 80, 0.9)' : 'rgba(255, 152, 0, 0.9)'};
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        font-family: Arial, sans-serif;
        font-size: 14px;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        gap: 8px;
      ">
        ${filteredCount > 0 ? '✓' : 'ℹ'} ${filteredCount} toxic content${filteredCount !== 1 ? 's' : ''} filtered
      </div>
    `;

    // Remove indicator after 3 seconds
    setTimeout(() => {
      if (processingIndicator.parentNode) {
        processingIndicator.parentNode.removeChild(processingIndicator);
      }
    }, 3000);

  } catch (error) {
    console.error('Detoxer error:', error);

    // Show error message
    processingIndicator.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(244, 67, 54, 0.9);
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        font-family: Arial, sans-serif;
        font-size: 14px;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        max-width: 300px;
      ">
        ❌ Error: ${error.message}
      </div>
    `;

    // Remove error after 5 seconds
    setTimeout(() => {
      if (processingIndicator.parentNode) {
        processingIndicator.parentNode.removeChild(processingIndicator);
      }
    }, 5000);
  }
}

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.url.includes('chrome://')) {
    try {
      // Check if API key is configured before injecting script
      if (!PERSPECTIVE_API_KEY) {
        // Show notification to user
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            const notification = document.createElement('div');
            notification.style.cssText = `
              position: fixed;
              top: 20px;
              right: 20px;
              background: rgba(255, 152, 0, 0.9);
              color: white;
              padding: 12px 16px;
              border-radius: 8px;
              font-family: Arial, sans-serif;
              font-size: 14px;
              z-index: 10000;
              box-shadow: 0 4px 12px rgba(0,0,0,0.3);
              max-width: 300px;
            `;
            notification.innerHTML = '⚠️ <strong>API Key Required</strong><br>Please add your Perspective API key to background.js';
            document.body.appendChild(notification);

            setTimeout(() => {
              if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
              }
            }, 5000);
          },
        });
        return;
      }

      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: filtertoxicity,
      });
    } catch (error) {
      console.error('Failed to execute script:', error);
    }
  }
});