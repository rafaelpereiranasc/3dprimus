const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// Conexão com o PostgreSQL do Render
const pool = new Pool({
    connectionString: "postgresql://db_3d_primus_db_user:95zbjxWGXPv9xoZML2Sd2KchsNxKEcVJ@dpg-dbah27ijnfac73fmgg20-a/db_3d_primus_db",
    ssl: {
        rejectUnauthorized: false
    }
});

// Inicialização das tabelas no PostgreSQL
async function initDB() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS os (
                id SERIAL PRIMARY KEY,
                os_number TEXT,
                client TEXT,
                phone TEXT,
                item TEXT,
                reported_defect TEXT,
                date TEXT,
                deadline TEXT,
                status TEXT,
                labor_cost REAL,
                parts_cost REAL,
                total REAL,
                paid REAL,
                executed_service TEXT,
                warranty_term TEXT,
                checklist_json TEXT
            );
        `);
        console.log("Banco PostgreSQL conectado e tabelas verificadas com sucesso!");
    } catch (err) {
        console.error("Erro ao inicializar o banco PostgreSQL:", err);
    }
}
initDB();

// --- ROTAS DA API (OS) ---

// Listar todas as OS
app.get('/api/os', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM os ORDER BY id DESC');
        const formatted = result.rows.map(row => ({
            id: row.id.toString(),
            osNumber: row.os_number,
            client: row.client,
            phone: row.phone,
            item: row.item,
            reportedDefect: row.reported_defect,
            date: row.date,
            deadline: row.deadline,
            status: row.status,
            laborCost: row.labor_cost,
            partsCost: row.parts_cost,
            total: row.total,
            paid: row.paid,
            executedService: row.executed_service,
            warrantyTerm: row.warranty_term,
            checklistTextos: row.checklist_json ? JSON.parse(row.checklist_json) : []
        }));
        res.json(formatted);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erro ao buscar ordens de serviço" });
    }
});

// Criar ou Atualizar OS
app.post('/api/os', async (req, res) => {
    const data = req.body;
    try {
        const checklistStr = data.checklistTextos ? JSON.stringify(data.checklistTextos) : '[]';
        
        if (data.id) {
            await pool.query(`
                UPDATE os SET 
                    os_number = $1, client = $2, phone = $3, item = $4, reported_defect = $5, 
                    date = $6, deadline = $7, status = $8, labor_cost = $9, parts_cost = $10, 
                    total = $11, paid = $12, executed_service = $13, warranty_term = $14, checklist_json = $15
                WHERE id = $16
            `, [
                data.osNumber, data.client, data.phone, data.item, data.reportedDefect,
                data.date, data.deadline, data.status, data.laborCost || 0, data.partsCost || 0,
                data.total || 0, data.paid || 0, data.executedService, data.warrantyTerm,
                checklistStr, parseInt(data.id)
            ]);
            res.json({ success: true, id: data.id });
        } else {
            const result = await pool.query(`
                INSERT INTO os (
                    os_number, client, phone, item, reported_defect, date, deadline, 
                    status, labor_cost, parts_cost, total, paid, executed_service, warranty_term, checklist_json
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                RETURNING id;
            `, [
                data.osNumber, data.client, data.phone, data.item, data.reportedDefect,
                data.date, data.deadline, data.status || 'Em Andamento', data.laborCost || 0, 
                data.partsCost || 0, data.total || 0, data.paid || 0, data.executedService, 
                data.warrantyTerm, checklistStr
            ]);
            res.json({ success: true, id: result.rows[0].id.toString() });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erro ao salvar ordem de serviço" });
    }
});

// Excluir OS
app.delete('/api/os/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM os WHERE id = $1', [parseInt(req.params.id)]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erro ao excluir ordem de serviço" });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor 3D Primus rodando na porta ${PORT} com PostgreSQL`);
});
