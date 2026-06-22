const inputs = document.querySelectorAll('.input');
const contactForm = document.getElementById('contactForm');
const contactAlert = document.getElementById('contactAlert');
const submitBtn = contactForm?.querySelector('.btn');

function focusFunc() {
  this.parentNode.classList.add('focus');
}

function blurFunc() {
  if (this.value === '') {
    this.parentNode.classList.remove('focus');
  }
}

inputs.forEach((input) => {
  input.addEventListener('focus', focusFunc);
  input.addEventListener('blur', blurFunc);
});

function showAlert(message, type = 'error') {
  if (!contactAlert) return;
  contactAlert.textContent = message;
  contactAlert.className = `form-alert ${type}`;
  contactAlert.hidden = false;
  contactAlert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideAlert() {
  if (!contactAlert) return;
  contactAlert.hidden = true;
  contactAlert.textContent = '';
}

function resetForm() {
  contactForm.reset();
  inputs.forEach((input) => input.parentNode.classList.remove('focus'));
}

contactForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  hideAlert();

  const username = document.getElementById('username').value.trim();
  const email = document.getElementById('email').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const message = document.getElementById('message').value.trim();

  if (!username || !email || !message) {
    showAlert('Please fill in your name, email, and message.', 'error');
    return;
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    showAlert('Please enter a valid email address.', 'error');
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.value = 'Sending...';
  }

  try {
    const response = await fetch('/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, phone, message }),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      showAlert(data.message || 'Message sent successfully! We\'ll get back to you soon.', 'success');
      resetForm();
    } else {
      showAlert(data.error || 'Could not send your message. Please try again.', 'error');
    }
  } catch (e) {
    showAlert('Network error. Please check your connection and try again.', 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.value = 'Send';
    }
  }
});
