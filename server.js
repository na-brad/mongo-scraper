var express = require("express");
var bodyParser = require("body-parser");
var logger = require("morgan");
var mongoose = require("mongoose");
var path = require("path");

var axios = require("axios");
var cheerio = require("cheerio");

var db = require("./models");

var PORT = process.env.PORT || 3000;

var app = express();


app.use(logger("dev"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));


var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/reuterscraper";
mongoose.Promise = Promise;
mongoose.connect(MONGODB_URI);

app.get("/scrape", function(req, res) {
  axios.get("https://www.reuters.com/news/archive/domesticNews").then(function(response) {
    var $ = cheerio.load(response.data);

      $("div.story-content").each(function (i, element) {
        var title = $(element).find("a").find("h3").text();
        var summary = $(element).find("p").text();
        var link = $(element).find("a").attr("href");

        var object = {
          title: title,
          summary: summary,
          link: link
        };
        db.Article.create(object)
        .then(function(dbArticle) {
          console.log(dbArticle);
        })
        .catch(function(err) {
          return res.json(err);
        });
      });

    });
    res.send("Scrape Complete");
  });

app.get("/articles", function(req, res) {
  db.Article.find({"saved": false})
  .then(function(dbArticle) {
    res.json(dbArticle);
  })
  .catch(function(err) {
    res.json(err);
  });
});

app.get("/saved", function(req, res) {
  db.Article.find({"saved": true}).populate("notes")
  .then(function(dbArticle) {
    res.json(dbArticle);
  })
  .catch(function(err) {
    res.json(err);
  });
});

app.get("/savedArticles", function(req,res){
  res.sendFile(path.join(__dirname, "./public/saved.html"));
})

app.get("/articles/:id", function(req, res) {
  db.Article.findOne({_id: req.params.id})
  .populate("note")
  .then(function(dbArticle){
    res.json(dbArticle);
  })
  .catch(function(err){
    res.json(err);
  });
});

app.post("/articles/:id", function(req, res) {
  db.Note.create(req.body)
  .then(function(dbNote){
    return db.Article.findOneAndUpdate({_id: req.params.id}, { note: dbNote._id }, {new:true});
  })
  .then(function(dbArticle) {
    res.json(dbArticle);
  })
  .catch(function(err) {
    res.json(err);
  });

});

app.post("/articles/save/:id", function(req, res) {
  db.Article.findOneAndUpdate({ "_id": req.params.id }, { "saved": true})
  .then(function(dbArticle) {
    res.json(dbArticle);    
  })
  .catch(function(err) {
    res.json(err);
  });
});

app.post("/articles/delete/:id", function(req, res) {
  db.Article.findOneAndUpdate({ "_id": req.params.id }, {"saved": false, "notes": []})
  .then(function(dbArticle) {
    res.json(dbArticle);    
  })
  .catch(function(err) {
    res.json(err);
  });
});

app.listen(PORT, function() {
  console.log("App running on port " + PORT + "!");
});
