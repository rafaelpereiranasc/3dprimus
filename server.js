const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());

// Servir arquivos estáticos (HTML, CSS, JS) da pasta atual
app.use(express.static(path.join(__dirname)));

// Conexão com o Banco de Dados SQLite (arquivo na nuvem/servidor)
const dbFile = path.join(__dirname, 'primus_database.sqlite');
const db = new sqlite3.Database(dbFile, (err) => {
    if (err) {
        console.error('Erro ao abrir o banco de dados', err.message);
    } else {
        console.log('Conectado ao banco de dados SQLite com sucesso.');
    }
});

// Criação das tabelas caso não existam
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS os (
        id TEXT PRIMARY KEY,
        osNumber TEXT,
        client TEXT,
        phone TEXT,
        eqType TEXT,
        eqBrand TEXT,
        eqModel TEXT,
        eqSerial TEXT,
        item TEXT,
        checklistObj TEXT,
        checklistTextos TEXT,
        chkCustomText TEXT,
        tech TEXT,
        date TEXT,
        deadline TEXT,
        status TEXT,
        reportedDefect TEXT,
        diagnostic TEXT,
        executedService TEXT,
        laborCost REAL,
        partsCost REAL,
        total REAL,
        paid REAL,
        paymentMethod TEXT,
        notes TEXT,
        warrantyTerm TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS printers (
        id TEXT PRIMARY KEY,
        model TEXT,
        serial TEXT,
        supplier TEXT,
        client TEXT,
        date TEXT,
        initialHours INTEGER,
        notes TEXT,
        history TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        osNumber TEXT,
        client TEXT,
        phone TEXT,
        product TEXT,
        startDate TEXT,
        deadline TEXT,
        status TEXT,
        financialStatus TEXT,
        responsible TEXT,
        total REAL,
        cost REAL,
        paid REAL,
        paymentMethod TEXT,
        notes TEXT
    )`);
});

// --- ROTAS DA API PARA ORDENS DE SERVIÇO (OS) ---
app.get('/api/os', (req, res) => {
    db.all("SELECT * FROM os", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        rows.forEach(r => {
            try { r.checklistObj = JSON.parse(r.checklistObj || '{}'); } catch(e){r.checklistObj={};}
            try { r.checklistTextos = JSON.parse(r.checklistTextos || '[]'); } catch(e){r.checklistTextos=[];}
        });
        res.json(rows);
    });
});

app.post('/api/os', (req, res) => {
    const o = req.body;
    const query = `INSERT OR REPLACE INTO os VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
    const params = [
        o.id, o.osNumber, o.client, o.phone, o.eqType, o.eqBrand, o.eqModel, o.eqSerial, o.item,
        JSON.stringify(o.checklistObj || {}), JSON.stringify(o.checklistTextos || []), o.chkCustomText,
        o.tech, o.date, o.deadline, o.status, o.reportedDefect, o.diagnostic, o.executedService,
        o.laborCost, o.partsCost, o.total, o.paid, o.paymentMethod, o.notes, o.warrantyTerm
    ];
    db.run(query, params, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, id: o.id });
    });
});

app.delete('/api/os/:id', (req, res) => {
    db.run("DELETE FROM os WHERE id = ?", req.params.id, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// --- ROTAS DA API PARA IMPRESSORAS (CONTROLE) ---
app.get('/api/printers', (req, res) => {
    db.all("SELECT * FROM printers", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        rows.forEach(r => {
            try { r.history = JSON.parse(r.history || '[]'); } catch(e){r.history=[];}
        });
        res.json(rows);
    });
});

app.post('/api/printers', (req, res) => {
    const p = req.body;
    const query = `INSERT OR REPLACE INTO printers VALUES (?,?,?,?,?,?,?,?,?)`;
    const params = [
        p.id, p.model, p.serial, p.supplier, p.client, p.date, p.initialHours, p.notes, JSON.stringify(p.history || [])
    ];
    db.run(query, params, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, id: p.id });
    });
});

app.delete('/api/printers/:id', (req, res) => {
    db.run("DELETE FROM printers WHERE id = ?", req.params.id, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// Inicialização do Servidor na porta definida pelo Render ou 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor 3D Primus rodando na porta ${PORT}`);
});