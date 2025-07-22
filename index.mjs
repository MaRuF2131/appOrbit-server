import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import authRouter from './CraeteJWT.mjs';
import PrivateRoute from './PrivateRoutePackage/PrivateRoute.mjs';
import mongo from './MongoDB.mjs';
import AdminRoute from './adminRoute/AdminRoute.mjs'
import ModeratorRoute from './moderatorRoute/moderatorRoute.mjs'
dotenv.config();
const app = express();
let db;
(async () => {
  try {

    db = await mongo()
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
  }
})();

app.use(cookieParser());
app.use(cors({origin:['https://cherity.web.app' ,'http://localhost:5173'],credentials:true ,allowedHeaders: ['Content-Type', 'Authorization', 'x-user','authorization']}));
app.use(express.json());




app.get('/',async (req ,res)=>{
    res.send('Hello World');
/*     db.collection("user_roles").find({}).forEach(function(doc) {
  if (typeof doc.createdAt === "string") {
    db.collection("user_roles").updateOne(
      { _id: doc._id },
      { $set: { createdAt: new Date(doc.createdAt) } }
    );
  } 
});*/

/* db.collection('products').insertMany(
   [
  {
    "product_name": "physical-fitness-app",
    "product_image": "https://i.postimg.cc/dDmFzY7N/images.png",
    "product_description": "A user-friendly mobile app designed to help individuals track workouts…",
    "product_links": "https://www.myfitnesspal.com",
    "tags": ["Fitness App", "Workout Tracker", "Health App", "Weight Loss"],
    "auth_token": "maruftomagdfhdjkfhfj-001",
    "owner_mail": "maruf210006@diit.edu.bd",
    "owner": "maruf ahmmed",
    "owner_profile": "https://lh3.googleusercontent.com/a/ACg8ocK8WxKNtZutU7i74_V440vWtQpLPS…",
    "upvot": 0,
    "status": "pending",
    "isfeatured": false,
    "createdAt": new Date("2025-07-20T0:0:22.906Z")
  },
  {
    "product_name": "physical-fitness-app",
    "product_image": "https://i.postimg.cc/dDmFzY7N/images.png",
    "product_description": "A user-friendly mobile app designed to help individuals track workouts…",
    "product_links": "https://www.myfitnesspal.com",
    "tags": ["Fitness App", "Workout Tracker", "Health App", "Weight Loss"],
    "auth_token": "maruftomagdfhdjkfhfj-002",
    "owner_mail": "maruf210006@diit.edu.bd",
    "owner": "maruf ahmmed",
    "owner_profile": "https://lh3.googleusercontent.com/a/ACg8ocK8WxKNtZutU7i74_V440vWtQpLPS…",
    "upvot": 0,
    "status": "accepted",
    "isfeatured": false,
    "createdAt": new Date("2025-07-20T12:00:00.000Z")
  },
  {
    "product_name": "physical-fitness-app",
    "product_image": "https://i.postimg.cc/dDmFzY7N/images.png",
    "product_description": "A user-friendly mobile app designed to help individuals track workouts…",
    "product_links": "https://www.myfitnesspal.com",
    "tags": ["Fitness App", "Workout Tracker", "Health App", "Weight Loss"],
    "auth_token": "maruftomagdfhdjkfhfj-003",
    "owner_mail": "maruf210006@diit.edu.bd",
    "owner": "maruf ahmmed",
    "owner_profile": "https://lh3.googleusercontent.com/a/ACg8ocK8WxKNtZutU7i74_V440vWtQpLPS…",
    "upvot": 0,
    "status": "accepted",
    "isfeatured": false,
    "createdAt": new Date("2025-07-20T09:35:00.000Z")
  },
  {
    "product_name": "physical-fitness-app",
    "product_image": "https://i.postimg.cc/dDmFzY7N/images.png",
    "product_description": "A user-friendly mobile app designed to help individuals track workouts…",
    "product_links": "https://www.myfitnesspal.com",
    "tags": ["Fitness App", "Workout Tracker", "Health App", "Weight Loss"],
    "auth_token": "maruftomagdfhdjkfhfj-004",
    "owner_mail": "maruf210006@diit.edu.bd",
    "owner": "maruf ahmmed",
    "owner_profile": "https://lh3.googleusercontent.com/a/ACg8ocK8WxKNtZutU7i74_V440vWtQpLPS…",
    "upvot": 0,
    "status": "accepted",
    "isfeatured": false,
    "createdAt": new Date("2025-07-20T14:45:00.000Z")
  },
  {
    "product_name": "physical-fitness-app",
    "product_image": "https://i.postimg.cc/dDmFzY7N/images.png",
    "product_description": "A user-friendly mobile app designed to help individuals track workouts…",
    "product_links": "https://www.myfitnesspal.com",
    "tags": ["Fitness App", "Workout Tracker", "Health App", "Weight Loss"],
    "auth_token": "maruftomagdfhdjkfhfj-005",
    "owner_mail": "maruf210006@diit.edu.bd",
    "owner": "maruf ahmmed",
    "owner_profile": "https://lh3.googleusercontent.com/a/ACg8ocK8WxKNtZutU7i74_V440vWtQpLPS…",
    "upvot": 0,
    "status": "accepted",
    "isfeatured": false,
    "createdAt": new Date("2025-07-20T08:15:00.000Z")
  }
]

) */

});



/// this is form product page
app.get('/products/search', async (req, res) => {
  const { page = 1, limit = 6, query = '' } = req.query;

  try {
    console.log("search");
    
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = {
      status: 'accepted',
      tags: { $regex: new RegExp(query, 'i') }
    };

    const total = await db.collection('products').countDocuments(filter);
    const products = await db.collection('products')
      .find(filter)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .toArray();

    res.send({ products, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Server Error' });
  }
});



app.post('/logout', async (req, res) => {

            res.clearCookie('token', {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'none',
              path: '/',
            });
            res.json({ message: 'Logged out successfully' });
});

app.use('/api/auth', authRouter);
app.use('/api/private', PrivateRoute);
app.use('/admin',AdminRoute)
app.use('/moderator',ModeratorRoute)

app.listen(process.env.PORT || 5000, () => {
  console.log(`Server is running on port ${process.env.PORT || 5000}`); 
});

export default app;