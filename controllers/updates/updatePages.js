const HeaderInfo = require('./../../models/pages/header.page');
const FooterInfo = require('./../../models/pages/footer.page');
const indexInfo = require('./../../models/pages/index.page');
const contactInfo = require('./../../models/pages/contact.page');
const aboutInfo = require('./../../models/pages/about.page');
const teamInfo = require('./../../models/pages/team.page');

// though this data is generated within the source code use joi to still validate it
// in case of errors

function updateValue(dataHead, path, newValue) {
  if (path.length > 1 && dataHead[path[0]]) {
    let temp = dataHead[path[0]];

    dataHead[path[0]] = updateValue(temp, path.splice(1, path.length-1), newValue)

    return dataHead;
  } else if (path.length === 1) {
    dataHead[path[0]] = newValue;

    return dataHead;
  }
}

function updateHeader(req, res) {
  const { newValue, affectedField, index } = req.body;
  
  // This query looks for and empty object {} which matches all the documents
  // but because there will only be one document per model it matches the correct one
  HeaderInfo.findOne({})
    .then(docs => {
      if (docs) {
        
        // make the edit to what was previously there
        const newData = docs[affectedField];
        newData[index] = newValue;
      
        // make the edit
        HeaderInfo.findByIdAndUpdate(docs._id, { [affectedField]: newData })
          .then(docs => {
            return res.status(200).send(newValue);
          })
          .catch(err => {
            console.error(err.message);
            return res.status(400).send("Oops! page edit failed, try again later");
          });

      } else {
        return res.status(400).send("Oops! page edit failed, try again later");
      }
    })
    .catch(err => {
      console.error(err.message);
      return res.status(400).send("Oops! page edit failed, try again later");
    });
   
}

function updateFooter(req, res) {
  const { newValue, affectedField, index } = req.body;
  
  // This query looks for and empty object {} which matches all the documents
  // but because there will only be one document per model it matches the correct one
  FooterInfo.findOne({})
    .then(docs => {
      if (docs) {
        
        // make the edit to what was previously there
        const newData = docs[affectedField];
        newData[index] = newValue;
      
        // make the edit
        FooterInfo.findByIdAndUpdate(docs._id, { [affectedField]: newData })
          .then(docs => {
            return res.status(200).send(newValue);
          })
          .catch(err => {
            console.error(err.message);
            return res.status(400).send("Oops! page edit failed, try again later");
          });

      } else {
        console.error(err.message);
        return res.status(500).send("Oops! page edit failed, try again later");
      }
    })
    .catch(err => {
      console.error(err.message);
      return res.status(500).send("Oops! page edit failed, try again later");
    });
   
}

function updateIndex(req, res) {
  const { newValue, pathToDBChange } = req.body;
  const path = pathToDBChange.split(','); // avoided doing it on the frontend for security reasons
  
  // This query looks for and empty object {} which matches all the documents
  // but because there will only be one document per model it matches the correct one
  indexInfo.findOne({})
    .then(docs => {
      if (docs) {

        docs = updateValue(docs, path, newValue);

        const affectedField = path[0]; // the affected field will be the first entry in the path
        const newData = docs[affectedField]; // the newData will be the value after passing through the updateValue function
      
        // make the edit
        indexInfo.findByIdAndUpdate(docs._id, { [affectedField]: newData })
          .then(docs => {
            return res.status(200).send(newValue);
          })
          .catch(err => {
            console.error(err.message);
            return res.status(400).send("Oops! page edit failed, try again later");
          });

      } else {
        console.error(err.message);
        return res.status(500).send("Oops! page edit failed, try again later");
      }
    })
    .catch(err => {
      console.error(err.message);
      return res.status(500).send("Oops! page edit failed, try again later");
    });
}

function updateContact(req, res) {
  const { newValue, pathToDBChange } = req.body;
  const path = pathToDBChange.split(','); // avoided doing it on the frontend for security reasons
  
  // This query looks for and empty object {} which matches all the documents
  // but because there will only be one document per model it matches the correct one
  contactInfo.findOne({})
    .then(docs => {
      if (docs) {

        docs = updateValue(docs, path, newValue);

        const affectedField = path[0]; // the affected field will be the first entry in the path
        const newData = docs[affectedField]; // the newData will be the value after passing through the updateValue function
      
        // make the edit
        contactInfo.findByIdAndUpdate(docs._id, { [affectedField]: newData })
          .then(docs => {
            return res.status(200).send(newValue);
          })
          .catch(err => {
            console.error(err.message);
            return res.status(400).send("Oops! page edit failed, try again later");
          });

      } else {
        console.error(err.message);
        return res.status(500).send("Oops! page edit failed, try again later");
      }
    })
    .catch(err => {
      console.error(err.message);
      return res.status(500).send("Oops! page edit failed, try again later");
    });
}

function updateAbout(req, res) {
  const { newValue, pathToDBChange } = req.body;
  const path = pathToDBChange.split(','); // avoided doing it on the frontend for security reasons
  
  // This query looks for and empty object {} which matches all the documents
  // but because there will only be one document per model it matches the correct one
  aboutInfo.findOne({})
    .then(docs => {
      if (docs) {

        docs = updateValue(docs, path, newValue);

        const affectedField = path[0]; // the affected field will be the first entry in the path
        const newData = docs[affectedField]; // the newData will be the value after passing through the updateValue function
      
        // make the edit
        aboutInfo.findByIdAndUpdate(docs._id, { [affectedField]: newData })
          .then(docs => {
            return res.status(200).send(newValue);
          })
          .catch(err => {
            console.error(err.message);
            return res.status(400).send("Oops! page edit failed, try again later");
          });

      } else {
        console.error(err.message);
        return res.status(500).send("Oops! page edit failed, try again later");
      }
    })
    .catch(err => {
      console.error(err.message);
      return res.status(500).send("Oops! page edit failed, try again later");
    });
}

function updateTeam(req, res) {
  const { newValue, pathToDBChange } = req.body;
  const path = pathToDBChange.split(','); // avoided doing it on the frontend for security reasons
  
  // This query looks for and empty object {} which matches all the documents
  // but because there will only be one document per model it matches the correct one
  teamInfo.findOne({})
    .then(docs => {
      if (docs) {

        docs = updateValue(docs, path, newValue);

        const affectedField = path[0]; // the affected field will be the first entry in the path
        const newData = docs[affectedField]; // the newData will be the value after passing through the updateValue function
      
        // make the edit
        teamInfo.findByIdAndUpdate(docs._id, { [affectedField]: newData })
          .then(docs => {
            return res.status(200).send(newValue);
          })
          .catch(err => {
            console.error(err.message);
            return res.status(400).send("Oops! page edit failed, try again later");
          });

      } else {
        console.error(err.message);
        return res.status(500).send("Oops! page edit failed, try again later");
      }
    })
    .catch(err => {
      console.error(err.message);
      return res.status(500).send("Oops! page edit failed, try again later");
    });
}

module.exports = {
  updateHeader,
  updateFooter,
  updateIndex,
  updateContact,
  updateAbout,
  updateTeam
}