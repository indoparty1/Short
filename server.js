const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

// Simple in-memory storage for messages and users
let messages = [];
let connectedClients = new Map();

// Create HTTP server
const server = http.createServer((req, res) => {
  const filePath = req.url === '/' ? './index.html' : `.${req.url}`;
  const extname = path.extname(filePath);
  let contentType = 'text/html';
  
  switch (extname) {
    case '.js':
      contentType = 'text/javascript';
      break;
    case '.css':
      contentType = 'text/css';
      break;
    case '.json':
      contentType = 'application/json';
      break;
    case '.png':
      contentType = 'image/png';
      break;
    case '.jpg':
      contentType = 'image/jpg';
      break;
  }
  
  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // Page not found
        fs.readFile('./index.html', (err, content) => {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(content, 'utf-8');
        });
      } else {
        // Server error
        res.writeHead(500);
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      // Success
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

// Create WebSocket server
const wss = new WebSocket.Server({ server, path: '/ws' });

// Broadcast to all clients
function broadcast(data) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

// Update users count
function updateUserCount() {
  const userCount = {
    type: 'users',
    count: connectedClients.size
  };
  broadcast(JSON.stringify(userCount));
}

// WebSocket server events
wss.on('connection', (ws) => {
  console.log('Client connected');
  
  // Set client ID
  const clientId = Date.now().toString();
  connectedClients.set(clientId, { ws, username: null });
  
  // Send previous messages
  messages.forEach(message => {
    ws.send(JSON.stringify(message));
  });
  
  ws.on('message', (data) => {
    const message = JSON.parse(data);
    
    // Handle message types
    switch (message.type) {
      case 'join':
        connectedClients.get(clientId).username = message.sender;
        updateUserCount();
        broadcast(JSON.stringify(message));
        break;
      
      case 'chat':
        // Store message in memory
        if (messages.length >= 100) {
          messages.shift(); // Remove oldest message if we have 100+ messages
        }
        messages.push(message);
        broadcast(JSON.stringify(message));
        break;
    }
  });
  
  ws.on('close', () => {
    const client = connectedClients.get(clientId);
    if (client && client.username) {
      const leaveMessage = {
        type: 'leave',
        sender: client.username,
        timestamp: new Date().toISOString()
      };
      broadcast(JSON.stringify(leaveMessage));
    }
    
    connectedClients.delete(clientId);
    updateUserCount();
    console.log('Client disconnected');
  });
  
  updateUserCount();
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
