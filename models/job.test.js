"use strict";

const db = require("../db.js");
const { BadRequestError, NotFoundError } = require("../expressError");
const Job = require("./job.js");
const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

// create new job and return it (for id access) 
async function createAndGetJob() {
    let newJob = {
        title: "newJob2",
        salary: 50,
        equity: 0,
        company_handle: "c1"
    };
    let job = await Job.create(newJob)
    return job;
}

/************************************** create */

describe("create", function () {
    let newJob = {
        title: "newJob",
        salary: 40,
        equity: 0,
        company_handle: "c3"
    };

  test("works", async function () {
    let job = await Job.create(newJob);
    console.log(job);
    expect(job).toEqual({
        id: expect.any(Number),
        title: "newJob",
        salary: 40,
        equity: "0",
        company_handle: "c3"
    });
     

    const result = await db.query(
          `SELECT id, title, salary, equity, company_handle
           FROM jobs
           WHERE title = 'newJob'`);
    expect(result.rows).toEqual([
      {
        id: expect.any(Number),
        title: "newJob",
        salary: 40,
        equity: "0",
        company_handle: "c3"
      },
    ]);
  });

  test("bad request with dupe", async function () {
    try {
      await Job.create(newJob);
      await Job.create(newJob);
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});

/************************************** findAll */

describe("findAll", function () {
  test("works: no filter", async function () {
    let jobs = await Job.findAll({invalid : null});
    expect(jobs).toEqual([
        {
            id: expect.any(Number),
            title: "j1",
            salary: 10,
            equity: "0",
            company_handle: "c1"
        },
        {
            id: expect.any(Number),
            title: "j2",
            salary: 20,
            equity: "0",
            company_handle: "c2"
        }
    ]);
  });
});

describe("findAll", function () {
    test("works: with filter", async function () {
        let filter = {
            minSalary: 10,
            maxSalary: 15,
        }
      let jobs = await Job.findAll(filter);
      expect(jobs).toEqual([
        {
            id: expect.any(Number),
            title: "j1",
            salary: 10,
            equity: "0",
            company_handle: "c1"
        }
       
      ]);
    });
  });

// /************************************** get */

describe("get", function () {
  test("works", async function () {
    const currentJob = await createAndGetJob();
    let jobs = await Job.get(`${currentJob.id}`);
    expect(jobs).toEqual(
    {
        id: currentJob.id,
        title: "newJob2",
        salary: 50,
        equity: "0",
        company_handle: "c1"
    });
  });

  test("not found if no such job", async function () {
    try {
      await Job.get("100000000");
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});

// /************************************** update */

describe("update", function () {
    
    let updateData = {
        title: "newJob3",
        salary: 60,
        equity: 0,
        company_handle: "c1"
    };

  test("works", async function () {
    let currentJob = await createAndGetJob();
    let job = await Job.update(`${currentJob.id}`, updateData);
    expect(job).toEqual({
        id: currentJob.id,
        title: "newJob3",
        salary: 60,
        equity: "0",
        company_handle: "c1"
    });

    const result = await db.query(
          `SELECT id, title, salary, equity, company_handle
           FROM jobs
           WHERE id = $1`, [currentJob.id]);
    expect(result.rows).toEqual([{
        id: currentJob.id,
        title: "newJob3",
        salary: 60,
        equity: "0",
        company_handle: "c1"
    }]);
  });

  test("not found if no such job", async function () {
    try {
      await Job.update("999999999", updateData);
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });

  test("bad request with no data", async function () {
    let currentJob = await createAndGetJob();
    try {
      await Job.update(`${currentJob.id}`, {});
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});

// /************************************** remove */

describe("remove", function () {
  test("works", async function () {
    let currentJob = await createAndGetJob();
    await Job.remove(`${currentJob.id}`);
    const res = await db.query(
        "SELECT id FROM jobs WHERE id=$1", [currentJob.id]);
    expect(res.rows.length).toEqual(0);
  });

  test("not found if no such job", async function () {
    try {
      await Job.remove("99999999");
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});
