const nextUrl = new URLSearchParams(window.location.search).get('next') || '/chat/lobby';

function withNext(body) {
  return { ...body, next: nextUrl };
}

function showAlert(container, message, type = 'error') {
  if (!container) return;
  container.textContent = message;
  container.className = `form-alert ${type}`;
  container.hidden = false;
}

function hideAlert(container) {
  if (!container) return;
  container.hidden = true;
  container.textContent = '';
}

function setLoading(btn, loading, defaultText) {
  if (!btn) return;
  btn.disabled = loading;
  btn.textContent = loading ? 'Please wait...' : defaultText;
}

async function parseError(response) {
  try {
    const data = await response.json();
    return data.error || 'Something went wrong. Please try again.';
  } catch {
    const text = await response.text();
    return text || 'Something went wrong. Please try again.';
  }
}

const signUpForm = document.getElementById('signUpForm');
const signInForm = document.getElementById('signInForm');
const signUpAlert = document.getElementById('signUpAlert');
const signInAlert = document.getElementById('signInAlert');
const signUpBtn = signUpForm?.querySelector('button[type="submit"]');
const signInBtn = signInForm?.querySelector('button[type="submit"]');

signUpForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  hideAlert(signUpAlert);

  const username = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;

  if (!username || !email || !password) {
    showAlert(signUpAlert, 'Please fill in all fields.', 'error');
    return;
  }

  if (password.length < 6) {
    showAlert(signUpAlert, 'Password must be at least 6 characters.', 'error');
    return;
  }

  setLoading(signUpBtn, true, 'Sign Up');

  try {
    const response = await fetch('/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(withNext({ username, email, password })),
    });

    if (response.redirected || response.ok) {
      showAlert(signUpAlert, `Welcome, ${username}! Account created. Redirecting...`, 'success');
      setTimeout(() => {
        window.location.href = response.url || nextUrl;
      }, 1200);
      return;
    }

    showAlert(signUpAlert, await parseError(response), 'error');
  } catch (e) {
    showAlert(signUpAlert, 'Network error. Please check your connection.', 'error');
  } finally {
    setLoading(signUpBtn, false, 'Sign Up');
  }
});

signInForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  hideAlert(signInAlert);

  const email = document.getElementById('signin-email').value.trim();
  const password = document.getElementById('signin-password').value;

  if (!email || !password) {
    showAlert(signInAlert, 'Please enter your email and password.', 'error');
    return;
  }

  setLoading(signInBtn, true, 'Sign In');

  try {
    const response = await fetch('/auth/signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(withNext({ email, password })),
      redirect: 'follow',
    });

    if (response.redirected || response.ok) {
      showAlert(signInAlert, 'Signed in successfully! Redirecting...', 'success');
      setTimeout(() => {
        window.location.href = response.url || nextUrl;
      }, 1000);
      return;
    }

    showAlert(signInAlert, await parseError(response), 'error');
  } catch (e) {
    showAlert(signInAlert, 'Network error. Please check your connection.', 'error');
  } finally {
    setLoading(signInBtn, false, 'Sign In');
  }
});
