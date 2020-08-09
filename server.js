require('dotenv').config();
const express = require('express');
const cors = require('cors');
const superagent = require('superagent');
const app = express();
app.use(cors());

app.use(express.json());
app.use(express.urlencoded({extended:true}));

app.use(express.static('./public'));
app.set('view engine', 'ejs');

const PORT = process.env.PORT || 3000;
app.listen(PORT,() => console.log(`Listening on port ${PORT}`));

app.get('/hello', function (req, res) {
  res.render('./pages/index');
});


app.get('/', function (req, res) {
  res.render('./pages/searches/new');
});

app.post('/searches', function (req, res) {
  let books = [];

  let searchQuery = req.body.bookSearch;
  let searchChoice = req.body.dataChoice;
  let maxResults = 10;

  let url = `https://www.googleapis.com/books/v1/volumes?q=${searchQuery}+in${searchChoice}&maxResults=${maxResults}`;
  superagent.get(url)
  .then(bookData => {
    bookData.body.items.map(element => {
      let book = new Book(element);
      books.push(book);
    })
    res.render('./pages/searches/show', {booksArray: books});
  })
});


function Book(data) {
  this.title = data.volumeInfo.title || 'N/A';
  this.author = data.volumeInfo.authors || 'N/A';
  this.description = data.volumeInfo.authors || 'N/A';
  this.isbn = data.volumeInfo && data.volumeInfo.industryIdentifiers && data.volumeInfo.industryIdentifiers[0] && data.volumeInfo.industryIdentifiers[0].identifier  || 'N/A';
  this.genre = data.volumeInfo.categories || 'N/A';
  this.url = data.volumeInfo.imageLinks.thumbnail || 'https://i.imgur.com/J5LVHEL.jpg';
}