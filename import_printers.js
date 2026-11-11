const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
    connectionString: "postgresql://db_3d_primus_db_user:95zbjxWGXPv9xoZML2Sd2KchsNxKEcVJ@dpg-dbah27ijnfac73fmgg20-a/db_3d_primus_db",
    ssl: { rejectUnauthorized: false }
});

async function importPrinters() {
    try {
        const rawdata = fs.readFileSync('printers_import.json', 'utf8');
        const printers = JSON.parse(rawdata);
        
        console.log(`Iniciando importação de ${printers.length} impressoras...`);

        for (let p of printers) {
            await pool.query(
                `INSERT INTO printers_v4 (model, serial, supplier, client, contact, valor, date, initial_hours, notes, history_json) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, 0, $8, '[]')`,
                [p.model, p.serial || '', p.supplier || '', p.client, p.contact || '', p.valor || 0, p.date, p.notes]
            );
        }

        console.log("Todas as 78 impressoras foram importadas com sucesso para o PostgreSQL!");
        process.exit(0);
    } catch (err) {
        console.error("Erro na importação:", err);
        process.exit(1);
    }
}

importPrinters();