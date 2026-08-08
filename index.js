require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');

// GitHub-ის სეკრეტებიდან წამოიღებს ამ მონაცემებს
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// ტელეგრამში მესიჯის გამგზავნი ფუნქცია
async function sendTelegramMessage(text) {
    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
    try {
        await axios.post(url, { 
            chat_id: CHAT_ID, 
            text: text, 
            parse_mode: 'HTML' 
        });
        console.log("მესიჯი გაიგზავნა!");
    } catch (error) {
        console.error("ვერ მოხერხდა მესიჯის გაგზავნა:", error);
    }
}

// საიტის დასკრაპვის მთავარი ფუნქცია
async function checkTenders() {
    try {
        // აქ ჩაისმება ტენდერების საიტის ლინკი
        const targetUrl = 'https://tenders.procurement.gov.ge/'; 
        const { data } = await axios.get(targetUrl);
        const $ = cheerio.load(data);

        let messages = [];

        // ვპოულობთ HTML ელემენტებს (კლასები შესაცვლელი იქნება კონკრეტული საიტის მიხედვით)
        $('.tender-item').each((index, element) => {
            const title = $(element).find('.title').text().trim();
            const link = $(element).find('a').attr('href');
            const price = $(element).find('.price').text().trim();

            messages.push(`<b>📌 ${title}</b>\n💰 ფასი: ${price}\n🔗 🔗 ლინკი: ${targetUrl}${link}`);
        });

        // თუ ვიპოვეთ ახალი ტენდერები, ვაგზავნით ბოტში
        if (messages.length > 0) {
            for (let msg of messages) {
                await sendTelegramMessage(msg);
            }
        } else {
            console.log("ახალი ტენდერები არ მოიძებნა.");
        }

    } catch (error) {
        console.error("შეცდომა სკრაპინგისას:", error);
    }
}

checkTenders();