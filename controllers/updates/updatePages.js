const HeaderInfo = require('./../../models/pages/header.page');

function updateHeader(req, res) {
  console.log(`Request made to : ${req.url}`);

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
            console.log(err.message);
            return res.status(400).send("Oops! page edit failed, try again later");
          });

      } else {
        return res.status(400).send("Oops! page edit failed, try again later");
      }
    })
    .catch(err => {
      console.log(err.message);
      return res.status(400).send("Oops! page edit failed, try again later");
    });
   
}

module.exports = {
  updateHeader
}