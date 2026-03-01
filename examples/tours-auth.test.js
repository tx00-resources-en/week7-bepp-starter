const mongoose = require("mongoose");
const supertest = require("supertest");
const app = require("../app"); // Express app (already connects to DB)
const api = supertest(app);
const Tour = require("../models/tourModel");
const User = require("../models/userModel");

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

let token = null;

// Create a user and get a token before all tests
beforeAll(async () => {
  await User.deleteMany({});
  const result = await api.post("/api/users/signup").send({
    name: "John Doe",
    email: "john@example.com",
    password: "R3g5T7#gh",
    phone_number: "1234567890",
    gender: "Male",
    date_of_birth: "1990-01-01",
    membership_status: "Inactive",
  });
  token = result.body.token;
});

describe("Tour Routes", () => {
  // Seed tours via the API (so user_id is set by the controller)
  beforeEach(async () => {
    await Tour.deleteMany({});
    await Promise.all(
      tours.map((tour) =>
        api
          .post("/api/tours")
          .set("Authorization", "Bearer " + token)
          .send(tour)
      )
    );
  });

  // ────────────────── GET /api/tours (protected) ──────────────────
  describe("GET /api/tours", () => {
    describe("when the user is authenticated", () => {
      it("should return all tours as JSON with status 200", async () => {
        const response = await api
          .get("/api/tours")
          .set("Authorization", "Bearer " + token)
          .expect(200)
          .expect("Content-Type", /application\/json/);

        expect(response.body).toHaveLength(tours.length);
      });
    });

    describe("when the user is not authenticated", () => {
      it("should return 401 if no token is provided", async () => {
        await api.get("/api/tours").expect(401);
      });
    });
  });

  // ────────────────── GET /api/tours/:id (protected) ──────────────────
  describe("GET /api/tours/:id", () => {
    it("should return one tour by ID", async () => {
      const tour = await Tour.findOne();
      const response = await api
        .get(`/api/tours/${tour._id}`)
        .set("Authorization", "Bearer " + token)
        .expect(200)
        .expect("Content-Type", /application\/json/);

      expect(response.body.name).toBe(tour.name);
    });

    it("should return 404 for a non-existing tour ID", async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      await api
        .get(`/api/tours/${nonExistentId}`)
        .set("Authorization", "Bearer " + token)
        .expect(404);
    });
  });

  // ────────────────── POST /api/tours (protected) ──────────────────
  describe("POST /api/tours", () => {
    describe("when the user is authenticated", () => {
      it("should create a new tour with status 201", async () => {
        const newTour = {
          name: "Paris in 3 Days Tour",
          info: "Experience the beauty of Paris in just 3 days.",
          image: "https://www.course-api.com/images/tours/tour-3.jpeg",
          price: 1500,
        };

        const response = await api
          .post("/api/tours")
          .set("Authorization", "Bearer " + token)
          .send(newTour)
          .expect(201);

        expect(response.body.name).toBe(newTour.name);

        const toursAtEnd = await toursInDb();
        expect(toursAtEnd).toHaveLength(tours.length + 1);
      });
    });

    describe("when the user is not authenticated", () => {
      it("should return 401 if no token is provided", async () => {
        const newTour = {
          name: "Ghost Tour",
          info: "This should not be created.",
          image: "https://www.course-api.com/images/tours/ghost.jpeg",
          price: 999,
        };

        await api.post("/api/tours").send(newTour).expect(401);

        const toursAtEnd = await toursInDb();
        expect(toursAtEnd).toHaveLength(tours.length);
      });
    });
  });

  // ────────────────── PUT /api/tours/:id (protected) ──────────────────
  describe("PUT /api/tours/:id", () => {
    describe("when the user is authenticated", () => {
      it("should update the tour and return the updated document", async () => {
        const tour = await Tour.findOne();
        const updates = { info: "Updated tour information.", price: 2000 };

        const response = await api
          .put(`/api/tours/${tour._id}`)
          .set("Authorization", "Bearer " + token)
          .send(updates)
          .expect(200)
          .expect("Content-Type", /application\/json/);

        expect(response.body.info).toBe(updates.info);

        const updatedTour = await Tour.findById(tour._id);
        expect(updatedTour.price).toBe(updates.price);
      });
    });

    describe("when the user is not authenticated", () => {
      it("should return 401 if no token is provided", async () => {
        const tour = await Tour.findOne();
        await api
          .put(`/api/tours/${tour._id}`)
          .send({ info: "Nope" })
          .expect(401);
      });
    });
  });

  // ────────────────── DELETE /api/tours/:id (protected) ──────────────────
  describe("DELETE /api/tours/:id", () => {
    describe("when the user is authenticated", () => {
      it("should delete the tour and return status 204", async () => {
        const toursAtStart = await toursInDb();
        const tourToDelete = toursAtStart[0];

        await api
          .delete(`/api/tours/${tourToDelete._id}`)
          .set("Authorization", "Bearer " + token)
          .expect(204);

        const toursAtEnd = await toursInDb();
        expect(toursAtEnd).toHaveLength(toursAtStart.length - 1);
        expect(toursAtEnd.map((t) => t.name)).not.toContain(tourToDelete.name);
      });
    });

    describe("when the user is not authenticated", () => {
      it("should return 401 if no token is provided", async () => {
        const tour = await Tour.findOne();
        await api.delete(`/api/tours/${tour._id}`).expect(401);
      });
    });
  });
});

// Close DB connection once after all tests
afterAll(async () => {
  await mongoose.connection.close();
});
