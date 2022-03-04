const { BadRequestError } = require("../expressError");

// Helper function that returns the SET portion of the database query, along with our array of values based on the input.
// This function takes in 2 parameters.
// 1. dataToUpdate. This is the JSON data that was sent in the request body.
// 2. jsToSql. This is an object that is used to reformat the naming convention of certain data to match what is used in our database.
function sqlForPartialUpdate(dataToUpdate, jsToSql) {
  const keys = Object.keys(dataToUpdate);
  if (keys.length === 0) throw new BadRequestError("No data");

  // {firstName: 'Aliya', age: 32} => ['"first_name"=$1', '"age"=$2']
  const cols = keys.map((colName, idx) =>
      `"${jsToSql[colName] || colName}"=$${idx + 1}`,
  );
  return {
    setCols: cols.join(", "),
    values: Object.values(dataToUpdate),
  };
}

module.exports = { sqlForPartialUpdate };
