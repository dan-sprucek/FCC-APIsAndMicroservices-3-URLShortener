'use strict';

var express = require('express');
var mongo = require('mongodb');
var mongoose = require('mongoose');
require('dotenv').config()
const AutoIncrement = require('mongoose-sequence')(mongoose);
const dns = require('dns')

var cors = require('cors');

var app = express();

// Basic Configuration 
const port = process.env.PORT || 3000;
const url = process.env.DB_URI;

/** this project needs a db !! **/ 
// mongoose.connect(process.env.DB_URI);
console.log('connecting to', url)
mongoose.connect(url, { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true, useFindAndModify: false })
app.use(cors());

const urlSchema = new mongoose.Schema({
  original_url: String,
  short_url: Number
})
urlSchema.plugin(AutoIncrement, {inc_field: 'short_url'});

const Url = mongoose.model('Url', urlSchema)

/** this project needs to parse POST bodies **/
// you should mount the body-parser here
// app.use(express.json()); //Used to parse JSON bodies
// app.use(express.urlencoded()); //Parse URL-encoded bodies
var bodyParser = require('body-parser')
app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())

app.use('/public', express.static(process.cwd() + '/public'));

app.get('/', function(req, res){
  res.sendFile(process.cwd() + '/views/index.html');
});

  

// your first API endpoint... 
app.get("/api/hello", function (req, res) {
  res.json({greeting: 'hello API'});
});

app.get('/api/shorturl/:id', (req, res, next) => {
 
  Url
    .find({short_url: req.params.id})
    .then(foundUrl => {
      let newUrl = foundUrl[0].original_url
      if (!/^http/.test(newUrl)) {
        newUrl = `https://${newUrl}`
      }
      res.redirect(newUrl)
    })
    .catch(err => {
      res.json({
        "error":"invalid URL"
      })
    })
})

app.post('/api/shorturl/new', (req, res, next) => {
  const body = req.body
  let urlCheck = body.url
  
  if (/^https*:\/\//.test(urlCheck)) {
      urlCheck = urlCheck.match(/(?<=https*:\/\/)www\.\w+\.\w+/)[0]
    }
    
  dns.lookup(urlCheck, (err, address, family) => {
      if (err) {
        res.json({
          "error":"invalid URL"
        })
      } else {
        const newUrl = new Url({
          original_url: body.url,
        })
        
        newUrl
          .save()
          .then(newUrl => {
            res.json({
              original_url: newUrl.original_url,
              short_url: newUrl.short_url
            })
          })
          .catch(
            error => {
              next(error)
            }
          )
      }
  })
})

app.listen(port, function () {
  console.log('Node.js listening ...');
});