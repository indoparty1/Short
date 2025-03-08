
// In-memory storage for messages (will be cleared on server restart)
let chatMessages = [];
let username = '';
let socket = null;
let onlineUsers = 0;

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const chatScreen = document.getElementById('chat-screen');
const usernameInput = document.getElementById('username-input');
const joinBtn = document.getElementById('join-btn');
const messagesContainer = document.getElementById('messages');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const onlineCount = document.getElementById('online-count');

// Helper function to format time
function formatTime(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Function to create and append a message element
function appendMessage(message, isSent = false, isSystem = false) {
  if (isSystem) {
    const systemMessage = document.createElement('div');
    systemMessage.className = 'system-message';
    systemMessage.textContent = message.content;
    messagesContainer.appendChild(systemMessage);
    return;
  }

  const messageElement = document.createElement('div');
  messageElement.className = `message ${isSent ? 'sent' : 'received'}`;

  const messageInfo = document.createElement('div');
  messageInfo.className = 'message-info';

  const messageName = document.createElement('span');
  messageName.className = 'message-name';
  messageName.textContent = message.sender;

  const messageTime = document.createElement('span');
  messageTime.className = 'message-time';
  messageTime.textContent = formatTime(new Date(message.timestamp));

  const messageContent = document.createElement('div');
  messageContent.className = 'message-content';
  messageContent.textContent = message.content;

  messageInfo.appendChild(messageName);
  messageInfo.appendChild(messageTime);
  messageElement.appendChild(messageInfo);
  messageElement.appendChild(messageContent);

  messagesContainer.appendChild(messageElement);
  scrollToBottom();
}

// Function to scroll to the bottom of the messages container
function scrollToBottom() {
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Function to handle login
function handleLogin() {
  username = usernameInput.value.trim();
  if (username) {
    // Connect to WebSocket server
    connectToWebSocket();
  } else {
    alert('Please enter a username');
  }
}

// Function to connect to WebSocket server
function connectToWebSocket() {
  // Use the Replit domain for WebSocket connection
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  const wsUrl = `${protocol}//${host}/ws`;
  
  socket = new WebSocket(wsUrl);

  socket.onopen = () => {
    console.log('Connected to WebSocket server');
    
    // Send a join message to the server
    sendSocketMessage({
      type: 'join',
      sender: username,
      timestamp: new Date().toISOString()
    });
    
    // Show chat screen, hide login screen
    loginScreen.style.display = 'none';
    chatScreen.style.display = 'flex';
    
    // Load existing messages
    chatMessages.forEach(msg => {
      appendMessage(msg, msg.sender === username);
    });
    
    // Focus the message input
    messageInput.focus();
  };

  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    
    switch (message.type) {
      case 'chat':
        chatMessages.push(message);
        appendMessage(message, message.sender === username);
        break;
      case 'join':
        appendMessage({
          content: `${message.sender} joined the chat`,
          timestamp: message.timestamp
        }, false, true);
        break;
      case 'leave':
        appendMessage({
          content: `${message.sender} left the chat`,
          timestamp: message.timestamp
        }, false, true);
        break;
      case 'users':
        onlineUsers = message.count;
        onlineCount.textContent = `${onlineUsers} online`;
        break;
    }
  };

  socket.onclose = () => {
    console.log('Disconnected from WebSocket server');
    appendMessage({
      content: 'Disconnected from server. Please refresh the page.',
      timestamp: new Date().toISOString()
    }, false, true);
  };

  socket.onerror = (error) => {
    console.error('WebSocket error:', error);
    appendMessage({
      content: 'Error connecting to server. Please refresh the page.',
      timestamp: new Date().toISOString()
    }, false, true);
  };
}

// Function to send message via WebSocket
function sendSocketMessage(message) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  }
}

// Function to send a message
function sendMessage() {
  const content = messageInput.value.trim();
  if (content && socket) {
    const message = {
      type: 'chat',
      content,
      sender: username,
      timestamp: new Date().toISOString()
    };
    
    sendSocketMessage(message);
    messageInput.value = '';
    messageInput.focus();
  }
}

// Event Listeners
joinBtn.addEventListener('click', handleLogin);
usernameInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') handleLogin();
});

sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendMessage();
});

// Initialize by focusing the username input
usernameInput.focus();
