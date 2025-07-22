import verifyJWT from "./VerifyJWT.mjs";
import checkSubscriptionStatus from "../utils/Check-subscripton.mjs";
import ProductSubmissionCheck from "../utils/ProductSubmisionCheck.mjs";
import express from 'express';
import dotenv from 'dotenv';
dotenv.config();
import {  ObjectId } from 'mongodb';
import mongo from "../MongoDB.mjs";
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

//find submission check
router.get('/subscriber', async (req, res) => {
  try {
     console.log("Decoded user:", req.user);
    const subscriptionCheck = await checkSubscriptionStatus(req.user.email, db);
    if (!subscriptionCheck.ok) {
      return res.status(201).json({ ok: false, message: subscriptionCheck.message , subscription: subscriptionCheck.subscription  });
    }
    res.status(200).json({ ok: true, message: 'Subscription is active', subscription: subscriptionCheck.subscription });
  } catch (error) {
    console.error('Error checking subscription status:', error);
    res.status(500).json({ ok: false, message: 'Internal server error' });
  }
});
//send subscription status
router.patch('/sendsubscribe',async (req, res) => {
  try{
    const user  = req.user;
    console.log("Decoded userffffffffff:", user);

     if (!user?.email || !user?.username) {
      return res.status(400).json({ ok: false, message: 'Email and username are required' });
    }
    
    const result = await db.collection('subscribers').insertOne(
      { email: user.email, name: user.username, status: 'pending' }
    );

    if (!result) {
      return res.status(400).json({ ok: false, message: 'Failed to update subscription status' });
    }

    res.status(200).json({ ok: true, message: 'Subscription status updated successfully' }); 
  }catch (error) {
    console.error('Error updating subscription status:', error);
    res.status(500).json({ ok: false, message: 'Internal server error' });
  }
});

// disable product form
router.get('/disable-product-form', async (req, res) => {
  try {
    const res1 = await ProductSubmissionCheck(req.user.email, db);
    console.log("Product Submission Check Result:", res1);
    
    if (res1.ok) {
        const subscriptionCheck = await checkSubscriptionStatus(req.user.email, db);
        console.log("Subscription Check Result:", subscriptionCheck);
        if (!subscriptionCheck.ok) {
          return res.status(subscriptionCheck.status).json({ message:`${subscriptionCheck.message}.You can subscribe to a plan to add products.` });
        }
    }
    res.status(200).json({ message: 'Product form is enabled' });
  } catch (error) {
    console.error('❌ Error checking subscription status:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});


router.post('/add-product', async (req, res) => {
  try {
    const body = { ...req.body };
    // 🛡️ Sanitize and fix tags if needed
    const res1 = await ProductSubmissionCheck(req.user.email, db);
    if (res1.ok) {
        const subscriptionCheck = await checkSubscriptionStatus(req.user.email, db);
        if (!subscriptionCheck.ok) {
          return res.status(subscriptionCheck.status).json({ message:`${subscriptionCheck.message}.You can subscribe to a plan to add products.` });
        }
    }

    if (typeof body.tags === 'string') {
      try {
        console.log("Parsing tags from string:", body.tags);        
        const parsedTags = JSON.parse(body.tags);
        console.log("Parsed tags:", parsedTags);
        if (Array.isArray(parsedTags)) {
          body.tags = parsedTags;
          console.log("Tags after parsing:", body.tags);
        } else {
          body.tags = [];
          console.log("Parsed tags is not an array, resetting to empty array");
          
        }
      } catch (e) {
        console.error("Error parsing tags from string:", e);
        body.tags = [];
      }
    } else if (Array.isArray(body.tags)) {
      // convert [{ id: '0', text: 'React' }] => ['React']
      body.tags = body.tags.map((t) => t.text || t);
    } else {
      body.tags = [];
    }

    const product = {
      ...body,
      upvot:0,
      status:'pending',
      isfeatured: false,
      createdAt: new Date()
    };

    const result = await db.collection('products').insertOne(product);

    if (!result.acknowledged) {
      return res.status(400).json({ message: 'Failed to add product' });
    }

    console.log('✅ Product added:', product);
    res.status(201).json({ message: 'Product added successfully', product });
  } catch (error) {
    console.error('❌ Error adding product:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});




router.get('/single-product/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const product = await db.collection('products').findOne({ _id: new ObjectId(id) });
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.status(200).json(product);
  } catch (error) {
    console.error('Error fetching product details:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});



router.patch('/product/upvot/:id', verifyJWT, async (req, res) => {
  try {
    const productId = req.params.id;
    const userEmail = req.user.email;

/*     await db.collection('products').updateMany(
  { upvot: { $not: { $type: 'array' } } },
  { $set: { upvot: [] } }
); */

    const product = await db.collection('products').findOne({ _id: new ObjectId(productId) });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // ✅ Prevent owner from voting
    if (product.owner_mail === userEmail) {
      return res.status(403).json({ error: 'Owners cannot upvote their own product' });
    }

    // ✅ Prevent duplicate votes
    const alreadyVoted = product.upvot?.includes(userEmail);
    if (alreadyVoted) {
      return res.status(409).json({ error: 'You have already upvoted this product' });
    } 

    // ✅ Update upvote list
    const result = await db.collection('products').updateOne(
      { _id: new ObjectId(productId) },
      { $addToSet: { upvot: userEmail } } // avoids duplicates
    );

    res.status(200).json({ message: 'Product upvoted successfully', result });
  } catch (err) {
    console.error('Error upvoting product:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// Report a product (prevent owner from reporting)
router.post('/product/:id/report', async (req, res) => {
  try {
    const { id } = req.params;
    const email  = req.user.email;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    const reportcheck=await db.collection('report').findOne({report_id:id.toString()})
    const product = await db.collection('products').findOne({ _id: new ObjectId(id) });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Prevent owner from reporting
    if (product.owner_mail === email) {
      return res.status(403).json({ error: 'Owners cannot report their own product' });
    }
     if(!reportcheck){
         const result = await db.collection('report').insertOne({
          report_id: id.toString(),
          reports:[email],
          action:'pending'  
        }
       );

        return res.status(200).json({ message: 'Product reported successfully', result });   
     }
    // Add reports array if missing
    if (!Array.isArray(reportcheck.reports)) {
        reportcheck.reports = [];
    }

    // Prevent duplicate reports
    if (reportcheck.reports.includes(email)) {
      return res.status(409).json({ error: 'You have already reported this product' });
    }

    // Add user email to the reports array
    const result = await db.collection('report').updateOne(
      { report_id: id.toString() },
      { $addToSet: { reports: email } }
    );

    res.status(200).json({ message: 'Product reported successfully', result });

  } catch (error) {
    console.error('Error reporting product:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// POST /review - add review
router.post('/review', async (req, res) => {
  try {
    const {
      productId,
      reviewerName,
      reviewerImage,
      reviewText,
      rating
    } = req.body;

    const reviewerEmail = req.user?.email || req.body.reviewerEmail; // assuming auth middleware or sent manually
    if (!reviewerEmail || !productId || !reviewText || !rating) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Find the product
    const product = await db.collection('products').findOne({ _id: new ObjectId(productId) });
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // ❌ Block if the reviewer is the owner
    if (product.owner_mail === reviewerEmail) {
      return res.status(403).json({ error: 'Owners cannot review their own product' });
    }

    // ✅ Insert review
    const reviewDoc = {
      productId:productId.toString(),
      reviewerName,
      reviewerImage,
      reviewerEmail,
      reviewText,
      rating,
      createdAt: new Date()
    };
    const result = await db.collection('reviews').insertOne(reviewDoc);
    res.status(201).json({ message: 'Review submitted', insertedId: result.insertedId });

  } catch (error) {
    console.error('Review submission failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Fetch reviews by productId

router.get("/reviews/:id", async (req, res) => {
  try {
    const productId = req.params.id;

    // Fetch reviews by productId
    const reviews =await db.collection('reviews')
      .find({ productId: productId.toString() })
      .sort({ createdAt: -1 }) // newest first
      .toArray();

    res.send(reviews);
  } catch (error) {
    console.error("Failed to fetch reviews:", error);
    res.status(500).send({ error: "Failed to fetch reviews" });
  }
});




//all profile activities

router.get('/myproducts/:owner_mail', async (req, res) => {
  try {
    console.log(`Fetching products for user: ${req.params.owner_mail}`);
    const products = await db.collection('products').find({ owner_mail: req.params.owner_mail }).toArray();
    res.json(products);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: 'Failed to fetch products' });
  }
});


// Update a product
 router.patch('/update-product/:id', async (req, res) => { 
  try {
    console.log("Decoded req.user:", req.user);
    console.log("Request param ID:", req.params.id);
    console.log("Request body:", req.body);
    
    const updatedPost = await db.collection('products').findOneAndUpdate(
      { _id: new ObjectId(req.params.id), owner_mail: req?.user?.email },
      { $set: req.body },
      { new: true }
    );

    if (!updatedPost) {
      console.log("Unauthorized or product not found for update");
      return res.status(403).json({ message: 'Unauthorized or product not found' });
    }

    res.json({ message: 'Product updated successfully', updatedPost });
  } catch (err) {
    console.error('Error updating product:', err);
    res.status(500).json({ message: 'Failed to update product' });
  }
});

//Delete a product
router.delete('/delete-product/:id', async (req, res) => {
  try {
        console.log("Decoded req.user:", req.user);
        console.log("Request param ID:", req.params.id);

        const id = req.params.id;
        if (!ObjectId.isValid(id)) {
          return res.status(400).json({ message: "Invalid product ID" });
        }
    const deleted = await db.collection('products').findOneAndDelete({
      _id: new ObjectId(req.params.id),
      owner_mail: req.user.email
    });
    console.log(deleted);

    if (!deleted) {
      return res.status(403).json({ message: 'Unauthorized or product not found' });
    }

    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: 'Failed to delete product' });
  }
});



export default router;
