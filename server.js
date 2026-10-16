const express = require('express');
const session = require('express-session');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
    secret: 'super-secret-key-change-this',
    resave: false,
    saveUninitialized: true
}));

const db = new sqlite3.Database(path.join(__dirname, 'timeclock.db'), (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        db.run(`CREATE TABLE IF NOT EXISTS employees (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pin TEXT UNIQUE,
            name TEXT,
            role TEXT,
            needsPinSetup INTEGER,
            monStart TEXT DEFAULT '08:00', monEnd TEXT DEFAULT '17:00',
            tueStart TEXT DEFAULT '08:00', tueEnd TEXT DEFAULT '17:00',
            wedStart TEXT DEFAULT '08:00', wedEnd TEXT DEFAULT '17:00',
            thuStart TEXT DEFAULT '08:00', thuEnd TEXT DEFAULT '17:00',
            friStart TEXT DEFAULT '08:00', friEnd TEXT DEFAULT '17:00',
            satStart TEXT DEFAULT '08:00', satEnd TEXT DEFAULT '17:00',
            sunStart TEXT DEFAULT '08:00', sunEnd TEXT DEFAULT '17:00'
        )`, () => {
            db.get(`SELECT COUNT(*) as count FROM employees`, (err, row) => {
                if (row.count === 0) {
                    const defaultUsers = [
                        ["1111", "Amber Thompson", "employee", 1],
                        ["2222", "Brandon Hall", "employee", 1],
                        ["3333", "Dylan Johnsey", "employee", 1],
                        ["4444", "Ellie Dorey", "employee", 1],
                        ["5555", "Hope Neel", "employee", 1],
                        ["6666", "Jack Anderson", "employee", 1],
                        ["7777", "Jack Campbell", "employee", 1],
                        ["8888", "Jake Peterson", "employee", 1],
                        ["3131", "Madyson Mazzola", "employee", 1],
                        ["0000", "Michael Hickman", "employee", 1],
                        ["1234", "Paige Johnsey", "employee", 1],
                        ["2345", "William Robison", "employee", 1],
                        ["3456", "Zach Jeffery", "employee", 1],
                        ["4567", "Zach Smith", "employee", 1],
                        ["9999", "Brandon Hall", "manager", 0]
                    ];
                    const stmt = db.prepare(`INSERT INTO employees (pin, name, role, needsPinSetup) VALUES (?, ?, ?, ?)`);
                    defaultUsers.forEach(u => stmt.run(u));
                    stmt.finalize();
                    console.log('Seeded employees with default weekly schedules.');
                }
            });
        });
    }
});

app.get('/api/employees', (req, res) => {
    db.all(`SELECT * FROM employees`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/employees/add', requireAuth, (req, res) => {
    const { name, pin } = req.body;
    db.run(`INSERT INTO employees (pin, name, role, needsPinSetup) VALUES (?, ?, 'employee', 1)`, 
    [pin, name], function(err) {
        if (err) return res.status(400).json({ error: "PIN already in use." });
        res.json({ success: true, id: this.lastID });
    });
});

app.post('/api/employees/reset-pin', requireAuth, (req, res) => {
    const { id, newPin } = req.body;
    db.run(`UPDATE employees SET pin = ?, needsPinSetup = 1 WHERE id = ?`, [newPin, id], function(err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ success: true });
    });
});

app.post('/api/employees/update-pin', (req, res) => {
    const { id, pin } = req.body;
    db.run(`UPDATE employees SET pin = ?, needsPinSetup = 0 WHERE id = ?`, [pin, id], function(err) {
        if (err) return res.status(400).json({ error: "PIN already taken." });
        res.json({ success: true });
    });
});

app.post('/api/employees/schedule', requireAuth, (req, res) => {
    const { id, monStart, monEnd, tueStart, tueEnd, wedStart, wedEnd, thuStart, thuEnd, friStart, friEnd, satStart, satEnd, sunStart, sunEnd } = req.body;
    db.run(`UPDATE employees SET monStart=?, monEnd=?, tueStart=?, tueEnd=?, wedStart=?, wedEnd=?, thuStart=?, thuEnd=?, friStart=?, friEnd=?, satStart=?, satEnd=?, sunStart=?, sunEnd=? WHERE id=?`,
    [monStart, monEnd, tueStart, tueEnd, wedStart, wedEnd, thuStart, thuEnd, friStart, friEnd, satStart, satEnd, sunStart, sunEnd, id], function(err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ success: true });
    });
});

app.post('/api/employees/delete', requireAuth, (req, res) => {
    const { id } = req.body;
    db.run(`DELETE FROM employees WHERE id = ?`, [id], function(err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ success: true });
    });
});

function requireAuth(req, res, next) {
    if (req.session && req.session.isAdmin) return next();
    res.redirect('/login.html');
}

app.get('/login.html', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));
app.post('/login', (req, res) => {
    const { password } = req.body;
    if (password === 'password1234') { // Change to your password if needed
        req.session.isAdmin = true;
        res.redirect('/admin.html');
    } else {
        res.send('Incorrect password. <a href="/login.html">Try again</a>');
    }
});

app.get(['/admin.html', '/Admin.html'], requireAuth, (req, res) => res.sendFile(path.join(__dirname, 'Admin.html')));
app.use(express.static(__dirname, { index: ['index.html'] }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));