import verifyJWT from "../PrivateRoutePackage/VerifyJWT.mjs";
import express, { Router } from 'express';
import dotenv from 'dotenv';
import mongo from "../MongoDB.mjs";
import rolecheck from "../utils/Rolecheck.mjs";
import statistics from '../utils/statistics.mjs'
import { updateProductStatus, markProductAsFeatured } from '../utils/Review.mjs'
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
  if (req.role !== 'moderator') {
    return res.status(403).json({ message: 'Only moderator can access this route' });
  }
  next();
});


router.get('/allproducts', async (req, res) => {
  try {
    const nameQuery = req.query.name || '';
    const products = await db.collection('products')
      .find({ product_name: { $regex: `^${nameQuery}`, $options: 'i' } }) // 👈 ^ দিয়ে শুরুতে মিলবে
      .toArray();
    res.send(products);
  } catch (error) {
    res.status(500).send({ error: 'Failed to fetch users' });
  }
});


// PATCH: Update product status (pending → approved/rejected)
router.patch('/products/status/:id', updateProductStatus);

// PATCH: Mark a product as featured
router.patch('/products/feature/:id', markProductAsFeatured);

///statistics

router.use('/stats',statistics());


export default router