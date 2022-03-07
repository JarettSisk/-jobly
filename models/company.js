"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for companies. */

class Company {
  /** Create a company (from data), update db, return new company data.
   *
   * data should be { handle, name, description, numEmployees, logoUrl }
   *
   * Returns { handle, name, description, numEmployees, logoUrl }
   *
   * Throws BadRequestError if company already in database.
   * */

  static async create({ handle, name, description, numEmployees, logoUrl }) {
    const duplicateCheck = await db.query(
          `SELECT handle
           FROM companies
           WHERE handle = $1`,
        [handle]);

    if (duplicateCheck.rows[0])
      throw new BadRequestError(`Duplicate company: ${handle}`);

    const result = await db.query(
          `INSERT INTO companies
           (handle, name, description, num_employees, logo_url)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING handle, name, description, num_employees AS "numEmployees", logo_url AS "logoUrl"`,
        [
          handle,
          name,
          description,
          numEmployees,
          logoUrl,
        ],
    );
    const company = result.rows[0];

    return company;
  }

  /** Find all companies.
   *
   * Returns [{ handle, name, description, numEmployees, logoUrl }, ...]
   * */

  static async findAll(reqQuery) {
    //  4. if the params exist, alter our query to include them in the WHERE clause.
    let {minEmployees, maxEmployees, name} = reqQuery;
    let fullQuery = `
    SELECT handle,
    name,
    description,
    num_employees AS "numEmployees",
    logo_url AS "logoUrl"
    FROM companies
    `;
    /*
    How our WHERE statement should look:
        WHERE num_employees >= $1 AND num_employees <= $2 AND name ILIKE $3, [minEmployees, maxEmployees, name ] 
    */
    let values = [];
    let whereQuery = []
    // Loop through each key in the reqQuery. If we have a match, we push the values and the correct queries.
    
    if (minEmployees !== undefined || maxEmployees !== undefined || name !== undefined) {
        fullQuery += " WHERE"
        for(let key in reqQuery) {
            if (key === 'minEmployees') {
                values.push(reqQuery[key]); // push to the array
                whereQuery.push(` num_employees >= $${values.length}`) ; //set to the correct index 
            }

            if (key === 'maxEmployees') {
                values.push(reqQuery[key]); 
                whereQuery.push(` num_employees <= $${values.length}`); 
            }

            if (key === 'name') {
                values.push(`%${reqQuery[key]}%`); // push to the array
                whereQuery.push(` name ILIKE $${values.length}`);
            }
        }
        let complete = whereQuery.join(" AND");
        fullQuery += complete;
    } 

    // Compine the completed sql statemnt into the full query
    
    fullQuery += " ORDER BY name";
    const companiesRes = await db.query(fullQuery, values);
    return companiesRes.rows;
  }

  /** Given a company handle, return data about company.
   *
   * Returns { handle, name, description, numEmployees, logoUrl, jobs }
   *   where jobs is [{ id, title, salary, equity, companyHandle }, ...]
   *
   * Throws NotFoundError if not found.
   **/

  static async get(handle) {
    const companyRes = await db.query(
          `SELECT handle,
                  name,
                  description,
                  num_employees AS "numEmployees",
                  logo_url AS "logoUrl"
           FROM companies
           WHERE handle = $1`,
        [handle]);
       
    const company = companyRes.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    const jobRes = await db.query(`
    SELECT *
    FROM jobs
    WHERE company_handle = $1
    `, [company.handle]);

    const formattedData = {
        handle: company.handle,
        name: company.name,
        description: company.description,
        numEmployees: company.numEmployees,
        logoUrl: company.logoUrl,
        jobs: jobRes.rows
    }
    return formattedData;
  }

  /** Update company data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {name, description, numEmployees, logoUrl}
   *
   * Returns {handle, name, description, numEmployees, logoUrl}
   *
   * Throws NotFoundError if not found.
   */

  static async update(handle, data) {
    const { setCols, values } = sqlForPartialUpdate(
        data,
        {
          numEmployees: "num_employees",
          logoUrl: "logo_url",
        });
        console.log(values)
    const handleVarIdx = "$" + (values.length + 1);

    const querySql = `UPDATE companies 
                      SET ${setCols} 
                      WHERE handle = ${handleVarIdx} 
                      RETURNING handle, 
                                name, 
                                description, 
                                num_employees AS "numEmployees", 
                                logo_url AS "logoUrl"`;
    const result = await db.query(querySql, [...values, handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    return company;
  }

  /** Delete given company from database; returns undefined.
   *
   * Throws NotFoundError if company not found.
   **/

  static async remove(handle) {
    const result = await db.query(
          `DELETE
           FROM companies
           WHERE handle = $1
           RETURNING handle`,
        [handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);
  }
}


module.exports = Company;
