const express = require('express');
const mysql = require('mysql2');
const path = require('path');

const app = express();
require('dotenv').config();
const PORT = process.env.PORT
const BASEPATH = process.env.BASEPATH || '';

// MySQL connection pool
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    connectionLimit: 10
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API search endpoint (FULLTEXT)
app.get('${BASEPATH}/api/search', (req, res) => {
    const keyword = req.query.q || '';
    const kabupaten = req.query.kabupaten || '';

    let sql = `
    SELECT *,
    ${keyword ? 'MATCH(nama_kk) AGAINST(? IN NATURAL LANGUAGE MODE) AS score' : '0 AS score'}
    FROM hasil_match_regsosek
    WHERE 1=1
  `;

    const params = [];

    // FULLTEXT hanya kalau ada keyword
    if (keyword) {
        sql += ` AND MATCH(nama_kk) AGAINST(? IN NATURAL LANGUAGE MODE)`;
        params.push(keyword, keyword); // 2x karena dipakai di SELECT & WHERE
    }

    // Filter kabupaten
    if (kabupaten) {
        sql += ` AND kode_kabupaten = ?`;
        params.push(kabupaten);
    }

    sql += ` ORDER BY score DESC LIMIT 20`;

    db.query(sql, params, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// Serve frontend
app.get('${BASEPATH}/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));