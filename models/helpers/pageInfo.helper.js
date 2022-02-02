const HeaderInfo = require('../pages/header.page');
const FooterInfo = require('../pages/footer.page');
const IndexInfo = require('../pages/index.page');
const ContactInfo = require('../pages/contact.page');
const Therapists = require("./../therapist");
const res = require('express/lib/response');

module.exports = async function (url) {
  
  // you can't change what page info points to but you can change it's data
  const pageInfo = {};

  // this query is not tied to any specific user it is for the header and footer that's why it is here
  await HeaderInfo.find({})
    .then(docs => {
      if (docs) {
        pageInfo.header = docs;
      } else {
        res.status(500).send("The page could not load properly");
      }
    })
    .catch((err) => {
      console.error(err.message);
      throw err;
    });

  await FooterInfo.find({})
    .then(docs => {
      if (docs) {
        pageInfo.footer = docs;
      } else {
        res.status(500).send("The page could not load properly");
      }
    })
    .catch((err) => {
      console.error(err.message);
      throw err;
    });

  // for the rest of the pages I'll create an if statement which checks the url property
  
  if (url == "/index" || url == "/" || url == "/team") {
    await IndexInfo.find({})
      .then(docs => {
        if (docs) {
          pageInfo.index = docs;
        } else {
          res.status(500).send("The page could not load properly");
        }
      })
      .catch((err) => {
        console.error(err.message);
        throw err;
      });

    await Therapists.find({})
      .then(docs => {
        if (docs) {
          pageInfo.therapists = docs;
        } else {
          // there may be no therapist
          pageInfo.therapists = null;
        }
      })
  }

  if (url == "/contact") {
    await ContactInfo.find({})
    .then(docs => {
      if (docs) {
        pageInfo.contact = docs;
      } else {
        res.status(500).send("The page could not load properly");
      }
    })
    .catch((err) => {
      console.error(err.message);
      throw err;
    });
  }
  
  return pageInfo;

}