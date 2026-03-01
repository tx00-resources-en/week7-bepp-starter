const mongoose = require("mongoose");
const supertest = require("supertest");
const app = require("../app"); // Express app (already connects to DB)
const api = supertest(app);
const Tour = require("../models/tourModel");

// Seed data
const tours = [
  {
    name: "Helsinki in 5 Days Tour",
    info: "Discover the charm of Helsinki in 5 days with our expert guides.",
    image: "https://www.course-api.com/images/tours/tour-1.jpeg",
    price: 1900,
  },
  {
    name: "London in 7 Days Tour",
    info: "Explore the best of London in 7 days with our expert guides.",
    image: "https://www.course-api.com/images/tours/tour-2.jpeg",
    price: 2195,
  },
];

// Helper: read all tours straight from the DB
const toursInDb = async () => {
  const allTours = await Tour.find({});
  return allTours.map((t) => t.toJSON());
};

// Reset the tours collection before each test
beforeEach(async () => {
  await Tour.deleteMany({});
  await Tour.insertMany(tours);
});

// ────────────────── GET /api/tours ──────────────────
describe("GET /api/tours", () => {
  it("should return all tours as JSON with status 200", async () => {
    const response = await api
      .get("/api/tours")
      .expect(200)
      .expect("Content-Type", /application\/json/);

    expect(response.body).toHaveLength(tours.length);
  });

  it("should contain the first seed tour name", async () => {
    const response = await api.get("/api/tours");
    const names = response.body.map((t) => t.name);
    expect(names).toContain(tours[0].name);
  });
});

// ────────────────── GET /api/tours/:id ──────────────────
describe("GET /api/tours/:id", () => {
  it("should return one tour by ID", async () => {
    const tour = await Tour.findOne();
    const response = await api
      .get(`/api/tours/${tour._id}`)
      .expect(200)
      .expect("Content-Type", /application\/json/);

    expect(response.body.name).toBe(tour.name);
  });

  it("should return 404 for a non-existing tour ID", async () => {
    const nonExistentId = new mongoose.Types.ObjectId();
    await api.get(`/api/tours/${nonExistentId}`).expect(404);
  });

  it("should return 400 for an invalid tour ID format", async () => {
    const invalidId = "12345";
    await api.get(`/api/tours/${invalidId}`).expect(400);
  });
});

// ────────────────── POST /api/tours ──────────────────
describe("POST /api/tours", () => {
  describe("when the payload is valid", () => {
    it("should create a new tour with status 201", async () => {
      const newTour = {
        name: "Stockholm in 6 Days Tour",
        info: "Explore the best of Stockholm in 6 days with our expert guides.",
        image: "https://www.course-api.com/images/tours/tour-3.jpeg",
        price: 1700,
      };

      const response = await api
        .post("/api/tours")
        .send(newTour)
        .expect(201)
        .expect("Content-Type", /application\/json/);

      expect(response.body.name).toBe(newTour.name);

      const toursAtEnd = await toursInDb();
      expect(toursAtEnd).toHaveLength(tours.length + 1);
      expect(toursAtEnd.map((t) => t.name)).toContain(newTour.name);
    });
  });

  describe("when the payload is invalid", () => {
    it("should return 400 if required fields are missing", async () => {
      const incompleteTour = { name: "Missing Info Tour" };

      await api.post("/api/tours").send(incompleteTour).expect(400);

      const toursAtEnd = await toursInDb();
      expect(toursAtEnd).toHaveLength(tours.length);
    });
  });
});

// ────────────────── PUT /api/tours/:id ──────────────────
describe("PUT /api/tours/:id", () => {
  describe("when the id is valid", () => {
    it("should update the tour and return the updated document", async () => {
      const tour = await Tour.findOne();
      const updates = { info: "Updated info", price: 2500 };

      const response = await api
        .put(`/api/tours/${tour._id}`)
        .send(updates)
        .expect(200)
        .expect("Content-Type", /application\/json/);

      expect(response.body.info).toBe(updates.info);

      const updatedTour = await Tour.findById(tour._id);
      expect(updatedTour.price).toBe(updates.price);
    });
  });

  describe("when the id is invalid", () => {
    it("should return 400 for an invalid ID format", async () => {
      const invalidId = "12345";
      await api.put(`/api/tours/${invalidId}`).send({}).expect(400);
    });
  });
});

// ────────────────── DELETE /api/tours/:id ──────────────────
describe("DELETE /api/tours/:id", () => {
  describe("when the id is valid", () => {
    it("should delete the tour and return status 204", async () => {
      const toursAtStart = await toursInDb();
      const tourToDelete = toursAtStart[0];

      await api.delete(`/api/tours/${tourToDelete._id}`).expect(204);

      const toursAtEnd = await toursInDb();
      expect(toursAtEnd).toHaveLength(toursAtStart.length - 1);
      expect(toursAtEnd.map((t) => t.name)).not.toContain(tourToDelete.name);
    });
  });

  describe("when the id is invalid", () => {
    it("should return 400 for an invalid ID format", async () => {
      const invalidId = "12345";
      await api.delete(`/api/tours/${invalidId}`).expect(400);
    });
  });
});

// Close DB connection once after all tests
afterAll(async () => {
  await mongoose.connection.close();
});
