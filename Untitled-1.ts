// Signup
signupForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const email = document.getElementById("signupEmail").value;
  const password = document.getElementById("signupPassword").value;

  createUserWithEmailAndPassword(auth, email, password)
    .then(() => {
      alert("Signup successful");
      window.location.href = "dashboard.html";
    })
    .catch(err => alert(err.message));
});

// Login
loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;

  signInWithEmailAndPassword(auth, email, password)
    .then(() => {
      alert("Login successful");
      window.location.href = "dashboard.html";
    })
    .catch(err => alert(err.message));
});

// Google login
document.querySelectorAll(".google-btn").forEach(button => {
  button.addEventListener("click", () => {
    signInWithPopup(auth, provider)
      .then(() => {
        alert("Google login successful");
        window.location.href = "dashboard.html";
      })
      .catch(err => alert(err.message));
  });
});

// Forgot password
document.getElementById("forgotPassword").addEventListener("click", (e) => {
  e.preventDefault();
  const email = prompt("Enter your email to reset password:");
  if (!email) return;

  sendPasswordResetEmail(auth, email)
    .then(() => alert("Password reset link sent!"))
    .catch(err => alert(err.message));
});
