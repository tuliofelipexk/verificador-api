// Seus links aqui
const zapierLogWebhookUrl = 'https://ganchos.zapier.com/ganchos/pegar/23979142/uu0xbe9/';
const sheetUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRX0Wp5GQWV-dq8kMjAnYEVoN9XJA6da0n5hgddehgOtRA3kZkN6diTqqjqh4i_luDtOTv4IauJypgn/pub?output=csv';

// --- FUNÇÃO DE LOG ATUALIZADA ---
async function logToZapier(logData) {
    if (!zapierLogWebhookUrl || zapierLogWebhookUrl.includes('COLE_AQUI')) {
        return;
    }

    // Transforma os dados em parâmetros de URL
    const queryParams = new URLSearchParams(logData).toString();
    const fullUrl = `${zapierLogWebhookUrl}?${queryParams}`;

    try {
        // Envia os dados como uma simples requisição GET
        await fetch(fullUrl);
    } catch (e) {
        console.error("Error sending log to Zapier:", e);
    }
}
// --- FIM DA ATUALIZAÇÃO ---

// Função getDatabase (não muda)
async function getDatabase() {
    const response = await fetch(sheetUrl);
    const csvText = await response.text();
    const rows = csvText.trim().split('\n');
    const headers = rows[0].split(',').map(h => h.trim());
    const data = {};
    for (let i = 1; i < rows.length; i++) {
        const values = rows[i].split(',').map(v => v.trim());
        const entry = {};
        headers.forEach((header, index) => {
            entry[header] = values[index];
        });
        data[entry.email_usuario.toLowerCase()] = {
            login: entry.login_acesso,
            senha: entry.senha_acesso.replace(/^"|"$/g, '')
        };
    }
    return data;
}

// Função handler (não muda)
export default async function handler(request, response) {
    const ip = request.headers['x-forwarded-for'] || request.socket.remoteAddress;
    const userAgent = request.headers['user-agent'];
    const userEmail = request.query.email?.toLowerCase();
    
    let location = 'Location unavailable';
    try {
        const geoResponse = await fetch(`http://ip-api.com/json/${ip}`);
        const geoData = await geoResponse.json();
        if (geoData.status === 'success') {
            location = `${geoData.city}, ${geoData.regionName}, ${geoData.country}`;
        }
    } catch (e) { console.error("Error fetching geolocation:", e); }
    
    response.setHeader('Access-Control-Allow-Origin', '*');

    try {
        const database = await getDatabase();
        if (!userEmail) {
            return response.status(400).json({ error: 'No email provided.' });
        }

        const userData = database[userEmail];
        const status = userData ? 'FOUND' : 'FAILED (Not Found)';
        
        const logData = {
            timestamp: new Date().toISOString(),
            status: status,
            email_consultado: userEmail,
            ip: ip,
            localizacao: location,
            dispositivo: userAgent
        };

        logToZapier(logData);
        console.log(`[${logData.timestamp}] END - Status: ${logData.status} | Email: ${userEmail} | IP: ${ip}`);

        if (userData) {
            return response.status(200).json(userData);
        } else {
            return response.status(404).json({ error: 'Email not found.' });
        }

    } catch (error) {
        const logData = {
            timestamp: new Date().toISOString(),
            status: 'CRITICAL ERROR',
            email_consultado: userEmail,
            ip: ip,
            localizacao: location,
            dispositivo: userAgent
        };
        logToZapier(logData);
        console.error(`[${logData.timestamp}] CRITICAL ERROR`, error);
        return response.status(500).json({ error: 'Failed to read the database.' });
    }
}
