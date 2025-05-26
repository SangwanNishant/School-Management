const express = require('express');
const mysql = require('mysql2');
const app = express();
app.use(express.json());

// Database connection (Railway will auto-inject credentials)
const db = mysql.createConnection({
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  port: process.env.MYSQLPORT
});

// Create schools table if not exists
db.query(`
  CREATE TABLE IF NOT EXISTS schools (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address VARCHAR(255) NOT NULL,
    latitude FLOAT NOT NULL,
    longitude FLOAT NOT NULL
  )
`);

// Add School
app.post('/addSchool', (req, res) => {
  const { name, address, latitude, longitude } = req.body;
  db.query(
    'INSERT INTO schools (name, address, latitude, longitude) VALUES (?, ?, ?, ?)',
    [name, address, latitude, longitude],
    (err) => res.status(err ? 500 : 200).json(err ? {error: "Failed to add school"} : {message: "School added"})
  );
});

// List Schools
app.get('/listSchools', (req, res) => {
  const { latitude, longitude } = req.query;
  db.query('SELECT * FROM schools', (err, schools) => {
    if (err) return res.status(500).json({error: "Database error"});
    res.json(schools.map(s => ({
      ...s,
      distance: Math.sqrt(Math.pow(s.latitude - latitude, 2) + Math.pow(s.longitude - longitude, 2))
    })).sort((a,b) => a.distance - b.distance));
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server running'));