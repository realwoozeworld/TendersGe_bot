const cheerio = require('cheerio');

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// ტელეგრამში შეტყობინების გაგზავნის ფუნქცია
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

// ტენდერების შემოწმებისა და სკრაპინგის მთავარი ფუნქცია
async function checkTenders() {
    try {
        console.log("ტენდერების შემოწმება დაიწყო...");
        
        // ჩასვი შენი ტენდერების საიტის ზუსტი ლინკი
        const targetUrl = 'https://example.ge/tenders'; 
        
        const res = await fetch(targetUrl);
        const html = await res.text();
        const $ = cheerio.load(html);

        const tenders = [];

        // შეცვალე სელექტორები (მაგ: '.tender-item', '.title', ა.შ.) შენი საიტის HTML სტრუქტურის მიხედვით
        $('.tender-item').each((i, element) => {
            const title = $(element).find('.title').text().trim();
            const amount = $(element).find('.amount').text().trim();
            const deadline = $(element).find('.deadline').text().trim(); // დედლაინის თარიღი
            const url = $(element).find('a').attr('href');

            tenders.push({ title, amount, deadline, url });
        });

        if (tenders.length === 0) {
            console.log("ახალი ტენდერები არ მოიძებნა.");
            return;
        }

        // თითოეული ნაპოვნი ტენდერისთვის ვამზადებთ შეტყობინებას დედლაინის ჩათვლით
        for (const tender of tenders) {
            const message = `
📢 **ახალი ტენდერი მოიძებნა!**

📌 **დასახელება:** ${tender.title}
💰 **ბიუჯეტი:** ${tender.amount}
⏳ **ბოლო ვადა (Deadline):** ${tender.deadline}
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
