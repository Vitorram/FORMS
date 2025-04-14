const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const port = 3000;


app.use(express.urlencoded({ extended: true }));

const db = new sqlite3.Database('./eleicao.db');

db.run(`
  CREATE TABLE IF NOT EXISTS votos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    sala TEXT NOT NULL,
    candidato TEXT NOT NULL,
    data TEXT NOT NULL
  )
`);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/votar', (req, res) => {
  const { nome, sala, candidato } = req.body;

  if (!nome || !sala || !candidato) {
    return res.status(400).send('Preencha todos os campos.');
  }

  const data = new Date().toISOString();
  const query = `INSERT INTO votos (nome, sala, candidato, data) VALUES (?, ?, ?, ?)`;

  db.run(query, [nome, sala, candidato, data], function (err) {
    if (err) {
      console.error(err.message);
      return res.status(500).send('Erro ao registrar o voto.');
    }

    res.send(`
      <h2>Voto registrado com sucesso!</h2>
      <p><a href="/">Voltar para o formulário</a></p>
    `);
  });
});

app.get('/resultados', (req, res) => {
  const query = `
    SELECT candidato, COUNT(*) as total
    FROM votos
    GROUP BY candidato
    ORDER BY total DESC
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      console.error(err.message);
      return res.status(500).send('Erro ao calcular os resultados.');
    }

    const candidatos = rows.map(row => row.candidato);
    const totais = rows.map(row => row.total);
    const totalVotos = totais.reduce((acc, curr) => acc + curr, 0);

    // HTML com Chart.js
    res.send(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Resultados da Votação</title>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <style>
          body {
            font-family: Arial, sans-serif;
            background: #f3f3f3;
            text-align: center;
            padding: 30px;
          }
          canvas {
            max-width: 600px;
            margin: 30px auto;
            background: #fff;
            border-radius: 10px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          }
          h2 {
            margin-bottom: 20px;
          }
          a {
            display: inline-block;
            margin-top: 20px;
            text-decoration: none;
            color: #28a745;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <h2>Resultados da Votação</h2>
        <canvas id="graficoVotos"></canvas>

        <p><strong>Total de votos:</strong> ${totalVotos}</p>
        <a href="/votos">Ver todos os votos</a> | <a href="/">Voltar ao formulário</a>

        <script>
          const ctx = document.getElementById('graficoVotos').getContext('2d');
          new Chart(ctx, {
            type: 'bar',
            data: {
              labels: ${JSON.stringify(candidatos)},
              datasets: [{
                label: 'Total de votos',
                data: ${JSON.stringify(totais)},
                backgroundColor: '#28a745'
              }]
            },
            options: {
              scales: {
                y: {
                  beginAtZero: true,
                  precision: 0
                }
              }
            }
          });
        </script>
      </body>
      </html>
    `);
  });
});

app.get('/votos', (req, res) => {
  const query = `SELECT nome, sala, candidato, data FROM votos ORDER BY data DESC`;

  db.all(query, [], (err, rows) => {
    if (err) {
      console.error(err.message);
      return res.status(500).send('Erro ao buscar os votos.');
    }

    let html = `
      <h2>Todos os Votos</h2>
      <table border="1" cellpadding="10">
        <tr>
          <th>Nome</th>
          <th>Sala</th>
          <th>Candidato</th>
          <th>Data</th>
        </tr>
    `;

    rows.forEach(row => {
      html += `
        <tr>
          <td>${row.nome}</td>
          <td>${row.sala}</td>
          <td>${row.candidato}</td>
          <td>${new Date(row.data).toLocaleString('pt-BR')}</td>
        </tr>
      `;
    });

    html += `
      </table>
      <p><a href="/resultados">← Voltar aos resultados</a></p>
      <p><a href="/">← Voltar ao formulário</a></p>
    `;

    res.send(html);
  });
});


app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
