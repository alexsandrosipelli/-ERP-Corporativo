// ==========================
// VARIÁVEIS GLOBAIS
// ==========================
let currentUser = null;
let currentRole = 'admin';
let itemParaExcluir = null;
let dadosParaEditar = null;
let pedidoTemp = [];

// ==========================
// INICIALIZAÇÃO
// ==========================
document.addEventListener('DOMContentLoaded', function () {
    // Configurar botões de role
    document.querySelectorAll('.role-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentRole = this.dataset.role;
        });
    });

  
    // Configurar navegação
    const navButtons = document.querySelectorAll(".nav-btn");
    const tabs = document.querySelectorAll(".tab-content");

    navButtons.forEach(btn => {
        btn.addEventListener("click", function () {
            navButtons.forEach(b => b.classList.remove("active"));
            tabs.forEach(t => t.classList.remove("active"));

            this.classList.add("active");
            const tabId = this.dataset.tab;

            // Mostrar a aba correspondente
            const tabElement = document.getElementById(tabId);
            if (tabElement) {
                tabElement.classList.add("active");

                // Rolagem suave até a aba
                setTimeout(() => {
                    tabElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
            }

            // Carregar conteúdo específico da aba
            if (tabId === 'logs') {
                renderLogs();
            } else if (tabId === 'pedidos') {
                renderPedidos();
            } else if (tabId === 'relatorios') {
                document.getElementById('resultadoRelatorios').innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-chart-pie"></i>
                        <span>Selecione um relatório para gerar</span>
                    </div>
                `;
            } else if (tabId === 'dashboard') {
                renderDashboard();
            }
        });
    });
    // Configurar datas padrão
    const hoje = new Date();
    const umaSemanaAtras = new Date();
    umaSemanaAtras.setDate(umaSemanaAtras.getDate() - 7);

    document.getElementById('filterDataInicio').valueAsDate = umaSemanaAtras;
    document.getElementById('filterDataFim').valueAsDate = hoje;
    document.getElementById('filterLogData').valueAsDate = hoje;

    // Inicializar selects
    carregarSelects();

    // Configurar fechamento de modais
    document.getElementById('modalEdicao').addEventListener('click', function (e) {
        if (e.target === this) {
            fecharModal();
        }
    });

    document.getElementById('modalConfirmacao').addEventListener('click', function (e) {
        if (e.target === this) {
            fecharModalConfirmacao();
        }
    });

    // Carregar dados iniciais se existirem
    if (getDB('clientes').length > 0) {
        renderAll();
    }
});

// ==========================
// FUNÇÕES DE BANCO DE DADOS
// ==========================
function getDB(table) {
    try {
        const data = localStorage.getItem(table);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error(`Erro ao ler ${table}:`, e);
        return [];
    }
}

function setDB(table, data) {
    try {
        localStorage.setItem(table, JSON.stringify(data));
        return true;
    } catch (e) {
        console.error(`Erro ao salvar ${table}:`, e);
        return false;
    }
}

function generateId() {
    return Date.now() + Math.floor(Math.random() * 1000);
}

// ==========================
// SISTEMA DE LOGIN
// ==========================
function login() {
    const user = document.getElementById('loginUser').value.trim();
    const pass = document.getElementById('loginPass').value;
    const role = currentRole;

    if (user === 'admin' && pass === 'admin123') {
        currentUser = { nome: 'Administrador', role: role, id: 1 };
    } else if (user === 'vendedor' && pass === 'venda123') {
        currentUser = { nome: 'Vendedor Teste', role: 'vendedor', id: 2 };
    } else {
        showNotification('Usuário ou senha inválidos!', 'error');
        return;
    }

    // Registrar log
    registrarLog('login', `Login realizado por ${user}`);

    // Atualizar interface
    document.getElementById('loginPage').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    document.getElementById('userName').textContent = currentUser.nome;
    document.getElementById('userRole').textContent = currentUser.role === 'admin' ? 'Administrador' : 'Vendedor';
    document.getElementById('userAvatar').textContent = currentUser.nome.charAt(0);

    // Verificar permissões
    verificarPermissoes();
    renderAll();

    showNotification(`Bem-vindo, ${currentUser.nome}!`, 'success');
}

function logout() {
    if (currentUser) {
        registrarLog('logout', `Logout realizado por ${currentUser.nome}`);
    }
    currentUser = null;
    pedidoTemp = [];
    document.getElementById('app').classList.add('hidden');
    document.getElementById('loginPage').classList.remove('hidden');
    showNotification('Logout realizado com sucesso!', 'info');
}

// ==========================
// PERMISSÕES
// ==========================
function verificarPermissoes() {
    if (currentUser.role === 'vendedor') {
        // Esconder abas não permitidas para vendedor
        document.querySelectorAll('.nav-btn[data-tab="logs"]').forEach(btn => {
            btn.style.display = 'none';
        });
        document.querySelectorAll('.nav-btn[data-tab="vendedores"]').forEach(btn => {
            btn.style.display = 'none';
        });
        document.querySelectorAll('.nav-btn[data-tab="relatorios"]').forEach(btn => {
            btn.style.display = 'none';
        });
    } else {
        // Mostrar todas as abas para admin
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.style.display = 'flex';
        });
    }
}

// ==========================
// LOGS DE AUDITORIA
// ==========================
function registrarLog(acao, detalhes) {
    const logs = getDB('logs');
    logs.unshift({
        id: generateId(),
        timestamp: new Date().toISOString(),
        usuario: currentUser ? currentUser.nome : 'Sistema',
        role: currentUser ? currentUser.role : 'sistema',
        acao: acao,
        detalhes: detalhes,
        ip: '127.0.0.1'
    });

    // Manter apenas os últimos 100 logs
    if (logs.length > 100) {
        logs.splice(100);
    }

    setDB('logs', logs);
}

function renderLogs() {
    let logs = getDB('logs');
    const container = document.getElementById('listaLogs');

    // Filtrar
    const data = document.getElementById('filterLogData').value;
    const usuario = document.getElementById('filterLogUsuario').value;
    const acao = document.getElementById('filterLogAcao').value;

    if (data) {
        logs = logs.filter(log => log.timestamp.startsWith(data));
    }
    if (usuario) {
        logs = logs.filter(log => log.usuario === usuario);
    }
    if (acao) {
        logs = logs.filter(log => log.acao === acao);
    }

    // Popular select de usuários
    const usuarios = [...new Set(getDB('logs').map(log => log.usuario))];
    const select = document.getElementById('filterLogUsuario');
    select.innerHTML = '<option value="">Todos</option>' +
        usuarios.map(u => `<option value="${u}">${u}</option>`).join('');

    if (logs.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-clipboard-list"></i><span>Nenhum log encontrado</span></div>';
        return;
    }

    container.innerHTML = logs.map(log => `
        <div class="log-entry">
            <div>
                <span class="log-action">${log.acao.toUpperCase()}</span>
                <span>${log.detalhes}</span>
            </div>
            <div style="display: flex; gap: 15px; align-items: center;">
                <span class="log-user">${log.usuario}</span>
                <span class="log-time">${new Date(log.timestamp).toLocaleString()}</span>
            </div>
        </div>
    `).join('');
}

function filtrarLogs() {
    renderLogs();
}

function limparFiltrosLogs() {
    const hoje = new Date();
    document.getElementById('filterLogData').valueAsDate = hoje;
    document.getElementById('filterLogUsuario').value = '';
    document.getElementById('filterLogAcao').value = '';
    renderLogs();
}

// ==========================
// GERAR DADOS DE TESTE - FUNÇÃO CORRIGIDA
// ==========================
function seedDatabaseCompleto() {
    if (!confirm("Isso irá gerar um banco de dados com dados de teste. Deseja continuar?")) return;

    try {
        console.time('GerarDados');

        // Gerar clientes de teste
        const nomesClientes = [
            'João Silva', 'Maria Santos', 'Pedro Oliveira', 'Ana Costa', 'Carlos Pereira',
            'Juliana Rodrigues', 'Fernando Almeida', 'Patrícia Souza', 'Ricardo Lima', 'Amanda Ferreira'
        ];

        const clientes = nomesClientes.map((nome, index) => ({
            id: generateId(),
            nome: nome,
            email: `${nome.toLowerCase().replace(/\s/g, '.')}@email.com`,
            telefone: `(11) 9${Math.floor(Math.random() * 9000) + 1000}-${Math.floor(Math.random() * 9000) + 1000}`,
            dataCadastro: new Date().toISOString(),
            status: 'ATIVO'
        }));

        // Gerar vendedores
        const nomesVendedores = [
            'Carlos Mendes', 'Fernanda Lima', 'Roberto Santos', 'Sandra Oliveira', 'Lucas Pereira'
        ];

        const vendedores = nomesVendedores.map((nome, index) => ({
            id: generateId(),
            nome: nome,
            email: `${nome.toLowerCase().replace(/\s/g, '.')}@empresa.com`,
            telefone: `(11) 9${Math.floor(Math.random() * 9000) + 1000}-${Math.floor(Math.random() * 9000) + 1000}`,
            dataCadastro: new Date().toISOString(),
            status: 'ATIVO',
            comissao: 5 + Math.floor(Math.random() * 10)
        }));

        // Gerar produtos
        const produtos = [
            { nome: 'Notebook Dell', categoria: 'INFORMATICA', preco: 3500.00, estoque: 15 },
            { nome: 'Mouse Logitech', categoria: 'INFORMATICA', preco: 89.90, estoque: 50 },
            { nome: 'Teclado Mecânico', categoria: 'INFORMATICA', preco: 299.90, estoque: 25 },
            { nome: 'Smartphone Samsung', categoria: 'ELETRONICOS', preco: 1899.00, estoque: 30 },
            { nome: 'Fone de Ouvido Bluetooth', categoria: 'ELETRONICOS', preco: 159.90, estoque: 40 },
            { nome: 'Mesa Executiva', categoria: 'ESCRITORIO', preco: 799.90, estoque: 10 },
            { nome: 'Cadeira Ergonômica', categoria: 'ESCRITORIO', preco: 1299.00, estoque: 8 },
            { nome: 'Impressora Multifuncional', categoria: 'ESCRITORIO', preco: 899.00, estoque: 12 }
        ].map((prod, index) => ({
            id: generateId(),
            ...prod,
            dataCadastro: new Date().toISOString()
        }));

        // Gerar pedidos de teste
        const pedidos = [];
        const hoje = new Date();
        const statusList = ['ABERTO', 'FECHADO', 'CANCELADO'];

        // Gerar pedidos para os últimos 30 dias
        for (let i = 0; i < 30; i++) {
            const diasAtras = Math.floor(Math.random() * 30);
            const data = new Date();
            data.setDate(data.getDate() - diasAtras);
            
            const cliente = clientes[Math.floor(Math.random() * clientes.length)];
            const vendedor = vendedores[Math.floor(Math.random() * vendedores.length)];
            const status = statusList[Math.floor(Math.random() * statusList.length)];
            
            // Gerar 1-3 itens por pedido
            const numItens = Math.floor(Math.random() * 3) + 1;
            const itens = [];
            let total = 0;
            
            for (let j = 0; j < numItens; j++) {
                const produto = produtos[Math.floor(Math.random() * produtos.length)];
                const qtd = Math.floor(Math.random() * 2) + 1;
                const valor = produto.preco * qtd;
                
                itens.push({
                    produtoId: produto.id,
                    nome: produto.nome,
                    qtd: qtd,
                    precoUnitario: produto.preco,
                    valor: parseFloat(valor.toFixed(2))
                });
                
                total += valor;
            }
            
            pedidos.push({
                id: generateId(),
                clienteId: cliente.id,
                vendedorId: vendedor.id,
                clienteNome: cliente.nome,
                vendedorNome: vendedor.nome,
                data: data.toISOString(),
                status: status,
                itens: itens,
                total: parseFloat(total.toFixed(2))
            });
        }

        // Adicionar alguns pedidos para hoje
        for (let i = 0; i < 5; i++) {
            const cliente = clientes[Math.floor(Math.random() * clientes.length)];
            const vendedor = vendedores[Math.floor(Math.random() * vendedores.length)];
            const status = i < 2 ? 'ABERTO' : 'FECHADO';
            
            const numItens = Math.floor(Math.random() * 2) + 1;
            const itens = [];
            let total = 0;
            
            for (let j = 0; j < numItens; j++) {
                const produto = produtos[Math.floor(Math.random() * produtos.length)];
                const qtd = Math.floor(Math.random() * 2) + 1;
                const valor = produto.preco * qtd;
                
                itens.push({
                    produtoId: produto.id,
                    nome: produto.nome,
                    qtd: qtd,
                    precoUnitario: produto.preco,
                    valor: parseFloat(valor.toFixed(2))
                });
                
                total += valor;
            }
            
            pedidos.push({
                id: generateId(),
                clienteId: cliente.id,
                vendedorId: vendedor.id,
                clienteNome: cliente.nome,
                vendedorNome: vendedor.nome,
                data: hoje.toISOString(),
                status: status,
                itens: itens,
                total: parseFloat(total.toFixed(2))
            });
        }

        // Gerar logs iniciais
        const logs = [
            {
                id: generateId(),
                timestamp: new Date().toISOString(),
                usuario: 'Sistema',
                role: 'sistema',
                acao: 'system',
                detalhes: 'Banco de dados inicializado com dados de teste',
                ip: '127.0.0.1'
            }
        ];

        // Salvar todos os dados
        setDB("clientes", clientes);
        setDB("vendedores", vendedores);
        setDB("produtos", produtos);
        setDB("pedidos", pedidos);
        setDB("logs", logs);

        console.timeEnd('GerarDados');

        // Atualizar interface se estiver logado
        if (currentUser) {
            renderAll();
            showNotification("✅ Dados de teste gerados com sucesso!", "success");
        } else {
            showNotification("✅ Dados gerados! Faça login para visualizar.", "success");
        }

    } catch (error) {
        console.error('Erro ao gerar dados:', error);
        showNotification('❌ Erro ao gerar dados de teste!', 'error');
    }
}

// ==========================
// PAGINAÇÃO
// ==========================
const paginacao = {
    clientes: { pagina: 1, porPagina: 10, total: 0 },
    produtos: { pagina: 1, porPagina: 10, total: 0 },
    pedidos: { pagina: 1, porPagina: 10, total: 0 }
};

function atualizarInfoPagina(tipo) {
    const pag = paginacao[tipo];
    const totalPaginas = Math.max(1, Math.ceil(pag.total / pag.porPagina));
    const element = document.getElementById(`pageInfo${capitalize(tipo)}`);
    if (element) {
        element.textContent = `Página ${pag.pagina} de ${totalPaginas}`;
    }
}

function mudarPagina(tipo, direcao) {
    const pag = paginacao[tipo];
    pag.pagina += direcao;

    const totalPaginas = Math.max(1, Math.ceil(pag.total / pag.porPagina));
    if (pag.pagina < 1) pag.pagina = 1;
    if (pag.pagina > totalPaginas) {
        pag.pagina = totalPaginas;
    }

    atualizarInfoPagina(tipo);

    switch (tipo) {
        case 'clientes': renderClientes(); break;
        case 'produtos': renderProdutos(); break;
        case 'pedidos': renderPedidos(); break;
    }
}

// ==========================
// BUSCA E FILTROS
// ==========================
function buscarClientes() {
    const termo = document.getElementById('searchCliente').value.toLowerCase();
    const clientes = getDB('clientes');
    const filtrados = clientes.filter(c =>
        c.nome.toLowerCase().includes(termo) ||
        (c.email && c.email.toLowerCase().includes(termo))
    );

    paginacao.clientes.total = filtrados.length;
    paginacao.clientes.pagina = 1;
    renderClientes(filtrados);
}

function buscarVendedores() {
    const termo = document.getElementById('searchVendedor').value.toLowerCase();
    const vendedores = getDB('vendedores');
    const filtrados = vendedores.filter(v =>
        v.nome.toLowerCase().includes(termo) ||
        (v.email && v.email.toLowerCase().includes(termo))
    );
    renderVendedores(filtrados);
}

function buscarProdutos() {
    const termo = document.getElementById('searchProduto').value.toLowerCase();
    const produtos = getDB('produtos');
    const filtrados = produtos.filter(p =>
        p.nome.toLowerCase().includes(termo) ||
        (p.categoria && p.categoria.toLowerCase().includes(termo))
    );

    paginacao.produtos.total = filtrados.length;
    paginacao.produtos.pagina = 1;
    renderProdutos(filtrados);
}

// ==========================
// FILTROS E ORDENAÇÃO DE PEDIDOS
// ==========================
function filtrarPedidos() {
    renderPedidos();
}

function ordenarPedidos() {
    renderPedidos();
}

function limparFiltrosPedidos() {
    const hoje = new Date();
    const umaSemanaAtras = new Date();
    umaSemanaAtras.setDate(umaSemanaAtras.getDate() - 7);

    document.getElementById('filterDataInicio').valueAsDate = umaSemanaAtras;
    document.getElementById('filterDataFim').valueAsDate = hoje;
    document.getElementById('filterStatus').value = '';
    document.getElementById('ordenarPedidos').value = 'data_desc';
    renderPedidos();
}

// ==========================
// CLIENTES
// ==========================
function addCliente() {
    if (currentUser.role !== 'admin') {
        showNotification('Somente administradores podem adicionar clientes!', 'error');
        return;
    }

    const nome = document.getElementById("clienteNome").value.trim();
    const email = document.getElementById("clienteEmail").value.trim();
    const telefone = document.getElementById("clienteTelefone").value.trim();

    if (!nome || !email) {
        showNotification('Preencha nome e email!', 'error');
        return;
    }

    const clientes = getDB("clientes");
    const novoCliente = {
        id: generateId(),
        nome,
        email,
        telefone,
        dataCadastro: new Date().toISOString(),
        status: 'ATIVO'
    };

    clientes.push(novoCliente);

    if (setDB("clientes", clientes)) {
        // Limpar formulário
        document.getElementById("clienteNome").value = "";
        document.getElementById("clienteEmail").value = "";
        document.getElementById("clienteTelefone").value = "";

        registrarLog('create', `Cliente criado: ${nome}`);
        renderClientes();
        renderDashboard();
        carregarSelects();
        showNotification('Cliente adicionado com sucesso!', 'success');
    } else {
        showNotification('Erro ao salvar cliente!', 'error');
    }
}

function renderClientes(clientesFiltrados = null) {
    let clientes = clientesFiltrados || getDB("clientes");
    const lista = document.getElementById("listaClientes");

    // Paginação
    const pag = paginacao.clientes;
    pag.total = clientes.length;
    const inicio = (pag.pagina - 1) * pag.porPagina;
    const fim = inicio + pag.porPagina;
    const clientesPagina = clientes.slice(inicio, fim);

    // Atualizar info de página
    atualizarInfoPagina('clientes');

    if (clientesPagina.length === 0) {
        lista.innerHTML = '<div class="empty-state"><i class="fas fa-users"></i><span>Nenhum cliente encontrado</span></div>';
        return;
    }

    lista.innerHTML = clientesPagina.map(c => `
        <div class="card">
            <strong>${c.nome}</strong>
            <span><i class="fas fa-envelope"></i> ${c.email}</span>
            <span><i class="fas fa-phone"></i> ${c.telefone || 'Não informado'}</span>
            <span><i class="fas fa-calendar"></i> ${new Date(c.dataCadastro).toLocaleDateString()}</span>
            <span class="status-badge ${c.status === 'ATIVO' ? 'status-fechado' : 'status-aberto'}">
                ${c.status}
            </span>
            <div style="margin-top: 10px;">
                <button onclick="abrirModalEdicao('cliente', ${c.id})" class="btn-secondary btn-sm">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button onclick="confirmarExclusao('cliente', ${c.id}, '${c.nome.replace(/'/g, "\\'")}')" class="btn-danger btn-sm" style="margin-left: 8px;">
                    <i class="fas fa-trash-alt"></i> Excluir
                </button>
            </div>
        </div>
    `).join("");
}

// ==========================
// VENDEDORES
// ==========================
function addVendedor() {
    if (currentUser.role !== 'admin') {
        showNotification('Somente administradores podem adicionar vendedores!', 'error');
        return;
    }

    const nome = document.getElementById("vendedorNome").value.trim();
    const email = document.getElementById("vendedorEmail").value.trim();
    const telefone = document.getElementById("vendedorTelefone").value.trim();

    if (!nome) {
        showNotification('Informe o nome!', 'error');
        return;
    }

    const vendedores = getDB("vendedores");
    const novoVendedor = {
        id: generateId(),
        nome,
        email,
        telefone,
        dataCadastro: new Date().toISOString(),
        status: 'ATIVO',
        comissao: 5
    };

    vendedores.push(novoVendedor);

    if (setDB("vendedores", vendedores)) {
        document.getElementById("vendedorNome").value = "";
        document.getElementById("vendedorEmail").value = "";
        document.getElementById("vendedorTelefone").value = "";

        registrarLog('create', `Vendedor criado: ${nome}`);
        renderVendedores();
        carregarSelects();
        showNotification('Vendedor adicionado com sucesso!', 'success');
    } else {
        showNotification('Erro ao salvar vendedor!', 'error');
    }
}

function renderVendedores(vendedoresFiltrados = null) {
    let vendedores = vendedoresFiltrados || getDB("vendedores");
    const lista = document.getElementById("listaVendedores");

    if (vendedores.length === 0) {
        lista.innerHTML = '<div class="empty-state"><i class="fas fa-user-tie"></i><span>Nenhum vendedor encontrado</span></div>';
        return;
    }

    lista.innerHTML = vendedores.map(v => `
        <div class="card">
            <strong>${v.nome}</strong>
            <span><i class="fas fa-envelope"></i> ${v.email || 'Não informado'}</span>
            <span><i class="fas fa-phone"></i> ${v.telefone || 'Não informado'}</span>
            <span><i class="fas fa-percentage"></i> Comissão: ${v.comissao || 5}%</span>
            <div style="margin-top: 10px;">
                <button onclick="abrirModalEdicao('vendedor', ${v.id})" class="btn-secondary btn-sm">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button onclick="confirmarExclusao('vendedor', ${v.id}, '${v.nome.replace(/'/g, "\\'")}')" class="btn-danger btn-sm" style="margin-left: 8px;">
                    <i class="fas fa-trash-alt"></i> Excluir
                </button>
            </div>
        </div>
    `).join("");
}

// ==========================
// PRODUTOS
// ==========================
function addProduto() {
    if (currentUser.role !== 'admin') {
        showNotification('Somente administradores podem adicionar produtos!', 'error');
        return;
    }

    const nome = document.getElementById("produtoNome").value.trim();
    const preco = parseFloat(document.getElementById("produtoPreco").value);
    const estoque = parseInt(document.getElementById("produtoEstoque").value) || 0;
    const categoria = document.getElementById("produtoCategoria").value;

    if (!nome || isNaN(preco) || preco <= 0) {
        showNotification('Informe nome e preço válidos!', 'error');
        return;
    }

    const produtos = getDB("produtos");
    const novoProduto = {
        id: generateId(),
        nome,
        preco,
        estoque: estoque || 0,
        categoria,
        dataCadastro: new Date().toISOString()
    };

    produtos.push(novoProduto);

    if (setDB("produtos", produtos)) {
        document.getElementById("produtoNome").value = "";
        document.getElementById("produtoPreco").value = "";
        document.getElementById("produtoEstoque").value = "";

        registrarLog('create', `Produto criado: ${nome}`);
        renderProdutos();
        carregarSelects();
        renderDashboard();
        showNotification('Produto adicionado com sucesso!', 'success');
    } else {
        showNotification('Erro ao salvar produto!', 'error');
    }
}

function renderProdutos(produtosFiltrados = null) {
    let produtos = produtosFiltrados || getDB("produtos");
    const lista = document.getElementById("listaProdutos");

    // Paginação
    const pag = paginacao.produtos;
    pag.total = produtos.length;
    const inicio = (pag.pagina - 1) * pag.porPagina;
    const fim = inicio + pag.porPagina;
    const produtosPagina = produtos.slice(inicio, fim);

    atualizarInfoPagina('produtos');

    if (produtosPagina.length === 0) {
        lista.innerHTML = '<div class="empty-state"><i class="fas fa-box"></i><span>Nenhum produto encontrado</span></div>';
        return;
    }

    lista.innerHTML = produtosPagina.map(p => `
        <div class="card">
            <strong>${p.nome}</strong>
            <span><i class="fas fa-dollar-sign"></i> R$ ${p.preco.toFixed(2)}</span>
            <span><i class="fas fa-warehouse"></i> Estoque: ${p.estoque}</span>
            <span style="display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 0.75rem; background: #e8efff; color: #1e3c72; margin-top: 5px;">
                ${p.categoria || 'OUTROS'}
            </span>
            <div style="margin-top: 10px;">
                <button onclick="abrirModalEdicao('produto', ${p.id})" class="btn-secondary btn-sm">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button onclick="confirmarExclusao('produto', ${p.id}, '${p.nome.replace(/'/g, "\\'")}')" class="btn-danger btn-sm" style="margin-left: 8px;">
                    <i class="fas fa-trash-alt"></i> Excluir
                </button>
            </div>
        </div>
    `).join("");
}

// ==========================
// PEDIDOS
// ==========================
function carregarSelects() {
    const clientes = getDB("clientes").filter(c => c.status === 'ATIVO');
    const vendedores = getDB("vendedores").filter(v => v.status === 'ATIVO');
    const produtos = getDB("produtos").filter(p => p.estoque > 0);

    const clienteSelect = document.getElementById("pedidoCliente");
    const vendedorSelect = document.getElementById("pedidoVendedor");
    const produtoSelect = document.getElementById("pedidoProduto");

    if (clienteSelect) {
        clienteSelect.innerHTML =
            `<option value="">Selecione Cliente</option>` +
            clientes.map(c => `<option value="${c.id}">${c.nome}</option>`).join("");
    }

    if (vendedorSelect) {
        vendedorSelect.innerHTML =
            `<option value="">Selecione Vendedor</option>` +
            vendedores.map(v => `<option value="${v.id}">${v.nome}</option>`).join("");
    }

    if (produtoSelect) {
        produtoSelect.innerHTML =
            `<option value="">Selecione Produto</option>` +
            produtos.map(p => `<option value="${p.id}">${p.nome} - R$ ${p.preco.toFixed(2)} (Estoque: ${p.estoque})</option>`).join("");
    }
}

function addItemPedido() {
    const produtoId = parseInt(document.getElementById("pedidoProduto").value);
    const qtd = parseInt(document.getElementById("pedidoQtd").value);

    if (!produtoId || !qtd || qtd <= 0) {
        showNotification('Selecione produto e quantidade válida!', 'error');
        return;
    }

    const produtos = getDB("produtos");
    const produto = produtos.find(p => p.id === produtoId);

    if (!produto) {
        showNotification('Produto não encontrado!', 'error');
        return;
    }

    // Verificar estoque
    if (produto.estoque < qtd) {
        showNotification(`Estoque insuficiente! Disponível: ${produto.estoque}`, 'error');
        return;
    }

    // Verificar se já existe no pedido
    const itemExistente = pedidoTemp.find(item => item.produtoId === produtoId);
    if (itemExistente) {
        const novaQtd = itemExistente.qtd + qtd;
        if (produto.estoque < novaQtd) {
            showNotification(`Estoque insuficiente para quantidade adicional! Disponível: ${produto.estoque}`, 'error');
            return;
        }
        itemExistente.qtd = novaQtd;
        itemExistente.valor = parseFloat((produto.preco * novaQtd).toFixed(2));
    } else {
        pedidoTemp.push({
            produtoId: produto.id,
            nome: produto.nome,
            qtd,
            precoUnitario: produto.preco,
            valor: parseFloat((produto.preco * qtd).toFixed(2))
        });
    }

    document.getElementById("pedidoQtd").value = "1";
    atualizarTotalPedido();
    renderItensPedidoTemp();
    showNotification('Item adicionado ao pedido!', 'success');
}

function renderItensPedidoTemp() {
    const lista = document.getElementById("itensPedidoTemp");

    if (pedidoTemp.length === 0) {
        lista.innerHTML = '<div class="empty-state"><i class="fas fa-box-open"></i><span>Nenhum item adicionado</span></div>';
        return;
    }

    lista.innerHTML = pedidoTemp.map((item, index) => `
        <div class="card">
            <strong>${item.nome}</strong>
            <span><i class="fas fa-hashtag"></i> Quantidade: ${item.qtd}</span>
            <span><i class="fas fa-dollar-sign"></i> Preço Unitário: R$ ${item.precoUnitario.toFixed(2)}</span>
            <span><i class="fas fa-calculator"></i> Total: R$ ${item.valor.toFixed(2)}</span>
            <button onclick="removerItemPedido(${index})" class="btn-danger btn-sm">
                <i class="fas fa-trash-alt"></i> Remover
            </button>
        </div>
    `).join("");
}

function atualizarTotalPedido() {
    const total = pedidoTemp.reduce((sum, item) => sum + item.valor, 0);
    document.getElementById("totalPedido").textContent = total.toFixed(2);
}

function removerItemPedido(index) {
    if (index >= 0 && index < pedidoTemp.length) {
        pedidoTemp.splice(index, 1);
        atualizarTotalPedido();
        renderItensPedidoTemp();
        showNotification('Item removido do pedido!', 'info');
    }
}

function finalizarPedido() {
    if (currentUser.role !== 'admin' && currentUser.role !== 'vendedor') {
        showNotification('Você não tem permissão para criar pedidos!', 'error');
        return;
    }

    const clienteId = parseInt(document.getElementById("pedidoCliente").value);
    const vendedorId = parseInt(document.getElementById("pedidoVendedor").value);

    if (!clienteId || !vendedorId || pedidoTemp.length === 0) {
        showNotification('Preencha cliente, vendedor e adicione itens!', 'error');
        return;
    }

    const clientes = getDB("clientes");
    const vendedores = getDB("vendedores");
    const produtos = getDB("produtos");

    const cliente = clientes.find(c => c.id === clienteId);
    const vendedor = vendedores.find(v => v.id === vendedorId);

    if (!cliente || !vendedor) {
        showNotification('Cliente ou vendedor inválido!', 'error');
        return;
    }

    // Verificar estoque novamente e atualizar
    let estoqueInsuficiente = false;
    pedidoTemp.forEach(item => {
        const produto = produtos.find(p => p.id === item.produtoId);
        if (produto && produto.estoque < item.qtd) {
            estoqueInsuficiente = true;
            showNotification(`Estoque insuficiente para ${produto.nome}! Disponível: ${produto.estoque}`, 'error');
        }
    });

    if (estoqueInsuficiente) return;

    // Atualizar estoque
    pedidoTemp.forEach(item => {
        const produtoIndex = produtos.findIndex(p => p.id === item.produtoId);
        if (produtoIndex !== -1) {
            produtos[produtoIndex].estoque -= item.qtd;
        }
    });
    setDB("produtos", produtos);

    const pedidos = getDB("pedidos");
    const totalPedido = pedidoTemp.reduce((sum, item) => sum + item.valor, 0);

    const novoPedido = {
        id: generateId(),
        clienteId,
        vendedorId,
        data: new Date().toISOString(),
        status: "ABERTO",
        itens: [...pedidoTemp],
        total: totalPedido,
        vendedorNome: vendedor.nome,
        clienteNome: cliente.nome
    };

    pedidos.push(novoPedido);

    if (setDB("pedidos", pedidos)) {
        registrarLog('create', `Pedido criado #${novoPedido.id} - Total: R$ ${totalPedido.toFixed(2)}`);

        // Limpar formulário
        pedidoTemp = [];
        document.getElementById("pedidoCliente").value = "";
        document.getElementById("pedidoVendedor").value = "";
        document.getElementById("pedidoProduto").value = "";
        document.getElementById("pedidoQtd").value = "1";
        renderItensPedidoTemp();
        atualizarTotalPedido();
        carregarSelects();
        renderDashboard();
        renderPedidos();

        showNotification(`Pedido #${novoPedido.id} registrado com sucesso!`, 'success');
    } else {
        showNotification('Erro ao salvar pedido!', 'error');
    }
}

function renderPedidos() {
    let pedidos = getDB("pedidos");
    const lista = document.getElementById("listaPedidos");

    // Aplicar filtros
    const dataInicio = document.getElementById("filterDataInicio").value;
    const dataFim = document.getElementById("filterDataFim").value;
    const status = document.getElementById("filterStatus").value;
    const ordenacao = document.getElementById("ordenarPedidos").value;

    if (dataInicio) {
        pedidos = pedidos.filter(p => p.data >= dataInicio + 'T00:00:00');
    }
    if (dataFim) {
        pedidos = pedidos.filter(p => p.data <= dataFim + 'T23:59:59');
    }
    if (status) {
        pedidos = pedidos.filter(p => p.status === status);
    }

    // Aplicar ordenação
    switch (ordenacao) {
        case 'data_desc':
            pedidos.sort((a, b) => new Date(b.data) - new Date(a.data));
            break;
        case 'data_asc':
            pedidos.sort((a, b) => new Date(a.data) - new Date(b.data));
            break;
        case 'valor_desc':
            pedidos.sort((a, b) => b.total - a.total);
            break;
        case 'valor_asc':
            pedidos.sort((a, b) => a.total - b.total);
            break;
    }

    // Paginação
    const pag = paginacao.pedidos;
    pag.total = pedidos.length;
    const inicio = (pag.pagina - 1) * pag.porPagina;
    const fim = inicio + pag.porPagina;
    const pedidosPagina = pedidos.slice(inicio, fim);

    atualizarInfoPagina('pedidos');

    if (pedidosPagina.length === 0) {
        lista.innerHTML = '<div class="empty-state"><i class="fas fa-file-invoice"></i><span>Nenhum pedido encontrado</span></div>';
        return;
    }

    lista.innerHTML = pedidosPagina.map(p => `
        <div class="card">
            <strong>Pedido #${p.id.toString().slice(-6)}</strong>
            <span><i class="fas fa-user"></i> Cliente: ${p.clienteNome}</span>
            <span><i class="fas fa-user-tie"></i> Vendedor: ${p.vendedorNome}</span>
            <span><i class="fas fa-calendar"></i> Data: ${new Date(p.data).toLocaleDateString()}</span>
            <span><i class="fas fa-boxes"></i> Itens: ${p.itens ? p.itens.length : 0}</span>
            <span><i class="fas fa-dollar-sign"></i> Total: R$ ${p.total.toFixed(2)}</span>
            <span class="status-badge ${p.status === 'ABERTO' ? 'status-aberto' : p.status === 'FECHADO' ? 'status-fechado' : 'status-cancelado'}">
                ${p.status}
            </span>
            <div style="margin-top: 10px;">
                <button onclick="alterarStatusPedido(${p.id})" class="btn-secondary btn-sm">
                    <i class="fas fa-edit"></i> Alterar Status
                </button>
            </div>
        </div>
    `).join("");
}

function alterarStatusPedido(id) {
    const pedidos = getDB("pedidos");
    const pedido = pedidos.find(p => p.id === id);

    if (!pedido) {
        showNotification('Pedido não encontrado!', 'error');
        return;
    }

    const novoStatus = prompt(`Status atual: ${pedido.status}\n\nNovo status (ABERTO, FECHADO, CANCELADO):`, pedido.status);
    if (novoStatus && ['ABERTO', 'FECHADO', 'CANCELADO'].includes(novoStatus.toUpperCase())) {
        const statusAntigo = pedido.status;
        pedido.status = novoStatus.toUpperCase();

        if (setDB("pedidos", pedidos)) {
            renderPedidos();
            renderDashboard();
            registrarLog('update', `Status do pedido ${id} alterado de ${statusAntigo} para ${novoStatus}`);
            showNotification('Status atualizado com sucesso!', 'success');
        } else {
            showNotification('Erro ao atualizar status!', 'error');
        }
    }
}

// ==========================
// DASHBOARD E GRÁFICOS SIMPLIFICADOS
// ==========================
function renderDashboard() {
    const clientes = getDB("clientes");
    const produtos = getDB("produtos");
    const pedidos = getDB("pedidos");

    let totalVendas = 0;
    let pedidosAbertos = 0;

    pedidos.forEach(p => {
        if (p.status === 'FECHADO') {
            totalVendas += p.total || 0;
        }
        if (p.status === 'ABERTO') pedidosAbertos++;
    });

    // Corrigir o erro - verificar se os elementos existem antes de acessar
    const kpiClientes = document.getElementById("kpiClientes");
    const kpiProdutos = document.getElementById("kpiProdutos");
    const kpiPedidos = document.getElementById("kpiPedidos");
    const kpiVendas = document.getElementById("kpiVendas");

    if (kpiClientes) kpiClientes.textContent = clientes.length;
    if (kpiProdutos) kpiProdutos.textContent = produtos.length;
    if (kpiPedidos) kpiPedidos.textContent = pedidosAbertos;
    if (kpiVendas) kpiVendas.textContent = `R$ ${totalVendas.toFixed(2)}`;

    // Renderizar gráficos simplificados
    renderChartVendasMes();
    renderChartTopVendedores();
}

function atualizarDashboard() {
    renderDashboard();
    showNotification('Dashboard atualizado!', 'info');
}

function renderChartVendasMes() {
    const pedidos = getDB("pedidos");
    const container = document.getElementById("chartVendasMes");

    // Agrupar por mês
    const meses = {};
    pedidos.forEach(p => {
        if (p.status === 'FECHADO') {
            const data = new Date(p.data);
            const mesAno = `${(data.getMonth() + 1).toString().padStart(2, '0')}/${data.getFullYear()}`;

            if (!meses[mesAno]) meses[mesAno] = 0;
            meses[mesAno] += p.total;
        }
    });

    const labels = Object.keys(meses);
    const valores = Object.values(meses);
    const maxValor = Math.max(...valores, 1);

    if (labels.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-chart-line"></i><span>Nenhuma venda para exibir</span></div>';
        return;
    }

    container.innerHTML = `
        <div style="display: flex; height: 150px; align-items: flex-end; justify-content: space-around; padding: 0 10px;">
            ${valores.map((valor, i) => {
                const altura = (valor / maxValor) * 120;
                return `
                    <div style="display: flex; flex-direction: column; align-items: center; height: 100%;">
                        <div style="position: relative; width: 100%; height: 100%; display: flex; align-items: flex-end;">
                            <div style="
                                height: ${altura}px;
                                width: 30px;
                                background: linear-gradient(to top, #4a90e2, #2a5298);
                                border-radius: 4px 4px 0 0;
                                margin: 0 auto;
                                position: relative;
                            ">
                                ${valor > 0 ? `
                                    <div style="position: absolute; top: -25px; left: 0; right: 0; text-align: center; font-size: 0.8rem; font-weight: bold; color: #2c3e50;">
                                        R$ ${valor.toFixed(0)}
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                        <div style="margin-top: 10px; font-size: 0.75rem; color: #666;">
                            ${labels[i]}
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function renderChartTopVendedores() {
    const pedidos = getDB("pedidos");
    const vendedores = getDB("vendedores");
    const container = document.getElementById("chartTopVendedores");

    // Calcular vendas por vendedor
    const vendasPorVendedor = {};
    pedidos.forEach(p => {
        if (p.status === 'FECHADO') {
            if (!vendasPorVendedor[p.vendedorId]) vendasPorVendedor[p.vendedorId] = 0;
            vendasPorVendedor[p.vendedorId] += p.total;
        }
    });

    // Converter para array e ordenar
    const topVendedores = vendedores
        .map(v => ({
            nome: v.nome,
            total: vendasPorVendedor[v.id] || 0
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

    const maxValor = Math.max(...topVendedores.map(v => v.total), 1);

    if (topVendedores.length === 0 || topVendedores.every(v => v.total === 0)) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-trophy"></i><span>Nenhum vendedor com vendas</span></div>';
        return;
    }

    container.innerHTML = `
        <div style="display: flex; height: 150px; align-items: flex-end; justify-content: space-around; gap: 10px; padding: 0 10px;">
            ${topVendedores.map((v, i) => {
                const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'];
                const color = colors[i % colors.length];
                const altura = (v.total / maxValor) * 120;
                
                return `
                    <div style="display: flex; flex-direction: column; align-items: center; height: 100%;">
                        <div style="position: relative; width: 100%; height: 100%; display: flex; align-items: flex-end;">
                            <div style="
                                height: ${altura}px;
                                width: 30px;
                                background: linear-gradient(to top, ${color}, ${color}90);
                                border-radius: 4px 4px 0 0;
                                margin: 0 auto;
                                position: relative;
                            ">
                                <div style="position: absolute; top: -25px; left: 0; right: 0; text-align: center; font-size: 0.8rem; font-weight: bold; color: #2c3e50;">
                                    R$ ${v.total.toFixed(0)}
                                </div>
                            </div>
                        </div>
                        <div style="margin-top: 10px; font-size: 0.7rem; text-align: center; max-width: 50px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                            ${v.nome.split(' ')[0]}
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

// ==========================
// FUNÇÕES DE EDIÇÃO CORRIGIDAS
// ==========================
function abrirModalEdicao(tipo, id) {
    if (currentUser.role !== 'admin') {
        showNotification('Somente administradores podem editar registros!', 'error');
        return;
    }

    const modal = document.getElementById('modalEdicao');
    modal.classList.remove('hidden');

    // Esconder todos os forms
    document.querySelectorAll('.edit-form').forEach(form => {
        form.classList.add('hidden');
    });

    // Mostrar form correto
    document.getElementById(`edit${capitalize(tipo)}Form`).classList.remove('hidden');

    // Configurar título
    document.getElementById('modalTitulo').textContent = `Editar ${getNomeTipo(tipo)}`;

    // Carregar dados
    carregarDadosParaEdicao(tipo, id);
}

function fecharModal() {
    const modal = document.getElementById('modalEdicao');
    if (modal) {
        modal.classList.add('hidden');
        document.getElementById('formEdicao').reset();
        dadosParaEditar = null;
    }
}

function carregarDadosParaEdicao(tipo, id) {
    dadosParaEditar = { tipo, id };

    switch (tipo) {
        case 'cliente':
            const cliente = getDB('clientes').find(c => c.id === id);
            if (cliente) {
                document.getElementById('editId').value = id;
                document.getElementById('editTipo').value = tipo;
                document.getElementById('editClienteNome').value = cliente.nome;
                document.getElementById('editClienteEmail').value = cliente.email;
                document.getElementById('editClienteTelefone').value = cliente.telefone || '';
                document.getElementById('editClienteStatus').value = cliente.status || 'ATIVO';
            }
            break;

        case 'produto':
            const produto = getDB('produtos').find(p => p.id === id);
            if (produto) {
                document.getElementById('editId').value = id;
                document.getElementById('editTipo').value = tipo;
                document.getElementById('editProdutoNome').value = produto.nome;
                document.getElementById('editProdutoPreco').value = produto.preco;
                document.getElementById('editProdutoEstoque').value = produto.estoque;
                document.getElementById('editProdutoCategoria').value = produto.categoria || 'OUTROS';
            }
            break;

        case 'vendedor':
            const vendedor = getDB('vendedores').find(v => v.id === id);
            if (vendedor) {
                document.getElementById('editId').value = id;
                document.getElementById('editTipo').value = tipo;
                document.getElementById('editVendedorNome').value = vendedor.nome;
                document.getElementById('editVendedorEmail').value = vendedor.email || '';
                document.getElementById('editVendedorTelefone').value = vendedor.telefone || '';
                document.getElementById('editVendedorComissao').value = vendedor.comissao || 5;
            }
            break;
    }
}

function salvarEdicao() {
    if (!dadosParaEditar) {
        showNotification('Nenhum dado para salvar!', 'error');
        return;
    }

    const { tipo, id } = dadosParaEditar;

    // Validar permissão
    if (currentUser.role !== 'admin') {
        showNotification('Somente administradores podem editar registros!', 'error');
        fecharModal();
        return;
    }

    let dadosAtualizados = {};

    switch (tipo) {
        case 'cliente':
            const nomeCliente = document.getElementById('editClienteNome').value.trim();
            const emailCliente = document.getElementById('editClienteEmail').value.trim();

            if (!nomeCliente || !emailCliente) {
                showNotification('Nome e email são obrigatórios!', 'error');
                return;
            }

            dadosAtualizados = {
                nome: nomeCliente,
                email: emailCliente,
                telefone: document.getElementById('editClienteTelefone').value.trim(),
                status: document.getElementById('editClienteStatus').value,
                dataAtualizacao: new Date().toISOString()
            };
            break;

        case 'produto':
            const nomeProduto = document.getElementById('editProdutoNome').value.trim();
            const precoProduto = parseFloat(document.getElementById('editProdutoPreco').value);

            if (!nomeProduto || isNaN(precoProduto) || precoProduto <= 0) {
                showNotification('Nome e preço válido são obrigatórios!', 'error');
                return;
            }

            const estoqueProduto = parseInt(document.getElementById('editProdutoEstoque').value);
            if (isNaN(estoqueProduto) || estoqueProduto < 0) {
                showNotification('Estoque inválido!', 'error');
                return;
            }

            dadosAtualizados = {
                nome: nomeProduto,
                preco: precoProduto,
                estoque: estoqueProduto,
                categoria: document.getElementById('editProdutoCategoria').value,
                dataAtualizacao: new Date().toISOString()
            };
            break;

        case 'vendedor':
            const nomeVendedor = document.getElementById('editVendedorNome').value.trim();

            if (!nomeVendedor) {
                showNotification('Nome é obrigatório!', 'error');
                return;
            }

            const comissaoVendedor = parseFloat(document.getElementById('editVendedorComissao').value);
            if (isNaN(comissaoVendedor) || comissaoVendedor < 0 || comissaoVendedor > 20) {
                showNotification('Comissão deve ser entre 0 e 20%!', 'error');
                return;
            }

            dadosAtualizados = {
                nome: nomeVendedor,
                email: document.getElementById('editVendedorEmail').value.trim(),
                telefone: document.getElementById('editVendedorTelefone').value.trim(),
                comissao: comissaoVendedor,
                dataAtualizacao: new Date().toISOString()
            };
            break;
    }

    // Atualizar no banco de dados
    const tableName = tipo === 'cliente' ? 'clientes' : tipo === 'produto' ? 'produtos' : 'vendedores';
    const db = getDB(tableName);
    const index = db.findIndex(item => item.id === id);

    if (index === -1) {
        showNotification('Registro não encontrado!', 'error');
        fecharModal();
        return;
    }

    // Manter dados originais que não foram alterados
    const originalData = db[index];
    db[index] = { ...originalData, ...dadosAtualizados };

    if (setDB(tableName, db)) {
        registrarLog('update', `${getNomeTipo(tipo)} atualizado: ${dadosAtualizados.nome || originalData.nome}`);

        // Atualizar a interface
        switch (tipo) {
            case 'cliente':
                renderClientes();
                carregarSelects();
                renderDashboard();
                break;
            case 'produto':
                renderProdutos();
                carregarSelects();
                renderDashboard();
                break;
            case 'vendedor':
                renderVendedores();
                carregarSelects();
                break;
        }

        fecharModal();
        showNotification(`${getNomeTipo(tipo)} atualizado com sucesso!`, 'success');
    } else {
        showNotification('Erro ao salvar alterações!', 'error');
    }
}

// ==========================
// FUNÇÕES DE EXCLUSÃO
// ==========================
function verificarDependenciasExclusao(tipo, id) {
    const pedidos = getDB('pedidos');

    switch (tipo) {
        case 'cliente':
            const clientePedidos = pedidos.filter(p => p.clienteId === id);
            if (clientePedidos.length > 0) {
                return {
                    podeExcluir: false,
                    mensagem: `Não é possível excluir! Existem ${clientePedidos.length} pedidos associados a este cliente.`
                };
            }
            break;

        case 'vendedor':
            const vendedorPedidos = pedidos.filter(p => p.vendedorId === id);
            if (vendedorPedidos.length > 0) {
                return {
                    podeExcluir: false,
                    mensagem: `Não é possível excluir! Existem ${vendedorPedidos.length} pedidos associados a este vendedor.`
                };
            }
            break;

        case 'produto':
            let produtoPedidos = 0;
            pedidos.forEach(p => {
                if (p.itens && p.itens.some(i => i.produtoId === id)) {
                    produtoPedidos++;
                }
            });
            if (produtoPedidos > 0) {
                return {
                    podeExcluir: false,
                    mensagem: `Não é possível excluir! Este produto está presente em ${produtoPedidos} pedidos.`
                };
            }
            break;
    }

    return { podeExcluir: true, mensagem: '' };
}

function confirmarExclusao(tipo, id, nome) {
    if (currentUser.role !== 'admin') {
        showNotification('Somente administradores podem excluir registros!', 'error');
        return;
    }

    // Verificar dependências
    const dependencias = verificarDependenciasExclusao(tipo, id);

    if (!dependencias.podeExcluir) {
        showNotification(dependencias.mensagem, 'error');
        return;
    }

    itemParaExcluir = { tipo, id: Number(id), nome: nome.replace(/\\'/g, "'") };

    const modal = document.getElementById('modalConfirmacao');
    modal.classList.remove('hidden');

    document.getElementById('confirmacaoMensagem').textContent =
        `Tem certeza que deseja excluir este ${getNomeTipo(tipo).toLowerCase()}?`;
    document.getElementById('confirmacaoDetalhes').textContent =
        `${itemParaExcluir.nome} (ID: ${itemParaExcluir.id})`;
}

function fecharModalConfirmacao() {
    const modal = document.getElementById('modalConfirmacao');
    if (modal) {
        modal.classList.add('hidden');
        itemParaExcluir = null;
    }
}

function confirmarExclusao() {
    if (!itemParaExcluir || currentUser.role !== 'admin') {
        showNotification('Permissão negada ou item inválido!', 'error');
        fecharModalConfirmacao();
        return;
    }

    const { tipo, id, nome } = itemParaExcluir;

    try {
        // Verificar dependências novamente
        const dependencias = verificarDependenciasExclusao(tipo, id);
        if (!dependencias.podeExcluir) {
            showNotification(dependencias.mensagem, 'error');
            fecharModalConfirmacao();
            return;
        }

        // Realizar exclusão
        const tableName = tipo === 'cliente' ? 'clientes' : tipo === 'produto' ? 'produtos' : 'vendedores';
        const db = getDB(tableName);
        const novosDados = db.filter(item => item.id !== id);

        if (setDB(tableName, novosDados)) {
            registrarLog('delete', `${getNomeTipo(tipo)} excluído: ${nome}`);

            // Atualizar interface
            switch (tipo) {
                case 'cliente':
                    renderClientes();
                    carregarSelects();
                    renderDashboard();
                    break;
                case 'produto':
                    renderProdutos();
                    carregarSelects();
                    renderDashboard();
                    break;
                case 'vendedor':
                    renderVendedores();
                    carregarSelects();
                    break;
            }

            fecharModalConfirmacao();
            showNotification(`${getNomeTipo(tipo)} excluído com sucesso!`, 'success');
        } else {
            showNotification('Erro ao excluir registro!', 'error');
        }

    } catch (error) {
        console.error('Erro ao excluir:', error);
        showNotification('Erro ao excluir registro!', 'error');
        fecharModalConfirmacao();
    }
}

// ==========================
// FUNÇÕES DE RELATÓRIOS
// ==========================
function gerarRelatorioVendas() {
    const pedidos = getDB("pedidos");
    const hoje = new Date().toISOString().split('T')[0];

    const pedidosHoje = pedidos.filter(p => p.data.startsWith(hoje));
    const pedidosFechadosHoje = pedidosHoje.filter(p => p.status === 'FECHADO');
    const vendasHoje = pedidosFechadosHoje.reduce((sum, p) => sum + p.total, 0);

    const resultado = document.getElementById("resultadoRelatorios");
    resultado.innerHTML = `
        <div class="card">
            <strong><i class="fas fa-chart-bar"></i> Relatório de Vendas Diárias</strong>
            <span><i class="fas fa-calendar"></i> Data: ${new Date().toLocaleDateString()}</span>
            <span><i class="fas fa-file-invoice"></i> Total de Pedidos Hoje: ${pedidosHoje.length}</span>
            <span><i class="fas fa-check-circle"></i> Pedidos Fechados: ${pedidosFechadosHoje.length}</span>
            <span><i class="fas fa-dollar-sign"></i> Valor Total: R$ ${vendasHoje.toFixed(2)}</span>
        </div>
    `;
}

function gerarRelatorioClientes() {
    const clientes = getDB("clientes");
    const pedidos = getDB("pedidos");

    const clientesAtivos = clientes.filter(c => {
        const temPedido = pedidos.some(p => p.clienteId === c.id);
        return temPedido && c.status === 'ATIVO';
    });

    const clientesInativos = clientes.filter(c => c.status === 'INATIVO');

    const resultado = document.getElementById("resultadoRelatorios");
    resultado.innerHTML = `
        <div class="card">
            <strong><i class="fas fa-users"></i> Relatório de Clientes</strong>
            <span><i class="fas fa-users"></i> Total de Clientes: ${clientes.length}</span>
            <span><i class="fas fa-user-check"></i> Clientes Ativos com Pedidos: ${clientesAtivos.length}</span>
            <span><i class="fas fa-user-times"></i> Clientes Inativos: ${clientesInativos.length}</span>
            <span><i class="fas fa-chart-pie"></i> Taxa de Atividade: ${clientes.length > 0 ? ((clientesAtivos.length / clientes.length) * 100).toFixed(1) : 0}%</span>
        </div>
    `;
}

function gerarRelatorioProdutos() {
    const produtos = getDB("produtos");
    const baixoEstoque = produtos.filter(p => p.estoque < 10 && p.estoque > 0);
    const semEstoque = produtos.filter(p => p.estoque === 0);
    const emEstoque = produtos.filter(p => p.estoque >= 10);

    const valorTotalEstoque = produtos.reduce((sum, p) => sum + (p.preco * p.estoque), 0);

    const resultado = document.getElementById("resultadoRelatorios");
    resultado.innerHTML = `
        <div class="card">
            <strong><i class="fas fa-box"></i> Relatório de Estoque</strong>
            <span><i class="fas fa-boxes"></i> Total de Produtos: ${produtos.length}</span>
            <span><i class="fas fa-check-circle"></i> Produtos com estoque bom (≥10): ${emEstoque.length}</span>
            <span><i class="fas fa-exclamation-triangle"></i> Produtos com baixo estoque (<10): ${baixoEstoque.length}</span>
            <span><i class="fas fa-times-circle"></i> Produtos sem estoque: ${semEstoque.length}</span>
            <span><i class="fas fa-dollar-sign"></i> Valor Total em Estoque: R$ ${valorTotalEstoque.toFixed(2)}</span>
        </div>
    `;
}

function gerarRelatorioVendedores() {
    const vendedores = getDB("vendedores");
    const pedidos = getDB("pedidos");

    const vendedoresComVendas = vendedores.map(v => {
        const vendasVendedor = pedidos
            .filter(p => p.vendedorId === v.id && p.status === 'FECHADO')
            .reduce((sum, p) => sum + p.total, 0);

        return {
            nome: v.nome,
            comissao: v.comissao || 5,
            totalVendas: vendasVendedor,
            comissaoTotal: vendasVendedor * (v.comissao || 5) / 100
        };
    }).filter(v => v.totalVendas > 0);

    let html = '<div class="card"><strong><i class="fas fa-user-tie"></i> Desempenho dos Vendedores</strong>';

    if (vendedoresComVendas.length === 0) {
        html += '<span><i class="fas fa-info-circle"></i> Nenhum vendedor com vendas registradas</span>';
    } else {
        vendedoresComVendas.sort((a, b) => b.totalVendas - a.totalVendas).forEach(v => {
            html += `
                <span><i class="fas fa-user"></i> ${v.nome}: R$ ${v.totalVendas.toFixed(2)} (Comissão: R$ ${v.comissaoTotal.toFixed(2)})</span>
            `;
        });
    }

    html += '</div>';

    document.getElementById("resultadoRelatorios").innerHTML = html;
}

// ==========================
// FUNÇÕES DE EXPORTAÇÃO
// ==========================
function exportarClientes() {
    const clientes = getDB("clientes");
    const csv = [
        ['ID', 'Nome', 'Email', 'Telefone', 'Data Cadastro', 'Status'],
        ...clientes.map(c => [
            c.id,
            c.nome,
            c.email,
            c.telefone || '',
            new Date(c.dataCadastro).toLocaleDateString(),
            c.status
        ])
    ].map(row => row.join(';')).join('\n');

    downloadCSV(csv, 'clientes.csv');
    registrarLog('export', 'Exportação CSV de clientes');
    showNotification('Clientes exportados com sucesso!', 'success');
}

function exportarClientesExcel() {
    exportarClientes();
}

function exportarPedidos() {
    const pedidos = getDB("pedidos");
    const csv = [
        ['ID', 'Cliente', 'Vendedor', 'Data', 'Status', 'Total', 'Itens'],
        ...pedidos.map(p => [
            p.id,
            p.clienteNome || '',
            p.vendedorNome || '',
            new Date(p.data).toLocaleDateString(),
            p.status,
            p.total.toFixed(2),
            p.itens ? p.itens.map(i => `${i.nome} (${i.qtd}x)`).join(', ') : ''
        ])
    ].map(row => row.join(';')).join('\n');

    downloadCSV(csv, 'pedidos.csv');
    registrarLog('export', 'Exportação CSV de pedidos');
    showNotification('Pedidos exportados com sucesso!', 'success');
}

function exportarLogs() {
    const logs = getDB("logs");
    const csv = [
        ['ID', 'Data/Hora', 'Usuário', 'Perfil', 'Ação', 'Detalhes', 'IP'],
        ...logs.map(l => [
            l.id,
            new Date(l.timestamp).toLocaleString(),
            l.usuario,
            l.role,
            l.acao,
            l.detalhes,
            l.ip
        ])
    ].map(row => row.join(';')).join('\n');

    downloadCSV(csv, 'logs_auditoria.csv');
    registrarLog('export', 'Exportação CSV de logs');
    showNotification('Logs exportados com sucesso!', 'success');
}

function exportarRelatorioExcel() {
    const activeTab = document.querySelector('.tab-content.active').id;

    switch (activeTab) {
        case 'relatorios':
            // Exportar o relatório atual
            const relatorio = document.getElementById('resultadoRelatorios').innerText;
            const blob = new Blob([relatorio], { type: 'text/plain' });
            downloadFile(blob, 'relatorio.txt');
            break;
        default:
            showNotification('Nenhum relatório para exportar!', 'error');
    }
}

function downloadCSV(content, filename) {
    const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
    downloadFile(blob, filename);
}

function downloadFile(blob, filename) {
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// ==========================
// FUNÇÕES AUXILIARES
// ==========================
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function getNomeTipo(tipo) {
    const tipos = {
        'cliente': 'Cliente',
        'produto': 'Produto',
        'vendedor': 'Vendedor'
    };
    return tipos[tipo] || 'Registro';
}

function showNotification(message, type = 'info') {
    const container = document.getElementById('notificacoes');
    if (!container) return;
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;

    // Adicionar ícone baseado no tipo
    let icon = 'info-circle';
    switch (type) {
        case 'success': icon = 'check-circle'; break;
        case 'error': icon = 'exclamation-circle'; break;
        case 'warning': icon = 'exclamation-triangle'; break;
        default: icon = 'info-circle';
    }

    notification.innerHTML = `<i class="fas fa-${icon}"></i> ${message}`;

    container.appendChild(notification);

    // Remover após 5 segundos
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 500);
    }, 5000);
}

// ==========================
// INIT
// ==========================
function renderAll() {
    renderClientes();
    renderVendedores();
    renderProdutos();
    renderPedidos();
    renderDashboard();
    carregarSelects();
    renderLogs();
}