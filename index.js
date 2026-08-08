const cheerio = require('cheerio');

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function sendTelegramMessage(text) {
    if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) return;
    
    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
    await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text: text,
            parse_mode: 'Markdown'
        })
    });
}

// ამოწმებს არის თუ არა ტენდერი ახალი (ბოლო X დღეში გამოქვეყნებული)
function isNewTender(dateString, maxDays = 5) {
    const tenderDate = new Date(dateString);
    const currentDate = new Date();
    const diffDays = (currentDate - tenderDate) / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= maxDays;
}

// ამოწმებს იწურება თუ არა დედლაინი მალე (მომდევნო X დღეში)
function isDeadlineApproaching(deadlineString, maxDaysLeft = 3) {
    const deadlineDate = new Date(deadlineString);
    const currentDate = new Date();
    const diffDays = (deadlineDate - currentDate) / (1000 * 60 * 60 * 24);
    // დედლაინი ჯერ არ გასულა და რჩება 0-დან maxDaysLeft დღემდე
    return diffDays >= 0 && diffDays <= maxDaysLeft;
}

async function checkTenders() {
    try {
        console.log("ტენდერების შემოწმება დაიწყო...");
        
        const targetUrl = 'https://example.ge/tenders'; 
        const res = await fetch(targetUrl);
        const html = await res.text();
        const $ = cheerio.load(html);

        const tenders = [];

        $('.tender-item').each((i, element) => {
            const title = $(element).find('.title').text().trim();
            const amount = $(element).find('.amount').text().trim();
            const deadline = $(element).find('.deadline').text().trim(); // მაგ: '2026-08-12'
            const rawDate = $(element).find('.date').attr('data-date') || $(element).find('.date').text().trim(); // გამოქვეყნების თარიღი
            const url = $(element).find('a').attr('href');

            // პირობა: ან ახალია, ან დედლაინი მოდის მალე
            const isNew = rawDate ? isNewTender(rawDate, 5) : false;
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

            const message = `
${badge}

📌 **დასახელება:** ${tender.title}
💰 **ბიუჯეტი:** ${tender.amount}
⏳ **ბოლო ვადა:** ${tender.deadline}
📅 **გამოქვეყნდა:** ${tender.rawDate}
🔗 [ნახვა ტენდერზე](${tender.url})
`;
            await sendTelegramMessage(message.trim());
        }

        console.log(`სულ დამუშავდა და გაიგზავნა: ${tenders.length} ტენდერი.`);

    } catch (error) {
        console.error("შეცდომა ტენდერების შემოწმებისას:", error);
    }
}

checkTenders();
