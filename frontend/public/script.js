const serverUrl = "http://localhost:3000";
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

    const data = await res.json();
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
    alert("Something went wrong. Check console for details.");
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

