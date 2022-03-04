"use strict";

/** Routes for companies. */

const jsonschema = require("jsonschema");
const express = require("express");

const { BadRequestError } = require("../expressError");
const { ensureLoggedIn, ensureAdmin } = require("../middleware/auth");
const Job = require("../models/job");

// CHANGE THESE TO BE FOR THE JOB
const jobNewSchema = require("../schemas/jobNew.json");
const jobSearchSchema = require("../schemas/jobSearch.json");
const jobUpdateSchema = require("../schemas/jobUpdate.json");

const router = new express.Router();


/** POST / { job } =>  { job }
 *
 * company should be { title, salary, equity, company_handle }
 *
 * Returns { title, salary, equity, company_handle }
 *
 * Authorization required: isAdmin
 */

router.post("/", ensureAdmin, async function (req, res, next) {
  try {
    const validator = jsonschema.validate(req.body, jobNewSchema);
    if (!validator.valid) {
      const errs = validator.errors.map(e => e.stack);
      throw new BadRequestError(errs);
    }

    const job = await Job.create(req.body);
    return res.status(201).json({ job });
  } catch (err) {
    return next(err);
  }
});

/** GET /  =>
 *   { jobs: [ { title, salary, equity, company_handle }, ...] }
 *
 * Can filter on provided search filters:
 * - minSalary
 * - maxSalary
 * - title (will find case-insensitive, partial matches)
 *
 * Authorization required: none
 */

router.get("/", async function (req, res, next) {
  try {
    /*
     1. Get the query params
     2. Make sure they are valid using the jsonSchema
     3. Pass them into our findAll model function
     */ 

    // 1.
    if(!Object.keys(req.query).length !== 0) {
        // Converting the query params to integers
        if (req.query.minSalary) {req.query.minSalary = parseInt(req.query.minSalary)};
        if (req.query.maxSalary) {req.query.maxSalary = parseInt(req.query.maxSalary)};
        // 2.
        const validator = jsonschema.validate(req.query, jobSearchSchema);
         if (!validator.valid) {
        const errs = validator.errors.map(e => e.stack);
        throw new BadRequestError(errs);
    }
    }
    const jobs = await Job.findAll(req.query); // 3.
    return res.json({ jobs });
  } catch (err) {
    return next(err);
  }
});

/** GET /[title]  =>  { job }
 *
 *  Returns { title, salary, equity, company_handle }
 *
 * Authorization required: none
 */

router.get("/:title", async function (req, res, next) {
  try {
    const job = await Job.get(req.params.title);
    return res.json({ job });
  } catch (err) {
    return next(err);
  }
});

/** PATCH /[title] { title, salary, ... } => { company }
 *
 * Patches job data.
 *
 * fields can be: { title, salary, equity }
 *
 * Returns { title, salary, equity, company_handle }
 *
 * Authorization required: isAdmin
 */

router.patch("/:id", ensureAdmin, async function (req, res, next) {
  try {
    const validator = jsonschema.validate(req.body, jobUpdateSchema);
    if (!validator.valid) {
      const errs = validator.errors.map(e => e.stack);
      throw new BadRequestError(errs);
    }
    const job = await Job.update(req.params.id, req.body);
    return res.json({ job });
  } catch (err) {
    return next(err);
  }
});

/** DELETE /:title  =>  { deleted: title }
 *
 * Authorization: isAdmin
 */

router.delete("/:title", ensureAdmin, async function (req, res, next) {
  try {
    await Job.remove(req.params.title);
    return res.json({ deleted: req.params.title });
  } catch (err) {
    return next(err);
  }
});


module.exports = router;
