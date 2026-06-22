const createRoomBtn = document.getElementById('createRoomBtn');
const joinRoomForm = document.getElementById('joinRoomForm');
const roomCodeInput = document.getElementById('roomCodeInput');
const lobbyError = document.getElementById('lobbyError');
const lobbySuccess = document.getElementById('lobbySuccess');
const lobbyUsername = document.getElementById('lobbyUsername');
const userAvatar = document.getElementById('userAvatar');

function showError(message) {
  lobbySuccess.hidden = true;
  lobbyError.textContent = message;
  lobbyError.hidden = false;
}

function showSuccess(message) {
  lobbyError.hidden = true;
  lobbySuccess.textContent = message;
  lobbySuccess.hidden = false;
}

function clearAlerts() {
  lobbyError.hidden = true;
  lobbySuccess.hidden = true;
}

function setLoading(btn, loading) {
  btn.disabled = loading;
  btn.classList.toggle('loading', loading);
}

async function loadUser() {
  try {
    const res = await fetch('/chat/me');
    const data = await res.json();
    if (!data.authenticated) {
      window.location.href = '/auth?next=/chat/lobby';
      return;
    }
    lobbyUsername.textContent = data.username;
    userAvatar.textContent = (data.username || 'U').trim().charAt(0).toUpperCase();
  } catch (e) {
    window.location.href = '/auth?next=/chat/lobby';
  }
}

createRoomBtn.addEventListener('click', async () => {
  clearAlerts();
  setLoading(createRoomBtn, true);

  try {
    const res = await fetch('/chat/rooms', { method: 'POST' });
    const data = await res.json();

    if (res.status === 401 || res.redirected) {
      window.location.href = '/auth?next=/chat/lobby';
      return;
    }

    if (!res.ok) {
      showError(data.error || 'Could not create room. Please try again.');
      return;
    }

    showSuccess(`Room ${data.code} created! Redirecting...`);
    setTimeout(() => {
      window.location.href = `/chat/room/${data.code}`;
    }, 600);
  } catch (e) {
    showError('Could not create room. Check your connection and try again.');
  } finally {
    setLoading(createRoomBtn, false);
  }
});

joinRoomForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearAlerts();

  const code = roomCodeInput.value.trim().toUpperCase();
  if (code.length !== 6) {
    showError('Room code must be exactly 6 characters.');
    return;
  }

  const submitBtn = joinRoomForm.querySelector('button[type="submit"]');
  setLoading(submitBtn, true);

  try {
    const res = await fetch(`/chat/rooms/${code}/join`, { method: 'POST' });
    const data = await res.json();

    if (res.status === 401) {
      window.location.href = `/auth?next=/chat/room/${code}`;
      return;
    }

    if (!res.ok) {
      showError(data.error || 'Could not join room.');
      return;
    }

    showSuccess(`Joining room ${data.code}...`);
    setTimeout(() => {
      window.location.href = `/chat/room/${data.code}`;
    }, 600);
  } catch (e) {
    showError('Could not join room. Check your connection and try again.');
  } finally {
    setLoading(submitBtn, false);
  }
});

roomCodeInput.addEventListener('input', () => {
  roomCodeInput.value = roomCodeInput.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
});

const urlError = new URLSearchParams(window.location.search).get('error');
if (urlError) {
  showError(decodeURIComponent(urlError.replace(/\+/g, ' ')));
}

loadUser();
