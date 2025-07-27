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
        // A chave principal é o e-mail do usuário
        data[entry.email_usuario.toLowerCase()] = {
            login: entry.login_acesso,
            senha: entry.senha_acesso
        };
    }
    return data;
}

// Função principal da API
export default async function handler(request, response) {
    response.setHeader('Access-Control-Allow-Origin', '*');

    try {
        const database = await getDatabase();
        const userEmail = request.query.email?.toLowerCase();

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
