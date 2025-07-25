import verifyJWT from "../utils/VerifyJWT.mjs";
import express, { Router } from 'express';
import dotenv from 'dotenv';
import mongo from "../MongoDB.mjs";
import rolecheck from "../utils/Rolecheck.mjs";
import statistics from '../utils/statistics.mjs'
import { ObjectId } from "mongodb";
dotenv.config();
const router = express.Router();

let db;
(async () => {
  try {

    db = await mongo()
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
  }
})();


//middleware to protect routes
router.use(verifyJWT);
router.use(express.json());
router.use(rolecheck)
router.use(async (req, res, next) => {
  if (req.role !== 'admin') {
    return res.status(403).json({ message: 'Only admins can access this route' });
  }
  next();
});


router.get('/users', async (req, res) => {
  try {
    const nameQuery = req.query.name || '';
    const users = await db.collection('user_roles')
      .find({ name: { $regex: `^${nameQuery}`, $options: 'i' } }) // 👈 ^ দিয়ে শুরুতে মিলবে
      .toArray();
    res.send(users);
  } catch (error) {
    res.status(500).send({ error: 'Failed to fetch users' });
  }
});


// 🟩 Make Admin
router.patch('/users/admin/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const result = await db.collection('user_roles').updateOne(
      { _id: new ObjectId(id) },
      { $set: { role: 'admin' } }
    );
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: 'Failed to make admin' });
  }
});

// 🟩 Make Moderator
router.patch('/users/moderator/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const result = await db.collection('user_roles').updateOne(
      { _id: new ObjectId(id) },
      { $set: { role: 'moderator' } }
    );
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: 'Failed to make moderator' });
  }
});

/// coupon manage

router.get("/coupons", async (req, res) => {
  try {
    const coupons = await db.collection("coupons").find().sort({ createdAt: -1 }).toArray();
    res.json(coupons);
  } catch (error) {
    res.status(500).json({ message: "Failed to get coupons", error });
  }
});

// POST add a new coupon
router.post("/coupons", async (req, res) => {
  try {
    const coupon = {
      code: req.body.code,
      expiryDate: new Date(req.body.expiryDate),
      description: req.body.description,
      discount: parseFloat(req.body.discount),
      createdAt: new Date(),
    };
    await db.collection("coupons").insertOne(coupon);
    res.status(201).json({ message: "Coupon added successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to add coupon", error });
  }
});

// DELETE a coupon
router.delete("/coupons/:id", async (req, res) => {
  try {
    const id = req.params.id;
    await db.collection("coupons").deleteOne({ _id: new ObjectId(id) });
    res.json({ message: "Coupon deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete coupon", error });
  }
});

// PATCH: Update a coupon
router.patch("/coupons/:id", async (req, res) => {
  const id = req.params.id;
  const updatedData = req.body;

  try {
    const result = await db.collection("coupons").updateOne(
      { _id: new ObjectId(id) },
      { $set: updatedData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).send({ message: "Coupon not found." });
    }

    res.send({ message: "Coupon updated successfully.", updatedId: id });
  } catch (error) {
    console.error("Error updating coupon:", error.message);
    res.status(500).send({ message: "Failed to update coupon.", error: error.message });
  }
});

///statistics

router.use('/stats',statistics());


export default router