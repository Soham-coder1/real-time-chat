// Connect to Socket.IO server
const socket = io();
// UI Elements
const joinForm = document.getElementById('join-form');
const joinContainer = document.getElementById('join-container');
const chatContainer = document.getElementById('chat-container');
const messageInput = document.getElementById('message-input');
const chatMessages = document.getElementById('chat-messages');
const onlineCount = document.getElementById('online-count');
const sendButton = document.getElementById('send-button');
const logoutButton = document.getElementById('logout-button');
const notificationSound = document.getElementById('notification-sound');

let currentUser = '';

// --- Join Form Submit ---
joinForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();

    if (!username) return;

    try {
        const res = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
        });

        const data = await res.json();

        if (data.success) {
            currentUser = username;
            joinContainer.style.display = 'none';
            chatContainer.style.display = 'flex';
            socket.emit('new-user', username);
            messageInput.focus();
        } else {
            alert(data.message || 'Login failed.');
        }
    } catch (error) {
        console.error('Login error:', error);
    }
});

// --- Send Message ---
sendButton.addEventListener('click', () => {
    const message = messageInput.value.trim();
    if (message === '') return;

    const msgData = {
        username: currentUser,
        message,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    socket.emit('send-message', msgData);
    messageInput.value = '';
    messageInput.focus();
});

// --- Logout ---
logoutButton.addEventListener('click', async () => {
    await fetch('/logout', { method: 'POST' });
    window.location.reload();
});

// --- Receive Message ---
socket.on('chat-message', (data) => {
    const msgElem = document.createElement('div');
    msgElem.classList.add('message', data.username === currentUser ? 'own-message' : 'other-message');

    msgElem.innerHTML = `
        <div class="message-meta">
            <span class="message-sender">${data.username}</span>
            <span class="message-time">${data.time}</span>
        </div>
        <div class="message-text">${data.message}</div>
    `;

    chatMessages.appendChild(msgElem);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    if (data.username !== currentUser) {
        notificationSound.play().catch(() => {});
    }
});

// --- User Connected ---
socket.on('user-connected', (data) => {
    showNotification(`${data.username} joined the chat`);
});

// --- User Disconnected ---
socket.on('user-disconnected', (data) => {
    showNotification(`${data.username} left the chat`);
});

// --- Update Online Count ---
socket.on('online-count', (count) => {
    onlineCount.textContent = `${count} online`;
});

// --- Helper: Show Join/Leave Notifications ---
function showNotification(text) {
    const note = document.createElement('div');
    note.classList.add('notification');
    note.textContent = text;
    chatMessages.appendChild(note);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}
