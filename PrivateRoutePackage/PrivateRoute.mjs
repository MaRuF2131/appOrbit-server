import verifyJWT from "./VerifyJWT.mjs";
import checkSubscriptionStatus from "../utils/Check-subscripton.mjs";
import ProductSubmissionCheck from "../utils/ProductSubmisionCheck.mjs";
import express from 'express';
import dotenv from 'dotenv';
dotenv.config();
import { MongoClient, ObjectId, ServerApiVersion, Timestamp } from 'mongodb';
const router = express.Router();

const uri = process.env.MONGODB_URI;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let db;
(async () => {
  try {
    /* await client.connect(); */
    db = client.db('assignment-12');
    // Ensure the collection is created
    // Optional: Create index
    // await db.collection('users').createIndex({ email: 1 }, { unique: true });
    console.log("✅ MongoDB connected");
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



router.post('/request-volunteer', async (req, res) => {
  const requestData = req.body;

  try {
    const result = await db.collection("volunteer_requests").insertOne(requestData);
    
    if (!result.acknowledged) {
      return res.status(400).json({ message: 'Failed to insert volunteer request' });
    }

    // Decrease volunteersNeeded by 1
    await db.collection("volunteer").updateOne(
      { _id: new ObjectId(requestData.postId) },
      { $inc: { volunteersNeeded: -1 } }
    );

    res.status(201).json({ message: "Volunteer request submitted" });
  } catch (err) {
    if (err.code === 11000) {
      // Duplicate key error (unique index violation)
      return res.status(409).json({ message: "You have already requested for this post" });
    }

    console.error(err);
    res.status(500).json({ message: "Something went wrong" });
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

// Get all volunteer request posts by logged-in user
router.get('/my-request-posts/:email', async (req, res) => {
  try {
    const requests = await db.collection('volunteer_requests').find({ volunteerEmail: req.params.email }).toArray();
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch requests' });
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

// Cancel a volunteer request
router.delete('/cancel-volunteer-request/:id', async (req, res) => {
  try {
    const id = await db.collection('volunteer_requests').findOne({
      _id: new ObjectId(req.params.id),
      volunteerEmail: req.user.email
    });
    console.log(id);
    const deleted = await db.collection('volunteer_requests').findOneAndDelete({
      _id: new ObjectId(req.params.id),
      volunteerEmail: req.user.email
    });



   await db.collection("volunteer").updateOne(
      { _id: new ObjectId(id.postId) },
      { $inc: { volunteersNeeded: +1 } }
    );

    if (!deleted) {
      return res.status(403).json({ message: 'Unauthorized or request not found' });
    }

    res.json({ message: 'Request cancelled successfully' });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: 'Failed to cancel request' });
  }
});


export default router;
