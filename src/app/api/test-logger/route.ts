import { NextRequest, NextResponse } from 'next/server'
import { webhookLogger } from '@/lib/webhook-logger'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const format = url.searchParams.get('format') || 'html'

    const logs = webhookLogger.getRecentLogs(500) // Get last 500 lines

    // Return JSON if requested
    if (format === 'json') {
      return NextResponse.json({
        success: true,
        logs: logs,
        timestamp: new Date().toISOString(),
        logFile: webhookLogger.getLogFilePath() || 'Console only (Vercel /tmp)'
      })
    }

    // Return as HTML for easy viewing in browser
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Webhook Logs - Astra-N</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body {
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      background: #1e1e1e;
      color: #d4d4d4;
      padding: 20px;
      margin: 0;
      font-size: 13px;
      line-height: 1.6;
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
    }
    h1 {
      color: #4ec9b0;
      border-bottom: 2px solid #4ec9b0;
      padding-bottom: 10px;
      margin-bottom: 20px;
    }
    .info {
      background: #2d2d30;
      padding: 15px;
      border-radius: 5px;
      margin-bottom: 20px;
      border-left: 4px solid #4ec9b0;
    }
    .logs {
      background: #1e1e1e;
      border: 1px solid #3c3c3c;
      border-radius: 5px;
      padding: 20px;
      white-space: pre-wrap;
      word-wrap: break-word;
      overflow-x: auto;
    }
    .success { color: #4ec9b0; }
    .error { color: #f48771; }
    .warning { color: #dcdcaa; }
    .info-text { color: #569cd6; }
    .timestamp { color: #858585; }
    button {
      background: #0e639c;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 5px;
      cursor: pointer;
      font-size: 14px;
      margin-right: 10px;
    }
    button:hover {
      background: #1177bb;
    }
    .controls {
      margin-bottom: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔥 Webhook Logs - Live View</h1>

    <div class="info">
      <strong>📊 Log Information:</strong><br>
      • Showing last 500 log lines<br>
      • Auto-refresh: <span id="refresh-status">Enabled (5s)</span><br>
      • Timestamp: <span id="current-time">${new Date().toISOString()}</span><br>
      • Log File: ${webhookLogger.getLogFilePath() || 'Console only (Vercel /tmp)'}
    </div>

    <div class="controls">
      <button onclick="location.reload()">🔄 Refresh Now</button>
      <button onclick="toggleAutoRefresh()">⏸️ Toggle Auto-Refresh</button>
      <button onclick="clearLogs()">🗑️ Clear Logs</button>
      <button onclick="copyLogs()">📋 Copy to Clipboard</button>
    </div>

    <div class="logs" id="log-content">${escapeHtml(logs)}</div>
  </div>

  <script>
    let autoRefreshEnabled = true;
    let refreshInterval = null;

    function startAutoRefresh() {
      if (refreshInterval) clearInterval(refreshInterval);
      refreshInterval = setInterval(() => {
        if (autoRefreshEnabled) {
          location.reload();
        }
      }, 5000);
    }

    function toggleAutoRefresh() {
      autoRefreshEnabled = !autoRefreshEnabled;
      document.getElementById('refresh-status').textContent =
        autoRefreshEnabled ? 'Enabled (5s)' : 'Disabled';
    }

    async function clearLogs() {
      if (confirm('Are you sure you want to clear all logs?')) {
        await fetch('/api/test-logger?action=clear', { method: 'POST' });
        location.reload();
      }
    }

    function copyLogs() {
      const logs = document.getElementById('log-content').textContent;
      navigator.clipboard.writeText(logs).then(() => {
        alert('Logs copied to clipboard!');
      });
    }

    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    // Start auto-refresh
    startAutoRefresh();

    // Update current time every second
    setInterval(() => {
      document.getElementById('current-time').textContent = new Date().toISOString();
    }, 1000);
  </script>
</body>
</html>
    `

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      }
    })

  } catch (error: any) {
    return NextResponse.json({
      error: 'Failed to read logs',
      message: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const action = url.searchParams.get('action')

    if (action === 'clear') {
      webhookLogger.clearLogs()
      return NextResponse.json({
        success: true,
        message: 'Logs cleared successfully'
      })
    }

    return NextResponse.json({
      error: 'Invalid action'
    }, { status: 400 })

  } catch (error: any) {
    return NextResponse.json({
      error: 'Failed to process request',
      message: error.message
    }, { status: 500 })
  }
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }
  return text.replace(/[&<>"']/g, (m) => map[m])
}
