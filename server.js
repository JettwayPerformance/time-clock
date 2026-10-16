const express = require('express');
const session = require('express-session');
const path = require('path');
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'super-secret-key-change-this',
    resave: false,
    saveUninitialized: true
}));

function requireAuth(req, res, next) {
    if (req.session && req.session.isAdmin) {
        return next();
    }
    res.redirect('/login.html');
}

app.get('/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

app.post('/login', (req, res) => {
    const { password } = req.body;
    // CHANGE YOUR PASSWORD HERE:
    if (password === 'A11aboutresuts!26') {
        req.session.isAdmin = true;
        res.redirect('/Admin.html');
    } else {
        res.send('Incorrect password. <a href="/login.html">Try again</a>');
    }
});

// Protect BOTH lowercase and uppercase admin URLs
app.get(['/admin.html', '/Admin.html'], requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'Admin.html'));
});

// Prevent direct static access to Admin.html without going through the route
app.use(express.static(__dirname, {
    index: ['index.html'] // ensures static server doesn't blindly hand out Admin.html
}));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));