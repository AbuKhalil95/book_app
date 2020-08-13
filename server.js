require('dotenv').config();
const express = require('express');
const cors = require('cors');
const superagent = require('superagent');
const app = express();
const expressLayouts = require('express-ejs-layouts');
const pg = require('pg');
const client = new pg.Client(process.env.DATABASE_URL);
const methodOverride = require('method-override');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(express.static('./public'));
app.set('view engine', 'ejs');
app.use(expressLayouts);
app.use(methodOverride('_method'));

// connection 
const PORT = process.env.PORT || 3000;
client.connect().then(() => {
app.listen(PORT,() => console.log(`Listening on port ${PORT}`));
});

// routes
app.get('/', renderHome);   // renders all books

app.get('/books/:id', renderDetails); // renders details of a book

app.get('/searches/new', renderSearch); // renders a search page

app.post('/searches', renderSearchResult); // appends results into result page

app.post('/books', addBook); // adds a book into all

app.get('/books/edit/:id', editBook); // renders an edit book page from all

app.put('/books/update/:id', updateDB) // updates DB and redirects to books/:id

// app.get('/books/delete/:id', deleteBook); // renders an edit book page from all

app.use('*', renderError);

// callbacks from routes
function renderHome(req, res) {
  let SQL = 'SELECT * FROM books;';
  client.query(SQL).then(result => {
    res.status(200).render('pages/index', {booksArray: result.rows});
  });
}

function renderDetails(req, res) {
  let values = [req.params.id];
  let SQL = 'SELECT * FROM books WHERE id=$1;';

  client.query(SQL, values).then(result => {
    console.log(result.rows);
    res.status(200).render('pages/books/details', {booksArray: result.rows});
  });
}

function renderSearch(req, res) {
  res.render('pages/index', {booksArray: 0});
}

function renderSearchResult (req, res) {
  let searchQuery = req.body.bookSearch;
  let searchChoice = req.body.dataChoice;
  let maxResults = 10;

  let url = `https://www.googleapis.com/books/v1/volumes?q=in${searchChoice}:${searchQuery}&maxResults=${maxResults}`;
  superagent
  .get(url)
  .then(bookData => {
    res.render('pages/searches/show', {
      booksArray: bookData.body.items.map(element => {
        console.log(element);
        var book = new Book(element);
        console.log(book);
        return book;})
    });
  })
}

function addBook(req, res) {
  let SQL = `INSERT INTO books (title, author, isbn, image_url, description, bookshelf) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`;
  let values = [req.body.title, req.body.author, req.body.isbn, req.body.image_url, req.body.description, JSON.stringify(req.body.bookshelf)];
  
  client.query(SQL, values)
    .then(result => {
      res.redirect(`/books/${result.rows[0].id}`);
  });
}

function editBook(req, res) {
  let values = [req.params.id];
  let SQL = 'SELECT * FROM books WHERE id=$1;';

  client.query(SQL, values).then(result => {
    let allResults = result.rows;
    let SQL = 'SELECT DISTINCT bookshelf FROM books;';

    client.query(SQL).then(result => {
    res.status(200).render('pages/books/edit', {
      booksArray: allResults,
      bookShelves: result.rows,
      formAction: 'update'});
    });
  });
}

function updateDB(request, response) {
  // destructure variables
  let { title, author, isbn, image_url, description, bookshelf } = request.body;
  // need SQL to update the specific task that we were on
  let SQL = `UPDATE books SET title=$1, author=$2, isbn=$3, image_url=$4, description=$5, bookshelf=$6 WHERE id=$7;`;
  // use request.params.task_id === whatever task we were on
  let values = [title, author, isbn, image_url, description, bookshelf, request.params.id];

  client.query(SQL, values)
    .then(response.redirect(`/books/${request.params.id}`));
}

function renderError(req ,res) {
  res.render('pages/error')
}

// constructor
function Book(data) {
  this.title = data.volumeInfo && data.volumeInfo.title || 'N/A';
  this.author = data.volumeInfo && data.volumeInfo.authors || 'N/A';
  this.isbn = data.volumeInfo && data.volumeInfo.industryIdentifiers && data.volumeInfo.industryIdentifiers[0].identifier  || 'N/A';
  this.image_url = data.volumeInfo && data.volumeInfo.imageLinks && data.volumeInfo.imageLinks.thumbnail || 'https://i.imgur.com/J5LVHEL.jpg';
  this.description = data.volumeInfo && data.volumeInfo.description || 'N/A';
  this.bookshelf = data.volumeInfo && data.volumeInfo.categories || 'N/A';
}