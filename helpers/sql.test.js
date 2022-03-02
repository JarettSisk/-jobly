const { sqlForPartialUpdate } = require("./sql");


// 
describe("Testing sqlForPartialUpdate", function () {
    test("works with single item", function () {
        let result = sqlForPartialUpdate({firstName: 'Aliya'}, {firstName: "first_name", lastName: "last_name"} )
        expect(result).toEqual({ setCols: '"first_name"=$1', values: [ 'Aliya'] })
        });

        test("works with multiple items", function () {
            let result = sqlForPartialUpdate({firstName: 'Aliya', age: 32}, {firstName: "first_name", lastName: "last_name"} )
            expect(result).toEqual({ setCols: '"first_name"=$1, "age"=$2', values: [ 'Aliya', 32 ] })
            });
    });