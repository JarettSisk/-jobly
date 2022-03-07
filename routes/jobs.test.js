"use strict";

const request = require("supertest");

const db = require("../db");
const app = require("../app");

const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  u1Token,
  u4Token,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

// create new job and return it (for id access) 
async function createAndGetJob() {
        let resp = await request(app).post("/jobs")
        .send({title: "testJob", salary: 50, equity: 0, company_handle: "c1"})
        .set("authorization", `Bearer ${u4Token}`);
        let currentJob = resp.body;
        return currentJob;
}

/************************************** POST /jobs */

describe("POST /jobs", function () {
  let newJob = {
    title: "newJob",
    salary: 40,
    equity: 0,
    company_handle: "c3"
};

  test("ok for admins", async function () {
    const resp = await request(app)
        .post("/jobs")
        .send(newJob)
        .set("authorization", `Bearer ${u4Token}`);
    expect(resp.statusCode).toEqual(201);
    expect(resp.body).toEqual({
      job: {
        id : resp.body.job.id,
        title: "newJob",
        salary: 40,
        equity: "0",
        company_handle: "c3"
      },
    });
  });

  test("unauthorized if not admin", async function () {
    const resp = await request(app)
        .post("/jobs")
        .send(newJob)
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("bad request with missing data", async function () {
    const resp = await request(app)
        .post("/jobs")
        .send({
          title: "new",
          salary: 10,
        })
        .set("authorization", `Bearer ${u4Token}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("bad request with invalid data", async function () {
    const resp = await request(app)
        .post("/jobs")
        .send({
          ...newJob,
          logoUrl: "not-a-url",
        })
        .set("authorization", `Bearer ${u4Token}`);
    expect(resp.statusCode).toEqual(400);
  });
});

/************************************** GET /jobs */

describe("GET /jobs", function () {
  test("ok for anon", async function () {
    const resp = await request(app).get("/jobs");
    expect(resp.body).toEqual({
      jobs:
          [
            {
                id: resp.body.jobs[0].id,
                title: "j1",
                salary: 10,
                equity: "0",
                company_handle: "c1"
            },
            {
                id: resp.body.jobs[1].id,
                title: "j2",
                salary: 20,
                equity: "0",
                company_handle: "c2"
            },
            {
                id: resp.body.jobs[2].id,
                title: "j3",
                salary: 30,
                equity: "0",
                company_handle: "c3"
            }
          ],
    });
  });

  test("works: filtering", async function () {
    const resp = await request(app)
        .get("/jobs")
        .query({ minSalary: 20 });
    expect(resp.body).toEqual({
      jobs: [
        {
            id: resp.body.jobs[0].id,
            title: "j2",
            salary: 20,
            equity: "0",
            company_handle: "c2"
        },
        {
            id: resp.body.jobs[1].id,
            title: "j3",
            salary: 30,
            equity: "0",
            company_handle: "c3"
        },
      ],
    });
  });

  test("works: filtering on all filters", async function () {
    const resp = await request(app)
        .get("/jobs")
        .query({ minSalary: 10, maxSalary: 20, title: "j1" });
    expect(resp.body).toEqual({
      jobs: [
        {
            id: resp.body.jobs[0].id,
            title: "j1",
            salary: 10,
            equity: "0",
            company_handle: "c1"
        },
      ],
    });
  });

  test("bad request if invalid filter key", async function () {
    const resp = await request(app)
        .get("/jobs")
        .query({ minSalary: 2, nope: "nope" });
        console.log(resp.body);
    expect(resp.statusCode).toEqual(400);
  });

  test("fails: test next() handler", async function () {
    // there's no normal failure event which will cause this route to fail ---
    // thus making it hard to test that the error-handler works with it. This
    // should cause an error, all right :)
    await db.query("DROP TABLE companies CASCADE");
    const resp = await request(app)
        .get("/companies")
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(500);
  });
});

/************************************** GET /companies/:handle */

describe("GET /jobs/:id", function () {

  test("works for anon", async function () {
    let resp1 = await request(app).post("/jobs")
    .send({title: "testJob", salary: 50, equity: 0, company_handle: "c1"})
    .set("authorization", `Bearer ${u4Token}`);
    const resp2 = await request(app).get(`/jobs/${resp1.body.job.id}`);
    expect(resp2.statusCode).toBe(200);
    expect(resp2.body).toEqual(resp1.body);
  });

  test("not found for no such job", async function () {
    const resp = await request(app).get(`/jobs/1000000`);
    expect(resp.statusCode).toEqual(404);
  });
});

/************************************** PATCH /jobs/:id */

describe("PATCH /jobs/:id", function () {
  test("works for admins", async function () {
    let currentJob = await createAndGetJob();
    console.log(currentJob);
    const resp = await request(app)
        .patch(`/jobs/${currentJob.job.id}`)
        .send({
          title: "newTitle"
        })
        .set("authorization", `Bearer ${u4Token}`);

    expect(resp.body).toEqual({
      job : {
          id: currentJob.job.id,
          title: "newTitle",
          salary: 50,
          equity: "0",
          company_handle: "c1"
      },
    });
  });

  test("unauth for anon", async function () {
    let currentJob = await createAndGetJob();
    const resp = await request(app)
        .patch(`/jobs/${currentJob.job.id}`)
        .send({
          title: "newTitle",
        });
    expect(resp.statusCode).toEqual(401);
  });

  test("not found on no such job", async function () {
    const resp = await request(app)
        .patch(`/jobs/10000000`)
        .send({
          title: "newTitle",
        })
        .set("authorization", `Bearer ${u4Token}`);
    expect(resp.statusCode).toEqual(404);
  });

  test("bad request on company_handle change attempt", async function () {
    let currentJob = await createAndGetJob();
    const resp = await request(app)
        .patch(`/jobs/${currentJob.job.id}`)
        .send({
          company_handle: "c2",
        })
        .set("authorization", `Bearer ${u4Token}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("bad request on invalid data", async function () {
    let currentJob = await createAndGetJob();
    const resp = await request(app)
        .patch(`/companies/${currentJob.job.id}`)
        .send({
          title: 443,
        })
        .set("authorization", `Bearer ${u4Token}`);
    expect(resp.statusCode).toEqual(400);
  });
});

// /************************************** DELETE /jobs/:id */

describe("DELETE /jobs/:id", function () {
  test("works for admins", async function () {
    let currentJob = await createAndGetJob();
    const resp = await request(app)
        .delete(`/jobs/${currentJob.job.id}`)
        .set("authorization", `Bearer ${u4Token}`);
    expect(resp.body).toEqual({ deleted: `${currentJob.job.id}` });
  });

  test("unauth for anon", async function () {
    let currentJob = await createAndGetJob();
    const resp = await request(app)
        .delete(`/jobs/${currentJob.job.id}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("not found for no such job", async function () {
    const resp = await request(app)
        .delete(`/jobs/100000000`)
        .set("authorization", `Bearer ${u4Token}`);
    expect(resp.statusCode).toEqual(404);
  });
});
