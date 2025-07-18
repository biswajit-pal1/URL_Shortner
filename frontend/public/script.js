(() => {
"use strict";

// Fetch all the forms we want to apply custom Bootstrap validation styles to
const forms = document.querySelectorAll(".needs-validation");

// Loop over them and prevent submission
Array.from(forms).forEach((form) => {
    form.addEventListener(
    "submit",
    (event) => {
        if (!form.checkValidity()) {
        event.preventDefault();
        event.stopPropagation();
        }

        form.classList.add("was-validated");
    },
    false
    );
});

// Show toast on successful signup
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get("success") === "true") {
    const toast = new bootstrap.Toast(document.getElementById("signupToast"));
    toast.show();
}
})();

const form = document.getElementById("url-form");
const resultDiv = document.getElementById("result");
const shortUrlLink = document.getElementById("short-url");
const copyBtn = document.getElementById("copy-btn");
const copyMsg = document.getElementById("copy-msg");
const qrContainer = document.getElementById("qrcode");

form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fullUrl = document.getElementById("full-url").value;

    try {
        const res = await fetch(`/shorten`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ full: fullUrl }),
        });

        if (res.status === 401) {
            window.location.href = '/login';
            return;
        }

        const data = await res.json();
        if (data.error) {
            alert(data.error);
            return;
        }

        const shortUrl = `${window.location.origin}/${data.short}`;
        shortUrlLink.href = shortUrl;
        shortUrlLink.textContent = shortUrl;
        resultDiv.classList.remove("hidden");
        copyMsg.textContent = "";

        qrContainer.innerHTML = ""; // clear old QR
        new QRCode(qrContainer, {
            text: shortUrl,
            width: 150,
            height: 150,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H,
        });
    } catch (err) {
        alert("Please login to shorten URLs");
        console.error(err);
    }
});

copyBtn.addEventListener("click", () => {
const url = shortUrlLink.href;
navigator.clipboard
    .writeText(url)
    .then(() => {
    copyMsg.textContent = "✅ Copied!";
    setTimeout(() => (copyMsg.textContent = ""), 2000);
    })
    .catch((err) => {
    copyMsg.textContent = "❌ Copy failed";
    console.error(err);
    });
});

document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Check for login success
    if (urlParams.get('loginSuccess') === 'true') {
        const toast = new bootstrap.Toast(document.getElementById('loginToast'));
        toast.show();
        // Remove the query parameter
        window.history.replaceState({}, document.title, window.location.pathname);
    }
});
