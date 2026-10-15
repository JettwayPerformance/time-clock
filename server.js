const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Initialize SQLite Database
const db = new sqlite3.Database('./timeclock.db', (err) => {
    if (err) console.error('Database opening error: ', err.message);
    else console.log('Connected to SQLite database.');
});

// Create Tables if they don't exist
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pin TEXT UNIQUE,
        name TEXT,
        role TEXT,
        allowedStart TEXT,
        allowedEnd TEXT,
        needsPinSetup BOOLEAN
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS time_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        qbClass TEXT,
        clockIn TEXT,
        clockOut TEXT,
        hoursDecimal REAL,
        override BOOLEAN,
        manager TEXT
    )`);

    // Seed default users if table is empty
    db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
        if (row.count === 0) {
            const initialUsers = [
                ["1111", "Amber Thompson", "employee", "08:00", "17:00", 1],
                ["2222", "Brandon Hall", "employee", "08:00", "17:00", 1],
                ["3333", "Dylan Johnsey", "employee", "08:00", "17:00", 1],
                ["4444", "Ellie Dorey", "employee", "08:00", "17:00", 1],
                ["5555", "Hope Neel", "employee", "08:00", "17:00", 1],
                ["6666", "Jack Anderson", "employee", "08:00", "17:00", 1],
                ["7777", "Jack Campbell", "employee", "08:00", "17:00", 1],
                ["8888", "Jake Peterson", "employee", "08:00", "17:00", 1],
                ["3131", "Madyson Mazzola", "employee", "08:00", "17:00", 1],
                ["0000", "Michael Hickman", "employee", "08:00", "17:00", 1],
                ["1234", "Paige Johnsey", "employee", "08:00", "17:00", 1],
                ["2345", "William Robison", "employee", "08:00", "17:00", 1],
                ["3456", "Zach Jeffery", "employee", "08:00", "17:00", 1],
                ["4567", "Zach Smith", "employee", "08:00", "17:00", 1],
                ["9999", "Brandon Hall", "manager", "00:00", "23:59", 0]
            ];
            
            const stmt = db.prepare("INSERT INTO users (pin, name, role, allowedStart, allowedEnd, needsPinSetup) VALUES (?, ?, ?, ?, ?, ?)");
            initialUsers.forEach(u => stmt.run(u));
            stmt.finalize();
            console.log("Default users seeded.");
        }
    });
});

// API: Get Users
app.get('/api/users', (req, res) => {
    db.all("SELECT * FROM users", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// API: Update User PIN & Setup status
app.post('/api/users/update-pin', (req, res) => {
    const { name, newPin } = req.body;
    db.run(`UPDATE users SET pin = ?, needsPinSetup = 0 WHERE name = ?`, [newPin, name], function(err) {
        if (err) return res.status(400).json({ error: "PIN already in use or invalid." });
        res.json({ success: true });
    });
});

// API: Get Time Logs
app.get('/api/logs', (req, res) => {
    db.all("SELECT * FROM time_logs ORDER BY clockIn DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// API: Create or Clock Out / Clock In
app.post('/api/logs/punch', (req, res) => {
    const { name, qbClass, override, manager } = req.body;
    
    db.get(`SELECT * FROM time_logs WHERE name = ? AND clockOut IS NULL`, [name], (err, activeEntry) => {
        if (err) return res.status(500).json({ error: err.message });

        if (activeEntry) {
            // Clock Out
            const clockOutTime = new Date().toISOString();
            const start = new Date(activeEntry.clockIn);
            const end = new Date(clockOutTime);
            const hours = parseFloat(((end - start) / (1000 * 60 * 60)).toFixed(2));

            db.run(`UPDATE time_logs SET clockOut = ?, hoursDecimal = ? WHERE id = ?`, 
                [clockOutTime, hours, activeEntry.id], function(err) {
                    if (err) return res.status(500).json({ error: err.message });
                    res.json({ action: 'clockOut', hoursDecimal: hours, clockOut: clockOutTime });
                });
        } else {
            // Clock In
            const clockInTime = new Date().toISOString();
            db.run(`INSERT INTO time_logs (name, qbClass, clockIn, clockOut, hoursDecimal, override, manager) VALUES (?, ?, ?, NULL, 0, ?, ?)`,
                [name, qbClass, clockInTime, override ? 1 : 0, manager || ''], function(err) {
                    if (err) return res.status(500).json({ error: err.message });
                    res.json({ action: 'clockIn', clockIn: clockInTime });
                });
        }
    });
});

// API: Admin Edit Log
app.put('/api/logs/:id', (req, res) => {
    const { id } = req.params;
    const { name, qbClass, clockIn, clockOut } = req.body;
    
    let hoursDecimal = 0;
    if (clockOut) {
        const diffMs = new Date(clockOut) - new Date(clockIn);
        hoursDecimal = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));
    }

    db.run(`UPDATE time_logs SET name = ?, qbClass = ?, clockIn = ?, clockOut = ?, hoursDecimal = ? WHERE id = ?`,
        [name, qbClass, clockIn, clockOut || null, hoursDecimal, id], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        });
});

// API: Admin Delete Log
app.delete('/api/logs/:id', (req, res) => {
    const { id } = req.params;
    db.run(`DELETE FROM time_logs WHERE id = ?`, [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// API: Admin Wipe All Logs
app.delete('/api/logs', (req, res) => {
    db.run(`DELETE FROM time_logs`, [], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.listen(PORT, () => {
    console.log(`Time Clock Server running on http://localhost:${PORT}`);
});