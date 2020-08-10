require('dotenv').config();
const express = require('express');
const cors = require('cors');
const superagent = require('superagent');
const app = express();
const expressLayouts = require('express-ejs-layouts');
const pg = require('pg');
const client = new pg.Client(process.env.DATABASE_URL);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(express.static('./public'));
app.set('view engine', 'ejs');
app.use(expressLayouts);

const PORT = process.env.PORT || 3000;
client.connect().then(() => {
app.listen(PORT,() => console.log(`Listening on port ${PORT}`));
});

app.get('/hello', function (req, res) {
  res.render('pages/index');
});

app.get('/', function (req, res) {
  let SQL = 'SELECT * FROM books;';
  client.query(SQL).then(result => {
    res.status(200).render('pages/index', {booksArray: result.rows});
  });
});

app.get('/books/:id', function (req, res) {
  let values = [req.params.id];
  let SQL = 'SELECT * FROM books WHERE id=$1;';

  client.query(SQL, values).then(result => {
    console.log(result.rows);
    res.status(200).render('pages/books/details', {booksArray: result.rows});
  });
});

app.get('/searches/new', function (req, res) {
  res.render('pages/index', {booksArray: 0});
});

app.post('/searches', function (req, res) {
  let searchQuery = req.body.bookSearch;
  let searchChoice = req.body.dataChoice;
  let maxResults = 10;

  let url = `https://www.googleapis.com/books/v1/volumes?q=in${searchChoice}:${searchQuery}&maxResults=${maxResults}`;
  superagent
  .get(url)
  .then(bookData => {
    res.render('pages/searches/show', {
      booksArray: bookData.body.items.map(element => new Book(element))
    });
  })
});

app.post('/books', (req, res) => {
  let SQL = `INSERT INTO books (title, author, isbn, image_url, description, bookshelf) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`;
  let values = [req.body.title, req.body.author, req.body.isbn, req.body.image_url, req.body.description, req.body.bookshelf];
  
  client.query(SQL, values)
    .then(result => {
      console.log(result.rows);

      res.redirect(`/books/${result.rows[0].id}`);
  });
});

app.use('*', (request, response) => response.render('pages/error'));

function Book(data) {
  this.title = data.volumeInfo && data.volumeInfo.title || 'N/A';
  this.author = data.volumeInfo && data.volumeInfo.authors || 'N/A';
  this.isbn = data.volumeInfo && data.volumeInfo.industryIdentifiers && data.volumeInfo.industryIdentifiers[0].identifier  || 'N/A';
  this.image_url = data.volumeInfo && data.volumeInfo.imageLinks && data.volumeInfo.imageLinks.thumbnail || 'https://i.imgur.com/J5LVHEL.jpg';
  this.description = data.volumeInfo && data.volumeInfo.authors || 'N/A';
  this.bookshelf = data.volumeInfo && data.volumeInfo.categories || 'N/A';
}