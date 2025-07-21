const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 8080;

// Serve only index.html at root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Serve static files from /dist/static
app.use('/static', express.static(path.join(__dirname, 'dist', 'static'), {
  index: false,
  extensions: false,
  fallthrough: false
}));

// Block all other routes
app.use((req, res) => {
  res.status(404).send('Not found');
});

app.listen(PORT, () => {
  console.log(`Dev server running at http://localhost:${PORT}`);
});
