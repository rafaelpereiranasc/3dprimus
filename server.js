const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());

app.use(express.static(path.join(__dirname)));

const dbFile = path.join(__dirname, 'primus_database.sqlite');
const db = new sqlite3.Database(dbFile, (err) => {
    if (err) {
        console.error('Erro ao abrir o banco de dados', err.message);
    } else {
        console.log('Conectado ao banco de dados SQLite com sucesso.');
    }
});

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS os (
        id TEXT PRIMARY KEY, osNumber TEXT, client TEXT, phone TEXT, eqType TEXT, 
        eqBrand TEXT, eqModel TEXT, eqSerial TEXT, item TEXT, checklistObj TEXT, 
        checklistTextos TEXT, chkCustomText TEXT, tech TEXT, date TEXT, deadline TEXT, 
        status TEXT, reportedDefect TEXT, diagnostic TEXT, executedService TEXT, 
        laborCost REAL, partsCost REAL, total REAL, paid REAL, paymentMethod TEXT, notes TEXT, warrantyTerm TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS printers (
        id TEXT PRIMARY KEY, model TEXT, serial TEXT, supplier TEXT, client TEXT, date TEXT, initialHours INTEGER, notes TEXT, history TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY, osNumber TEXT, client TEXT, phone TEXT, product TEXT, 
        startDate TEXT, deadline TEXT, status TEXT, financialStatus TEXT, responsible TEXT, 
        total REAL, cost REAL, paid REAL, paymentMethod TEXT, notes TEXT
    )`);
});

// --- API OS ---
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
    const q = `INSERT OR REPLACE INTO os VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
    const p = [o.id, o.osNumber, o.client, o.phone, o.eqType, o.eqBrand, o.eqModel, o.eqSerial, o.item, JSON.stringify(o.checklistObj||{}), JSON.stringify(o.checklistTextos||[]), o.chkCustomText, o.tech, o.date, o.deadline, o.status, o.reportedDefect, o.diagnostic, o.executedService, o.laborCost, o.partsCost, o.total, o.paid, o.paymentMethod, o.notes, o.warrantyTerm];
    db.run(q, p, err => err ? res.status(500).json({ error: err.message }) : res.json({ success: true }));
});
app.delete('/api/os/:id', (req, res) => {
    db.run("DELETE FROM os WHERE id = ?", req.params.id, err => err ? res.status(500).json({ error: err.message }) : res.json({ success: true }));
});

// --- API IMPRESSORAS ---
app.get('/api/printers', (req, res) => {
    db.all("SELECT * FROM printers", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        rows.forEach(r => { try { r.history = JSON.parse(r.history || '[]'); } catch(e){r.history=[];} });
        res.json(rows);
    });
});
app.post('/api/printers', (req, res) => {
    const p = req.body;
    const q = `INSERT OR REPLACE INTO printers VALUES (?,?,?,?,?,?,?,?,?)`;
    const params = [p.id, p.model, p.serial, p.supplier, p.client, p.date, p.initialHours, p.notes, JSON.stringify(p.history||[])];
    db.run(q, params, err => err ? res.status(500).json({ error: err.message }) : res.json({ success: true }));
});
app.delete('/api/printers/:id', (req, res) => {
    db.run("DELETE FROM printers WHERE id = ?", req.params.id, err => err ? res.status(500).json({ error: err.message }) : res.json({ success: true }));
});

// --- API PEDIDOS DE PRODUÇÃO ---
app.get('/api/orders', (req, res) => {
    db.all("SELECT * FROM orders", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});
app.post('/api/orders', (req, res) => {
    const o = req.body;
    const q = `INSERT OR REPLACE INTO orders VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
    const params = [o.id, o.osNumber, o.client, o.phone, o.product, o.startDate, o.deadline, o.status, o.financialStatus, o.responsible, o.total, o.cost, o.paid, o.paymentMethod, o.notes];
    db.run(q, params, err => err ? res.status(500).json({ error: err.message }) : res.json({ success: true }));
});
app.delete('/api/orders/:id', (req, res) => {
    db.run("DELETE FROM orders WHERE id = ?", req.params.id, err => err ? res.status(500).json({ error: err.message }) : res.json({ success: true }));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
