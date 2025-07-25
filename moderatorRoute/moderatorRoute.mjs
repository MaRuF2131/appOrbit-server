import verifyJWT from "../utils/VerifyJWT.mjs";
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

//reported product
router.get('/report/products', async (req, res) => {
  try {
    const reports = await db.collection('report').find().toArray();
    const productIds = reports.map(r => new ObjectId(r.report_id));
    const products = await db.collection('products')
      .find({ _id: { $in: productIds } }).toArray();

    const merged = reports.map(report => {
      const product = products.find(p => p._id.toString() === report.report_id);
      return { ...report, product };
    });

    res.json(merged);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

//delete report and reported product 

router.delete('/delete-product-and-report/:productId/:reportId', async (req, res) => {
  const { productId, reportId } = req.params;

  try {
    const productResult = await db.collection('products').deleteOne({ _id: new ObjectId(productId) });
    const reportResult = await db.collection('report').deleteOne({ _id: new ObjectId(reportId) });

    if (productResult.deletedCount === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    if (reportResult.deletedCount === 0) {
      return res.status(404).json({ message: 'Report not found' });
    }

    res.status(200).json({
      message: 'Product and report deleted successfully',
      deletedProductId: productId,
      deletedReportId: reportId,
    });
  } catch (error) {
    console.error('Error deleting product and report:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});


///statistics

router.use('/stats',statistics());


export default router