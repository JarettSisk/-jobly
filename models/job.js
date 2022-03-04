"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for jobs */

class Job {

  /** Create a job (from data), update db, return new job data.
   *
   * data should be { title, salary, equity, company_handle }
   *
   * Returns { title, salary, equity, company_handle }
   * 
   *
   * Throws BadRequestError if job already in database.
   * */
// Note that the create method gets passed an object
  static async create({ title, salary, equity, company_handle }) {
    
    const duplicateCheck = await db.query(
          `SELECT title
           FROM jobs
           WHERE title = $1`,
        [title]);
    if (duplicateCheck.rows[0])
      throw new BadRequestError(`Duplicate job: ${title}`);
    
    const result = await db.query(
          `INSERT INTO jobs
           (title, salary, equity, company_handle)
           VALUES ($1, $2, $3, $4)
           RETURNING id, title, salary, equity, company_handle`,
        [title, salary, equity, company_handle],
    );
    const job = result.rows[0];

    return job;
  }

  /** Find all jobs.
   *
   * Returns [{ title, salary, equity, company_handle }, ...]
   * */

  static async findAll(reqQuery) {
    //  4. if the params exist, alter our query to include them in the WHERE clause.
    let {title, minSalary, maxSalary} = reqQuery;
    let fullQuery = `
    SELECT id, title, salary, equity, company_handle
    FROM jobs
    `;
    /*
    How our WHERE statement should look:
        WHERE title ILIKE $1 AND salary >= $2 AND salary <= $3, [title, minSalary, maxSalary ] 
    */
    let values = [];
    let whereQuery = []
    // Loop through each key in the reqQuery. If we have a match, we push the values and the correct queries.
    
    if (minSalary !== undefined || maxSalary !== undefined || title !== undefined) {
        fullQuery += " WHERE"
        for(let key in reqQuery) {
            if (key === 'minSalary') {
                values.push(reqQuery[key]); // push to the array
                whereQuery.push(` salary >= $${values.length}`) ; //set to the correct index 
            }

            if (key === 'maxSalary') {
                values.push(reqQuery[key]); 
                whereQuery.push(` salary <= $${values.length}`); 
            }

            if (key === 'title') {
                values.push(`%${reqQuery[key]}%`); // push to the array
                whereQuery.push(` title ILIKE $${values.length}`);
            }
        }
        let complete = whereQuery.join(" AND");
        fullQuery += complete;
    } 

    // Combine the completed sql statemnt into the full query
    
    fullQuery += " ORDER BY title";
    console.log(fullQuery);            
    const jobsRes = await db.query(fullQuery, values);
    return jobsRes.rows;
  }

  /** Given a job title, return data about job.
   *
   * Returns { title, salary, equity, company_handle }
   *
   * Throws NotFoundError if not found.
   **/

  static async get(id) {
    const jobRes = await db.query(
          `SELECT id, title, salary, equity, company_handle
           FROM jobs
           WHERE id = $1`, [id]);

    const job = jobRes.rows[0];

    if (!job) throw new NotFoundError(`No job: ${id}`);

    return job;
  }

  /** Update job data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {title, salary, equity}
   *
   * Returns {title, salary, equity, company_handle}
   *
   * Throws NotFoundError if not found.
   */

  static async update(id, data) {
    const { setCols, values } = sqlForPartialUpdate(data, {});

    const handleVarIdx = "$" + (values.length + 1);

    const querySql = `UPDATE jobs 
                      SET ${setCols} 
                      WHERE id = ${handleVarIdx} 
                      RETURNING id, title, salary, equity, company_handle`;

    const result = await db.query(querySql, [...values, id]);
    const job = result.rows[0];

    if (!job) throw new NotFoundError(`No job: ${id}`);

    return job;
  }

  /** Delete given job from database; returns undefined.
   *
   * Throws NotFoundError if company not found.
   **/

  static async remove(id) {
    const result = await db.query(
          `DELETE
           FROM jobs
           WHERE id = $1
           RETURNING id, title`,
        [id]);
    const job = result.rows[0];

    if (!job) throw new NotFoundError(`No job: ${id}`);
  }
}


module.exports = Job;
