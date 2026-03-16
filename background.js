const googleFormURL = "https://docs.google.com/forms/d/e/1FAIpQLSdRry4jsysHXvkQBZTZCAhI89DTUS0NkZvjCuNlDAvRb2mGmQ/formResponse?usp=pp_url&entry.191259753=alert";
const blockedSites = ["youtube.com", "facebook.com", "instagram.com", "tiktok.com"];
const PARENT_PASSWORD = "0786"; 
const MAX_DAILY_USES = 1;

const quotes = [
    "✨ وقت کی قدر کریں، یہی کامیابی کی کنجی ہے۔ ✨",
    "📚 ابھی کی تھوڑی سی محنت، مستقبل کا بڑا سکون ہے۔ 📚",
    "🌟 منزل انہیں ملتی ہے جن کے سپنوں میں جان ہوتی ہے! 🌟",
    "💡 پڑھائی مشکل ضرور ہے، مگر ناممکن نہیں۔ 💡",
    "🎯 اپنی منزل پر توجہ دیں، کامیابی آپ کا انتظار کر رہی ہے۔ 🎯"
];

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // 1. ماسٹر آف چیک (اگر آپ نے خود بند کیا ہے)
    chrome.storage.local.get(['masterOffUntil'], (result) => {
        if (result.masterOffUntil && Date.now() < result.masterOffUntil) return;

        const now = new Date();
        const currentHour = now.getHours();
        const todayDate = now.toISOString().slice(0, 10);
        
        // صبح 9 سے شام 5 بجے تک کا وقت
        const isStudyTime = (currentHour >= 9 && currentHour < 17);

        if (isStudyTime && changeInfo.status === 'loading' && tab.url) {
            const url = tab.url.toLowerCase();
            const isBlocked = blockedSites.some(site => url.includes(site));

            if (isBlocked) {
                chrome.storage.local.get(['unblockedUntil', 'usageCount', 'lastUsageDate'], (res) => {
                    // اگر 10 منٹ والی باری چل رہی ہے تو جانے دیں
                    if (res.unblockedUntil && Date.now() < res.unblockedUntil) return;

                    // روزانہ کی حد چیک کریں
                    let count = (res.lastUsageDate === todayDate) ? (res.usageCount || 0) : 0;
                    
                    // گوگل فارم الرٹ
                    fetch(googleFormURL, { mode: 'no-cors' });
                    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];

                    chrome.scripting.executeScript({
                        target: { tabId: tabId },
                        func: (quoteText, correctPass, currentCount, maxLimit) => {
                            const oldOverlay = document.getElementById("study-guard-overlay");
                            if (oldOverlay) oldOverlay.remove();

                            const div = document.createElement('div');
                            div.id = "study-guard-overlay";
                            div.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:white; display:flex; flex-direction:column; justify-content:center; align-items:center; z-index:2147483647; font-family:Arial; text-align:center;";
                            
                            let buttonHTML = (currentCount < maxLimit) 
                                ? `<button id="unlock-btn" style="padding:12px 25px; font-size:18px; cursor:pointer; background:#2e7d32; color:white; border:none; border-radius:5px;">والدین سے اجازت لیں (باری: ${maxLimit - currentCount})</button>`
                                : `<p style="color:red; font-weight:bold; font-size:20px;">🚫 آج کا کوٹہ ختم ہو گیا ہے! 🚫</p>`;

                            div.innerHTML = `
                                <h1 style="color:#d32f2f; font-size:40px;">پڑھائی کا وقت!</h1>
                                <div style="background:#fdf2f2; padding:20px; border-radius:15px; border:2px dashed #d32f2f; max-width:70%; margin-bottom:20px;">
                                    <p style="font-size:24px; color:#333; font-weight:bold;">${quoteText}</p>
                                </div>
                                ${buttonHTML}
                                <p id="timer-msg" style="margin-top:15px; color:#777;">یہ سائٹ بلاک ہے، آپ کو 5 سیکنڈ میں گوگل پر بھیجا جائے گا...</p>
                            `;
                            document.body.appendChild(div);
                            document.body.style.overflow = 'hidden';

                            let redirectTimer = setTimeout(() => { window.location.href = "https://www.google.com"; }, 5000);

                            const btn = document.getElementById("unlock-btn");
                            if (btn) {
                                btn.addEventListener("click", () => {
                                    const userPass = prompt("پاس ورڈ درج کریں:");
                                    if (userPass === correctPass) {
                                        clearTimeout(redirectTimer);
                                        chrome.runtime.sendMessage({ action: "unlock", date: new Date().toISOString().slice(0, 10), newCount: currentCount + 1 });
                                        alert("اجازت مل گئی! 10 منٹ شروع ہوتے ہیں۔");
                                        location.reload();
                                    } else { alert("غلط پاس ورڈ!"); }
                                });
                            }
                        },
                        args: [randomQuote, PARENT_PASSWORD, count, MAX_DAILY_USES]
                    });
                });
            }
        }
    });
});

chrome.runtime.onMessage.addListener((request) => {
    if (request.action === "unlock") {
        const expiry = Date.now() + (10 * 60 * 1000);
        chrome.storage.local.set({ unblockedUntil: expiry, usageCount: request.newCount, lastUsageDate: request.date });
    }
});
