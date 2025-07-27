// URL da sua planilha publicada como CSV
const sheetUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRX0Wp5GQWV-dq8kMjAnYEVoN9XJA6da0n5hgddehgOtRA3kZkN6diTqqjqh4i_luDtOTv4IauJypgn/pub?output=csv';

// Função para buscar e processar os dados da planilha
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

// Função principal da API
export default async function handler(request, response) {
    // Captura o IP do usuário
    const ip = request.headers['x-forwarded-for'] || request.socket.remoteAddress;
    
    // --- INÍCIO DAS NOVAS LINHAS PARA GEOLOCALIZAÇÃO ---
    let location = 'Localização indisponível'; // Valor padrão
    try {
        // Pergunta ao serviço de geolocalização sobre o IP
        const geoResponse = await fetch(`http://ip-api.com/json/${ip}`);
        const geoData = await geoResponse.json();
        // Formata a resposta se for bem-sucedida
        if (geoData.status === 'success') {
            location = `${geoData.city}, ${geoData.regionName}, ${geoData.country}`;
        }
    } catch (e) {
        // Se a busca de localização falhar, o valor padrão será usado.
        console.error("Erro ao buscar geolocalização:", e);
    }
    // --- FIM DAS NOVAS LINHAS ---

    response.setHeader('Access-Control-Allow-Origin', '*');

    try {
        const database = await getDatabase();
        const userEmail = request.query.email?.toLowerCase();

        // Modificamos o log para incluir a localização
        console.log(`Tentativa de acesso para o e-mail: ${userEmail} do IP: ${ip} (Localização: ${location})`);

        if (!userEmail) {
            return response.status(400).json({ error: 'Nenhum e-mail fornecido.' });
        }

        const userData = database[userEmail];

        if (userData) {
            return response.status(200).json(userData);
        } else {
            return response.status(404).json({ error: 'E-mail não encontrado.' });
        }

    } catch (error) {
        return response.status(500).json({ error: 'Falha ao ler a base de dados.' });
    }
}
