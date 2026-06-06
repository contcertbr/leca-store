// A inicialização do Firebase agora é tratada automaticamente no index.html.
// Os objetos 'auth' e 'db' são definidos aqui para clareza.
const auth = firebase.auth();
const db = firebase.firestore();

// Use a URL de produção se o host não for localhost, caso contrário, use a URL de desenvolvimento.
const backendApiUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8080/api'
    : 'https://leca-store-357385028232.southamerica-east1.run.app/api'; // <-- ATUALIZE COM SUA URL REAL

// Elementos da UI
const authUI = document.getElementById('auth-ui');
const leadsDashboard = document.getElementById('leads-dashboard');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const authError = document.getElementById('auth-error');
const mlAuthLink = document.getElementById('ml-auth-link');
const mlSellerIdInput = document.getElementById('ml-seller-id');
const syncMlProductsBtn = document.getElementById('sync-ml-products-btn');
const leadsList = document.getElementById('leads-list');

// Funções de Autenticação
loginBtn.addEventListener('click', async () => {
    try {
        await auth.signInWithEmailAndPassword(emailInput.value, passwordInput.value);
    } catch (error) {
        authError.textContent = error.message;
    }
});

logoutBtn.addEventListener('click', async () => {
    await auth.signOut();
});

auth.onAuthStateChanged(user => {
    if (user) {
        authUI.style.display = 'none';
        leadsDashboard.style.display = 'block';
        fetchLeads();
        // Atualiza o link de autenticação do ML para apontar para o backend correto
        mlAuthLink.href = `${backendApiUrl}/mercadolivre/auth`;

    } else {
        authUI.style.display = 'block';
        leadsDashboard.style.display = 'none';
        leadsList.innerHTML = '';
        authError.textContent = '';
    }
});

// Função para buscar leads do backend
async function fetchLeads() {
    try {
        const user = auth.currentUser;
        if (!user) {
            throw new Error("Usuário não autenticado.");
        }

        const token = await user.getIdToken();

        const response = await fetch(`${backendApiUrl}/leads`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error(`Falha ao buscar leads: ${response.statusText}`);
        const leads = await response.json();
        renderLeads(leads);
    } catch (error) {
        console.error('Error fetching leads:', error);
        leadsList.innerHTML = `<p style="color: red;">Erro ao carregar leads: ${error.message}</p>`;
    }
}

function renderLeads(leads) {
    leadsList.innerHTML = '';
    if (leads.length === 0) {
        leadsList.innerHTML = '<p>Nenhum lead encontrado.</p>';
        return;
    }
    const ul = document.createElement('ul');
    leads.forEach(lead => {
        const li = document.createElement('li');
        li.innerHTML = `
            <strong>Nome:</strong> ${lead.name}<br>
            <strong>Email:</strong> ${lead.email}<br>
            <strong>Mensagem:</strong> ${lead.message || 'N/A'}<br>
            <strong>Origem:</strong> ${lead.source}<br>
            <strong>Produto ID:</strong> ${lead.productId || 'N/A'}<br>
            <strong>Data:</strong> ${new Date(lead.timestamp._seconds * 1000).toLocaleString()}
            <hr>
        `;
        ul.appendChild(li);
    });
    leadsList.appendChild(ul);
}

// Função para sincronizar produtos do Mercado Livre
syncMlProductsBtn.addEventListener('click', async () => {
    const sellerId = mlSellerIdInput.value;
    if (!sellerId) {
        alert('Por favor, insira o seu Seller ID do Mercado Livre.');
        return;
    }

    try {
        const user = auth.currentUser;
        if (!user) throw new Error("Usuário não autenticado.");
        const token = await user.getIdToken();

        syncMlProductsBtn.textContent = 'Sincronizando...';
        syncMlProductsBtn.disabled = true;

        const response = await fetch(`${backendApiUrl}/mercadolivre/fetch-and-cache/${sellerId}`, {
            headers: { 'Authorization': `Bearer ${token}` } // Proteja esta rota no futuro se necessário
        });

        if (!response.ok) throw new Error(`Falha na sincronização: ${response.statusText}`);

        const result = await response.json();
        alert(`Sincronização concluída! ${result.count} produtos foram buscados e cacheados.`);

    } catch (error) {
        alert(`Erro ao sincronizar produtos: ${error.message}`);
    } finally {
        syncMlProductsBtn.textContent = 'Sincronizar Produtos do ML';
        syncMlProductsBtn.disabled = false;
    }
});

// Para criar um usuário inicial no Firebase Authentication:
// Vá no console do Firebase > Authentication > Usuários > Adicionar usuário.
