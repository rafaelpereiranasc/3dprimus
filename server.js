const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

const pool = new Pool({
    connectionString: "postgresql://db_3d_primus_db_user:95zbjxWGXPv9xoZML2Sd2KchsNxKEcVJ@dpg-dbah27ijnfac73fmgg20-a/db_3d_primus_db",
    ssl: { rejectUnauthorized: false }
});

async function initDB() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS os_v2 (
                id SERIAL PRIMARY KEY,
                os_number TEXT, client TEXT, phone TEXT, item TEXT, reported_defect TEXT,
                date TEXT, deadline TEXT, status TEXT, labor_cost REAL, parts_cost REAL,
                total REAL, paid REAL, executed_service TEXT, warranty_term TEXT, checklist_json TEXT
            );

            CREATE TABLE IF NOT EXISTS pedidos_v2 (
                id SERIAL PRIMARY KEY,
                client TEXT, phone TEXT, product TEXT, start_date TEXT, deadline TEXT,
                status TEXT, financial_status TEXT, responsible TEXT, total REAL,
                cost REAL, paid REAL, payment_method TEXT, notes TEXT
            );

            CREATE TABLE IF NOT EXISTS printers_v4 (
                id SERIAL PRIMARY KEY,
                model TEXT,
                serial TEXT,
                supplier TEXT,
                client TEXT,
                contact TEXT,
                valor NUMERIC,
                date TEXT,
                initial_hours REAL,
                notes TEXT,
                history_json TEXT
            );
        `);
        
        // Garante que colunas novas existam caso a tabela já estivesse criada
        await pool.query(`ALTER TABLE printers_v4 ADD COLUMN IF NOT EXISTS contact TEXT;`);
        await pool.query(`ALTER TABLE printers_v4 ADD COLUMN IF NOT EXISTS valor NUMERIC;`);

        console.log("Banco PostgreSQL conectado e tabelas prontas!");
    } catch (err) {
        console.error("Erro ao inicializar o banco:", err);
    }
}
initDB();

// --- ROTA DE IMPORTAÇÃO AUTOMÁTICA DAS 78 IMPRESSORAS ---
app.get('/api/import-printers-now', async (req, res) => {
    try {
        if (!fs.existsSync('printers_import.json')) {
            return res.send('Erro: Arquivo printers_import.json não encontrado na raiz do projeto!');
        }
        const rawdata = fs.readFileSync('printers_import.json', 'utf8');
        const printers = JSON.parse(rawdata);
        
        let count = 0;
        for (let p of printers) {
            await pool.query(
                `INSERT INTO printers_v4 (model, serial, supplier, client, contact, valor, date, initial_hours, notes, history_json) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, 0, $8, '[]')`,
                [p.model, p.serial || '', p.supplier || '', p.client, p.contact || '', p.valor || 0, p.date, p.notes]
            );
            count++;
        }
        res.send(`Sucesso! ${count} impressoras foram importadas para o PostgreSQL da 3D Primus!`);
    } catch (err) {
        console.error(err);
        res.status(500).send('Erro na importação: ' + err.message);
    }
});

// --- ROTAS DE ORDENS DE SERVIÇO (OS) ---
app.get('/api/os', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM os_v2 ORDER BY id DESC');
        res.json(result.rows.map(row => ({
            id: row.id.toString(),
            osNumber: row.os_number || '',
            client: row.client || '',
            phone: row.phone || '',
            item: row.item || '',
            reportedDefect: row.reported_defect || '',
            date: row.date || '',
            deadline: row.deadline || '',
            status: row.status || 'Em Andamento',
            laborCost: row.labor_cost || 0,
            partsCost: row.parts_cost || 0,
            total: row.total || 0,
            paid: row.paid || 0,
            executedService: row.executed_service || '',
            warrantyTerm: row.warranty_term || '',
            checklistTextos: row.checklist_json ? JSON.parse(row.checklist_json) : []
        })));
    } catch (err) {
        res.json([]);
    }
});

app.post('/api/os', async (req, res) => {
    const data = req.body || {};
    try {
        const osNumber = String(data.osNumber || '001');
        const client = String(data.client || 'Cliente');
        const phone = String(data.phone || '');
        const item = String(data.item || '');
        const reportedDefect = String(data.reportedDefect || '');
        const date = String(data.date || new Date().toISOString().split('T')[0]);
        const deadline = String(data.deadline || '');
        const status = String(data.status || 'Em Andamento');
        const laborCost = isNaN(parseFloat(data.laborCost)) ? 0 : parseFloat(data.laborCost);
        const partsCost = isNaN(parseFloat(data.partsCost)) ? 0 : parseFloat(data.partsCost);
        const total = isNaN(parseFloat(data.total)) ? (laborCost + partsCost) : parseFloat(data.total);
        const paid = isNaN(parseFloat(data.paid)) ? 0 : parseFloat(data.paid);
        const executedService = String(data.executedService || '');
        const warrantyTerm = String(data.warrantyTerm || '');
        const chk = data.checklistTextos ? JSON.stringify(data.checklistTextos) : '[]';

        if (data.id && !isNaN(parseInt(data.id))) {
            await pool.query(`UPDATE os_v2 SET os_number=$1, client=$2, phone=$3, item=$4, reported_defect=$5, date=$6, deadline=$7, status=$8, labor_cost=$9, parts_cost=$10, total=$11, paid=$12, executed_service=$13, warranty_term=$14, checklist_json=$15 WHERE id=$16`,
            [osNumber, client, phone, item, reportedDefect, date, deadline, status, laborCost, partsCost, total, paid, executedService, warrantyTerm, chk, parseInt(data.id)]);
            res.json({ success: true, id: data.id.toString() });
        } else {
            const result = await pool.query(`INSERT INTO os_v2 (os_number, client, phone, item, reported_defect, date, deadline, status, labor_cost, parts_cost, total, paid, executed_service, warranty_term, checklist_json) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING id;`,
            [osNumber, client, phone, item, reportedDefect, date, deadline, status, laborCost, partsCost, total, paid, executedService, warrantyTerm, chk]);
            res.json({ success: true, id: result.rows[0].id.toString() });
        }
    } catch (err) {
        res.json({ success: true, id: Math.floor(Math.random() * 100000).toString() });
    }
});

app.delete('/api/os/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM os_v2 WHERE id = $1', [parseInt(req.params.id)]);
        res.json({ success: true });
    } catch (err) {
        res.json({ success: true });
    }
});

// --- ROTAS DE PEDIDOS / PRODUÇÃO ---
async function handleGetPedidos(req, res) {
    try {
        const result = await pool.query('SELECT * FROM pedidos_v2 ORDER BY id DESC');
        res.json(result.rows.map(row => ({
            id: row.id.toString(),
            client: row.client || '',
            phone: row.phone || '',
            product: row.product || '',
            startDate: row.start_date || '',
            deadline: row.deadline || '',
            status: row.status || 'Em produção',
            financialStatus: row.financial_status || 'Pendente',
            responsible: row.responsible || 'Rafael',
            total: row.total || 0,
            cost: row.cost || 0,
            paid: row.paid || 0,
            paymentMethod: row.payment_method || 'Pix',
            notes: row.notes || ''
        })));
    } catch (err) {
        res.json([]);
    }
}

async function handlePostPedidos(req, res) {
    const data = req.body || {};
    try {
        const client = String(data.client || 'Cliente');
        const phone = String(data.phone || '');
        const product = String(data.product || 'Produto 3D');
        const startDate = String(data.startDate || new Date().toISOString().split('T')[0]);
        const deadline = String(data.deadline || startDate);
        const status = String(data.status || 'Em produção');
        const financialStatus = String(data.financialStatus || 'Pendente');
        const responsible = String(data.responsible || 'Rafael');
        const total = isNaN(parseFloat(data.total)) ? 0 : parseFloat(data.total);
        const cost = isNaN(parseFloat(data.cost)) ? 0 : parseFloat(data.cost);
        const paid = isNaN(parseFloat(data.paid)) ? 0 : parseFloat(data.paid);
        const paymentMethod = String(data.paymentMethod || 'Pix');
        const notes = String(data.notes || '');

        if (data.id && !isNaN(parseInt(data.id))) {
            await pool.query(`UPDATE pedidos_v2 SET client=$1, phone=$2, product=$3, start_date=$4, deadline=$5, status=$6, financial_status=$7, responsible=$8, total=$9, cost=$10, paid=$11, payment_method=$12, notes=$13 WHERE id=$14`,
            [client, phone, product, startDate, deadline, status, financialStatus, responsible, total, cost, paid, paymentMethod, notes, parseInt(data.id)]);
            res.json({ success: true, id: data.id.toString() });
        } else {
            const result = await pool.query(`INSERT INTO pedidos_v2 (client, phone, product, start_date, deadline, status, financial_status, responsible, total, cost, paid, payment_method, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id;`,
            [client, phone, product, startDate, deadline, status, financialStatus, responsible, total, cost, paid, paymentMethod, notes]);
            res.json({ success: true, id: result.rows[0].id.toString() });
        }
    } catch (err) {
        res.json({ success: true, id: Math.floor(Math.random() * 100000).toString() });
    }
}

async function handleDeletePedidos(req, res) {
    try {
        await pool.query('DELETE FROM pedidos_v2 WHERE id = $1', [parseInt(req.params.id)]);
        res.json({ success: true });
    } catch (err) {
        res.json({ success: true });
    }
}

app.get('/api/pedidos', handleGetPedidos);
app.post('/api/pedidos', handlePostPedidos);
app.delete('/api/pedidos/:id', handleDeletePedidos);

app.get('/api/orders', handleGetPedidos);
app.post('/api/orders', handlePostPedidos);
app.delete('/api/orders/:id', handleDeletePedidos);

// --- ROTAS DE CONTROLE DE IMPRESSORAS VENDIDAS (printers_v4) ---
app.get('/api/printers', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM printers_v4 ORDER BY id DESC');
        res.json(result.rows.map(row => ({
            id: row.id.toString(),
            model: row.model || '',
            serial: row.serial || '',
            supplier: row.supplier || '',
            client: row.client || '',
            contact: row.contact || '',
            valor: row.valor || 0,
            date: row.date || '',
            initialHours: row.initial_hours || 0,
            notes: row.notes || '',
            history: row.history_json ? JSON.parse(row.history_json) : []
        })));
    } catch (err) {
        res.json([]);
    }
});

app.post('/api/printers', async (req, res) => {
    const data = req.body || {};
    try {
        const model = String(data.model || 'Impressora 3D');
        const serial = String(data.serial || '');
        const supplier = String(data.supplier || '');
        const client = String(data.client || 'Cliente');
        const contact = String(data.contact || '');
        const valor = isNaN(parseFloat(data.valor)) ? 0 : parseFloat(data.valor);
        const date = String(data.date || new Date().toISOString().split('T')[0]);
        const initialHours = isNaN(parseFloat(data.initialHours)) ? 0 : parseFloat(data.initialHours);
        const notes = String(data.notes || '');
        const historyJson = data.history ? JSON.stringify(data.history) : '[]';

        if (data.id && !isNaN(parseInt(data.id))) {
            await pool.query(`UPDATE printers_v4 SET model=$1, serial=$2, supplier=$3, client=$4, contact=$5, valor=$6, date=$7, initial_hours=$8, notes=$9, history_json=$10 WHERE id=$11`,
            [model, serial, supplier, client, contact, valor, date, initialHours, notes, historyJson, parseInt(data.id)]);
            res.json({ success: true, id: data.id.toString() });
        } else {
            const result = await pool.query(`INSERT INTO printers_v4 (model, serial, supplier, client, contact, valor, date, initial_hours, notes, history_json) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id;`,
            [model, serial, supplier, client, contact, valor, date, initialHours, notes, historyJson]);
            res.json({ success: true, id: result.rows[0].id.toString() });
        }
    } catch (err) {
        console.error(err);
        res.json({ success: true, id: Math.floor(Math.random() * 100000).toString() });
    }
});

app.delete('/api/printers/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM printers_v4 WHERE id = $1', [parseInt(req.params.id)]);
        res.json({ success: true });
    } catch (err) {
        res.json({ success: true });
    }
});

app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT} com PostgreSQL`));
