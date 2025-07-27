// Este é o nosso "banco de dados" seguro.
// Ele NUNCA é enviado para o navegador do usuário.
const database = {
  'ildoas@gmail.com': { login: 'andsdsv@gmail.com', senha: 'EVXAP1L7Pr2DCSnc' },
  'adilsonascimento17@gmail.com': { login: 'superboxpower@gmail.com', senha: 'cxeEiQvKxB8zuwHmp' },
  'mcsmacae@gmail.com': { login: 'galoptech.ia@gmail.com', senha: 'DgHVmqzSUVqW3hg7' },
  // ... adicione TODOS os outros e-mails aqui no mesmo formato ...
  'adspowerplus@gmail.com': { login: 'andsdsv@gmail.com', senha: 'EVXAP1L7Pr2DCSnc' }
};

// Esta é a função que o Vercel irá executar
export default function handler(request, response) {
  // Permite que qualquer site (incluindo o seu no Wix) acesse esta API
  response.setHeader('Access-Control-Allow-Origin', '*');

  // Pega o e-mail que foi enviado na URL (ex: ?email=teste@gmail.com)
  const userEmail = request.query.email?.toLowerCase();

  // Se nenhum e-mail foi enviado, retorna um erro.
  if (!userEmail) {
    return response.status(400).json({ error: 'Nenhum e-mail fornecido.' });
  }

  // Procura o e-mail no nosso "banco de dados"
  const userData = database[userEmail];

  // Se encontrou, envia os dados de volta como resposta.
  if (userData) {
    return response.status(200).json(userData);
  } 
  // Se não encontrou, envia uma mensagem de "não encontrado".
  else {
    return response.status(404).json({ error: 'E-mail não encontrado.' });
  }
}
