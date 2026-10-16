const express = require('express');
const session = require('express-session');
const path = require('path');
const app = express();

// Middleware to read form data and handle sessions
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'super-secret-key-change-this',
    resave: false,
    saveUninitialized: true
}));

// Simple password protection middleware
function requireAuth(req, res, next) {
    if (req.session && req.session.isAdmin) {
        return next();
    }
    res.redirect('/login.html');
}

// Serve your login page publicly
app.get('/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

// Handle login form submission
app.post('/login', (req, res) => {
    const { password } = req.body;
    // CHANGE YOUR PASSWORD HERE:
    if (password === 'A11aboutresults!26') {
        req.session.isAdmin = true;
        res.redirect('/Admin.html');
    } else {
        res.send('Incorrect password. <a href="/login.html">Try again</a>');
    }
});

// Protect your Admin.html page so nobody can access it directly
app.get('/Admin.html', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'Admin.html'));
});

// Serve your other normal static files (like index.html)
app.use(express.static(__dirname));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));