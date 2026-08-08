const cheerio = require('cheerio');

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const COOKIE_STRING = process.env.COOKIE_STRING;

async function sendTelegramMessage(text) {
    if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) {
        console.log("Telegram token or chat ID is missing!");
        return;
    }
    
    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: text,
                parse_mode: 'Markdown'
            })
        });
        
        const data = await response.json();
        if (!data.ok) {
            console.error("Telegram error:", data);
        }
    } catch (error) {
        console.error("Failed to send message:", error);
    }
}

function isNewTender(dateString, maxDays = 5) {
    const tenderDate = new Date(dateString);
    const currentDate = new Date();
    const diffDays = (currentDate - tenderDate) / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= maxDays;
}

function isDeadlineApproaching(deadlineString, maxDaysLeft = 3) {
    const deadlineDate = new Date(deadlineString);
    const currentDate = new Date();
    const diffDays = (deadlineDate - currentDate) / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= maxDaysLeft;
}

async function checkTenders() {
    try {
        console.log("პირადი შეტყობინებების შემოწმება დაიწყო...");
        
        // სახელმწიფო პორტალის შეტყობინებების ლინკი
        const targetUrl = 'https://tenders.procurement.gov.ge/engine/controller.php?action=tweets&type=SPA'; 
        
        const res = await fetch(targetUrl, {
            headers: {
                'Cookie': COOKIE_STRING,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        
        const html = await res.text();
        const $ = cheerio.load(html);
        console.log("HTML სიგრძე:", html.length); // დააბეჭდს რამდენად დიდ გვერდს იღებს
        console.log("HTML-ის დასაწყისი:", html.substring(0, 300)); // დააბეჭდს კოდის პირველ 300 სიმბოლოს
        const tenders = [];

        // ვამუშავებთ გვერდზე არსებულ ელემენტებს
        $('.tweet-item, tr, div').each((i, element) => {
            const title = $(element).find('.title').text().trim();
            const amount = $(element).find('.amount').text().trim();
            const deadline = $(element).find('.deadline').text().trim();
            const rawDate = $(element).find('.date').text().trim();
            const url = $(element).find('a').attr('href');

            if (!title) return;

            const isNew = rawDate ? isNewTender(rawDate, 5) : true;
            const isClosingSoon = deadline ? isDeadlineApproaching(deadline, 3) : false;

            if (isNew || isClosingSoon) {
                tenders.push({ title, amount, deadline, rawDate, url, isNew, isClosingSoon });
            }
        });

        if (tenders.length === 0) {
            console.log("ახალი ან მახლობელ-დედლაინიანი ტენდერები არ მოიძებნა.");
            return;
        }

        for (const tender of tenders) {
            let badge = "📌 ტენდერი";
            if (tender.isNew && tender.isClosingSoon) {
                badge = "🔥 **ახალი & დედლაინი იწურება მალე!**";
            } else if (tender.isNew) {
                badge = "📢 **ახალი ტენდერი!**";
            } else if (tender.isClosingSoon) {
                badge = "⏳ **ყურადღება: დედლაინი იწურება მალე!**";
            }

            const fullUrl = tender.url ? (tender.url.startsWith('http') ? tender.url : 'https://tenders.procurement.gov.ge/' + tender.url) : 'https://tenders.procurement.gov.ge/';

            const message = `
${badge}

📌 **დასახელება:** ${tender.title}
💰 **ბიუჯეტი:** ${tender.amount || 'მითითებული არ არის'}
⏳ **ბოლო ვადა:** ${tender.deadline || 'მითითებული არ არის'}
🔗 [ნახვა ტენდერზე](${fullUrl})
`;
            await sendTelegramMessage(message.trim());
        }

        console.log(`სულ დამუშავდა და გაიგზავნა: ${tenders.length} ტენდერი.`);

    } catch (error) {
        console.error("შეცდომა ტენდერების შემოწმებისას:", error);
    }
}

checkTenders();
