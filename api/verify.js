// --- PASSO IMPORTANTE ABAIXO ---
// Cole aqui o link do seu NOVO Zap (o que vai para a planilha de logs)
const zapierLogWebhookUrl = 'COLE_AQUI_O_LINK_DO_SEU_NOVO_WEBHOOK_DO_ZAPIER';

// URL da sua planilha de clientes
const sheetUrl = 'COLE_AQUI_O_SEU_LINK_PUBLICADO_DA_PLANILHA_DE_CLIENTES';

// --- NOVA FUNÇÃO PARA ENVIAR LOGS PARA O ZAPIER ---
async function logToZapier(logData) {
    // Só tenta enviar o log se uma URL foi configurada
    if (!zapierLogWebhookUrl || zapierLogWebhookUrl.includes('COLE_AQUI')) {
        return; // Não faz nada se a URL não estiver configurada
    }
    try {
        await fetch(zapierLogWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(logData)
        });
    } catch (e) {
        // Se a chamada para o Zapier falhar, registra o erro no log da Vercel,
        // mas não impede o funcionamento principal da API.
        console.error("Erro ao enviar log para o Zapier:", e);
    }
}
// --- FIM DA NOVA FUNÇÃO ---


// Função para buscar e processar os dados da planilha de clientes
async function getDatabase() {
    // ... (Esta função não muda)
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

// Função principal da API
export default async function handler(request, response) {
    const ip = request.headers['x-forwarded-for'] || request.socket.remoteAddress;
    const userAgent = request.headers['user-agent'];
    const userEmail = request.query.email?.toLowerCase();
    
    let location = 'Localização indisponível';
    try {
        const geoResponse = await fetch(`http://ip-api.com/json/${ip}`);
        const geoData = await geoResponse.json();
        if (geoData.status === 'success') {
            location = `${geoData.city}, ${geoData.regionName}, ${geoData.country}`;
        }
    } catch (e) { console.error("Erro ao buscar geolocalização:", e); }
    
    response.setHeader('Access-Control-Allow-Origin', '*');

    try {
        const database = await getDatabase();
        if (!userEmail) {
            return response.status(400).json({ error: 'Nenhum e-mail fornecido.' });
        }

        const userData = database[userEmail];
        const status = userData ? 'ENCONTRADO' : 'FALHA (Não Encontrado)';
        
        // Prepara o pacote de dados para o log
        const logData = {
            timestamp: new Date().toISOString(),
            status: status,
            email_consultado: userEmail,
            ip: ip,
            localizacao: location,
            dispositivo: userAgent
        };

        // Envia os dados para o Zapier e para o console da Vercel
        logToZapier(logData);
        console.log(`[${logData.timestamp}] FIM - Status: ${logData.status} | E-mail: ${userEmail} | IP: ${ip}`);

        if (userData) {
            return response.status(200).json(userData);
        } else {
            return response.status(404).json({ error: 'E-mail não encontrado.' });
        }

    } catch (error) {
        const logData = {
            timestamp: new Date().toISOString(),
            status: 'ERRO CRÍTICO',
            email_consultado: userEmail,
            ip: ip,
            localizacao: location,
            dispositivo: userAgent
        };
        logToZapier(logData);
        console.error(`[${logData.timestamp}] ERRO CRÍTICO`, error);
        return response.status(500).json({ error: 'Falha ao ler a base de dados.' });
    }
}
