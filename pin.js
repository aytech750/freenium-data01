document.getElementById("submitPin").addEventListener("click", async () => {
  const pin = document.getElementById("pin").value.trim();

  // You can add logic here to check saved pin (e.g. in Firestore)
  if (pin.length !== 4) {
    alert("Enter a valid 4-digit PIN");
    return;
  }

  // Retrieve stored transaction details from localStorage
  const transaction = JSON.parse(localStorage.getItem("transactionData"));

  if (!transaction) {
    alert("Transaction data missing!");
    return;
  }

  // Append pin to transaction data
  transaction.pin = pin;

  // Proceed to backend API call or redirect
  localStorage.setItem("transactionData", JSON.stringify(transaction));
  window.location.href = "process.html"; // or make the API call directly here
});

// Biometric auth (WebAuthn / experimental support)
document.getElementById("biometricBtn").addEventListener("click", async () => {
  try {
    const supported = window.PublicKeyCredential;
    if (!supported) {
      alert("Biometric auth not supported on this device");
      return;
    }

    // You would replace this with real WebAuthn credential challenge from backend
    const auth = await navigator.credentials.get({
      publicKey: {
        challenge: new Uint8Array(32),
        timeout: 60000,
        userVerification: "required"
      }
    });

    if (auth) {
      // Mock auth success
      const transaction = JSON.parse(localStorage.getItem("transactionData"));
      transaction.pin = "biometric"; // Marked as biometric
      localStorage.setItem("transactionData", JSON.stringify(transaction));
      window.location.href = "process.html";
    }
  } catch (err) {
    console.error("Biometric auth failed:", err);
    alert("Biometric authentication failed");
  }
});
