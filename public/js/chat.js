
function get(selector, root = document) {
  return root.querySelector(selector);
}

function formatDate(date) {
  const h = "0" + date.getHours();
  const m = "0" + date.getMinutes();
  return `${h.slice(-2)}:${m.slice(-2)}`;
}

function formatTime(sec) {
  if (!sec || isNaN(sec)) return '0:00';
  sec = Math.floor(sec);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

const pathParts = window.location.pathname.split('/');
const ROOM_CODE = (pathParts[pathParts.length - 1] || '').toUpperCase();

if (!ROOM_CODE || ROOM_CODE.length !== 6) {
  window.location.href = '/chat/lobby';
}

const socket = io();
const chatArea = get("#chatArea");
const chatForm = get("#chatForm");
const messageInput = get("#messageInput");
const musicPlayer = get("#musicPlayer");
const musicTitle = get("#musicTitle");
const musicImg = get("#musicImg");
const musicStatus = get("#musicStatus");
const musicSeek = get("#musicSeek");
const musicCurrent = get("#musicCurrent");
const musicDuration = get("#musicDuration");
const onlineUsersList = get(".online-users-list");
const roomCodeDisplay = get("#roomCodeDisplay");
const copyRoomCodeBtn = get("#copyRoomCodeBtn");
const songSearchInput = get("#songSearchInput");
const searchResults = get("#searchResults");
const queueList = get("#queueList");
const queueCount = get("#queueCount");
const voteSkipBtn = get("#voteSkipBtn");
const hostSkipBtn = get("#hostSkipBtn");
const skipVoteLabel = get("#skipVoteLabel");
const nowPlayingBy = get("#nowPlayingBy");

let CURRENT_USER_NAME = null;
let IS_HOST = false;
let CURRENT_VIDEO_ID = null;
let HAS_VOTED_SKIP = false;
let searchTimeout = null;

if (roomCodeDisplay) roomCodeDisplay.textContent = ROOM_CODE;

copyRoomCodeBtn?.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(ROOM_CODE);
    copyRoomCodeBtn.innerHTML = '<i class="fas fa-check"></i>';
    copyRoomCodeBtn.style.color = '#4db5a2';
    setTimeout(() => {
      copyRoomCodeBtn.innerHTML = '<i class="fas fa-copy"></i>';
      copyRoomCodeBtn.style.color = '';
    }, 2000);
  } catch (e) {
    prompt('Copy this room code:', ROOM_CODE);
  }
});

function appendMessage({ name, text, role = "other", time = null }) {
  const welcome = chatArea.querySelector('.chat-welcome');
  if (welcome) welcome.remove();
  const msgDiv = document.createElement("div");
  msgDiv.className = `chat-message ${role}`;
  const bubble = document.createElement("div");
  bubble.className = "chat-bubble";
  bubble.innerText = text;
  msgDiv.appendChild(bubble);
  if (name) {
    const meta = document.createElement("div");
    meta.className = "chat-meta";
    const timeString = time ? `<span class="chat-time">${time}</span>` : "";
    meta.innerHTML = `<span class="chat-name">${name}</span>${timeString}`;
    msgDiv.appendChild(meta);
  }
  chatArea.appendChild(msgDiv);
  chatArea.scrollTop = chatArea.scrollHeight;
}

function appendSystemMessage(text) {
  appendMessage({ name: "System", text, role: "system", time: formatDate(new Date()) });
}

function appendUserMessage(name, text) {
  const role = (CURRENT_USER_NAME && name === CURRENT_USER_NAME) ? "me" : "other";
  appendMessage({ name, text, role, time: formatDate(new Date()) });
}

function renderQueue(queue) {
  queueList.innerHTML = '';
  queueCount.textContent = `${queue.length} song${queue.length !== 1 ? 's' : ''}`;

  if (!queue.length) {
    queueList.innerHTML = '<li class="queue-empty">Queue is empty — search and add a song!</li>';
    return;
  }

  queue.forEach((item, index) => {
    const li = document.createElement('li');
    li.className = 'queue-item';
    li.dataset.id = item.id;

    li.innerHTML = `
      <span class="queue-pos">${index + 1}</span>
      <img class="queue-thumb" src="${item.thumbnail}" alt="">
      <div class="queue-info">
        <span class="queue-title">${escapeHtml(item.title)}</span>
        <span class="queue-added">Added by ${escapeHtml(item.addedBy)}</span>
      </div>
      ${IS_HOST ? `<button class="queue-remove" data-id="${item.id}" title="Remove from queue"><i class="fas fa-times"></i></button>` : ''}
    `;
    queueList.appendChild(li);
  });

  queueList.querySelectorAll('.queue-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      socket.emit('removeFromQueue', btn.dataset.id);
    });
  });
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function updateSkipButton(skipData) {
  if (!skipData) return;
  const { votes, threshold, voters } = skipData;
  HAS_VOTED_SKIP = voters.includes(CURRENT_USER_NAME);
  skipVoteLabel.textContent = `(${votes}/${threshold})`;
  voteSkipBtn.disabled = !CURRENT_VIDEO_ID || HAS_VOTED_SKIP;
  voteSkipBtn.classList.toggle('voted', HAS_VOTED_SKIP);
}

function updateNowPlaying(data) {
  if (!data) {
    CURRENT_VIDEO_ID = null;
    nowPlayingBy.hidden = true;
    voteSkipBtn.disabled = true;
    skipVoteLabel.textContent = '(0/0)';
    return;
  }
  nowPlayingBy.hidden = !data.addedBy;
  if (data.addedBy) {
    nowPlayingBy.textContent = `Added by ${data.addedBy}`;
  }
}

function playSong(song, title, img, startTime, addedBy) {
  CURRENT_VIDEO_ID = song.match(/\/stream\/([\w-]+)/)?.[1] || null;
  musicStatus.innerText = "Loading...";
  musicTitle.innerText = title;
  musicImg.src = img;
  nowPlayingBy.hidden = !addedBy;
  if (addedBy) nowPlayingBy.textContent = `Added by ${addedBy}`;

  // Clean up previous event listeners
  musicPlayer.onloadeddata = null;
  musicPlayer.oncanplay = null;
  musicPlayer.onerror = null;

  musicPlayer.src = song;
  musicPlayer.load();

  // Wait for metadata to load (duration is known)
  musicPlayer.onloadedmetadata = () => {
    musicStatus.innerText = "Buffering...";
  };

  // Wait for audio to be ready to play
  musicPlayer.oncanplay = () => {
    musicStatus.innerText = "Playing";
    
    // Seek to the correct position if needed
    if (startTime > 0 && !isNaN(startTime) && isFinite(startTime)) {
      musicPlayer.currentTime = startTime;
    }

    // Attempt to play with retry logic
    const attemptPlay = (attempts = 0) => {
      musicPlayer.play().then(() => {
        musicStatus.innerText = "Playing";
      }).catch((error) => {
        console.warn(`Play attempt ${attempts + 1} failed:`, error);
        if (attempts < 3) {
          setTimeout(() => attemptPlay(attempts + 1), 500 * (attempts + 1));
        } else {
          musicStatus.innerText = "Playback failed. Please try again.";
        }
      });
    };

    // Small delay to ensure seek operation completes
    setTimeout(() => attemptPlay(), 100);
  };

  // Error handling
  musicPlayer.onerror = () => {
    console.error('Audio player error:', musicPlayer.error);
    musicStatus.innerText = "Error loading audio";
  };
}

socket.on("connect", () => socket.emit("joinRoom", ROOM_CODE));

socket.on("roomError", ({ message, redirect }) => {
  appendSystemMessage(message || "Could not join room");
  setTimeout(() => { window.location.href = redirect || '/chat/lobby'; }, 2000);
});

socket.on("roomJoined", ({ code, host, isHost, queue, skipVotes, nowPlaying }) => {
  IS_HOST = isHost;
  hostSkipBtn.hidden = !IS_HOST;
  appendSystemMessage(`Welcome to room ${code}! Host: ${host}. Max 5 people.`);
  renderQueue(queue || []);
  updateSkipButton(skipVotes);
  updateNowPlaying(nowPlaying);
});

socket.on("message", (msg, name) => {
  if (name === "System") appendSystemMessage(msg);
  else appendUserMessage(name, msg);
});

socket.on("song", (song, title, img, startTime, addedBy) => {
  playSong(song, title, img, startTime, addedBy);
});

socket.on("skipTrack", () => {
  musicPlayer.pause();
  musicPlayer.removeAttribute('src');
  musicPlayer.load();
  musicStatus.innerText = "Waiting for next song...";
  musicTitle.innerText = "No track playing";
  CURRENT_VIDEO_ID = null;
  nowPlayingBy.hidden = true;
  voteSkipBtn.disabled = true;
});

socket.on("queueUpdate", (queue) => renderQueue(queue));

socket.on("skipVoteUpdate", (data) => updateSkipButton(data));

socket.on("nowPlaying", (data) => updateNowPlaying(data));

socket.on("searchResults", (results) => {
  searchResults.innerHTML = '';
  if (!results.length) {
    searchResults.innerHTML = '<div class="search-no-results">No results found</div>';
    searchResults.hidden = false;
    return;
  }

  results.forEach(video => {
    const item = document.createElement('div');
    item.className = 'search-result-item';
    item.innerHTML = `
      <img src="${video.thumbnail}" alt="">
      <div class="search-result-info">
        <span class="search-result-title">${escapeHtml(video.title)}</span>
        <span class="search-result-meta">${escapeHtml(video.author)} · ${formatTime(video.duration)}</span>
      </div>
      <button class="add-queue-btn"><i class="fas fa-plus"></i> Add</button>
    `;
    item.querySelector('.add-queue-btn').addEventListener('click', () => {
      socket.emit('addToQueue', video);
      searchResults.hidden = true;
      songSearchInput.value = '';
      appendSystemMessage(`You added "${video.title}" to the queue`);
    });
    searchResults.appendChild(item);
  });
  searchResults.hidden = false;
});

socket.on("queueError", (msg) => appendSystemMessage(msg));

songSearchInput?.addEventListener('input', () => {
  clearTimeout(searchTimeout);
  const query = songSearchInput.value.trim();
  if (query.length < 2) {
    searchResults.hidden = true;
    return;
  }
  searchTimeout = setTimeout(() => socket.emit('searchSongs', query), 400);
});

document.addEventListener('click', (e) => {
  if (!e.target.closest('.search-panel')) {
    searchResults.hidden = true;
  }
});

voteSkipBtn?.addEventListener('click', () => {
  if (!HAS_VOTED_SKIP && CURRENT_VIDEO_ID) socket.emit('voteSkip');
});

hostSkipBtn?.addEventListener('click', () => {
  if (IS_HOST && CURRENT_VIDEO_ID) socket.emit('hostSkip');
});

musicPlayer.addEventListener('ended', () => {
  if (CURRENT_VIDEO_ID) socket.emit('songEnded', CURRENT_VIDEO_ID);
});

musicPlayer.addEventListener('loadedmetadata', () => {
  musicSeek.max = Math.floor(musicPlayer.duration) || 0;
  musicDuration.innerText = formatTime(musicPlayer.duration);
});

musicPlayer.addEventListener('timeupdate', () => {
  musicSeek.value = Math.floor(musicPlayer.currentTime);
  musicCurrent.innerText = formatTime(musicPlayer.currentTime);
});

musicSeek.addEventListener('input', () => {
  musicPlayer.currentTime = musicSeek.value;
});

musicPlayer.onwaiting = () => { musicStatus.innerText = "Buffering..."; };
musicPlayer.onplaying = () => { musicStatus.innerText = "Playing"; voteSkipBtn.disabled = HAS_VOTED_SKIP ? true : !CURRENT_VIDEO_ID; };
musicPlayer.onerror = () => { musicStatus.innerText = "Error loading audio."; };

chatForm.addEventListener("submit", e => {
  e.preventDefault();
  const message = messageInput.value.trim();
  if (!message) return;
  socket.emit("message", message);
  messageInput.value = "";
});

socket.on('updateOnlineUsers', (users) => {
  const onlineCount = get("#onlineCount");
  if (onlineCount) onlineCount.textContent = users.length;
  if (!onlineUsersList) return;
  onlineUsersList.innerHTML = '';
  users.forEach((user, index) => {
    const el = document.createElement('div');
    el.className = 'online-user';
    el.innerHTML = `<span class="user-status">●</span><span>${escapeHtml(user)}${user === CURRENT_USER_NAME ? ' (you)' : ''}</span>`;
    onlineUsersList.appendChild(el);
    setTimeout(() => el.classList.add('animate-in'), index * 50);
  });
});

socket.on('you', (name) => {
  CURRENT_USER_NAME = name;
  const chipName = document.getElementById('currentUserName');
  const chipAvatar = document.getElementById('currentUserAvatar');
  if (chipName) chipName.textContent = name;
  if (chipAvatar) chipAvatar.textContent = (name || 'U').trim().charAt(0).toUpperCase();
});

(function setupThemeToggle() {
  const toggleBtn = document.getElementById('themeToggle');
  if (!toggleBtn) return;
  if (localStorage.getItem('chat-theme') === 'light') document.body.classList.add('light-theme');
  toggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('light-theme');
    const isLight = document.body.classList.contains('light-theme');
    localStorage.setItem('chat-theme', isLight ? 'light' : 'dark');
    toggleBtn.innerHTML = isLight ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
  });
  toggleBtn.innerHTML = document.body.classList.contains('light-theme')
    ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
})();

(async function setCurrentUser() {
  try {
    const res = await fetch('/chat/me');
    const data = await res.json();
    if (!data.authenticated) {
      window.location.href = `/auth?next=/chat/room/${ROOM_CODE}`;
      return;
    }
    CURRENT_USER_NAME = data.username;
    const chipName = document.getElementById('currentUserName');
    const chipAvatar = document.getElementById('currentUserAvatar');
    if (chipName) chipName.textContent = data.username;
    if (chipAvatar) chipAvatar.textContent = (data.username || 'U').trim().charAt(0).toUpperCase();
  } catch (e) {
    window.location.href = `/auth?next=/chat/room/${ROOM_CODE}`;
  }
})();

window.addEventListener('beforeunload', () => socket.emit('leaveRoom'));
