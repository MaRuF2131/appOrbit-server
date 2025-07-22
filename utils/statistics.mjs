import express from 'express';
const router = express.Router();
import mongo from '../MongoDB.mjs';

let db;
(async () => {
  try {

    db = await mongo()
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
  }
})();

export default function createAdminStatsRoute() {
  router.get('/', async (req, res) => {
    try {
      const today = new Date();
      const last7Days = new Date(today);
      last7Days.setDate(today.getDate() - 5);
      last7Days.setHours(0, 0, 0, 0);

      console.log("start last 7 day",last7Days)

      const productsCollection = db.collection('products');
      const reviewsCollection = db.collection('reviews');
      const usersCollection = db.collection('user_roles');

      // Total Counts
      const totalPending = await productsCollection.countDocuments({ status: 'pending' });
      const totalAccepted = await productsCollection.countDocuments({ status: 'accepted' });
      const totalRejected = await productsCollection.countDocuments({ status: 'rejected' });
      const totalReviews = await reviewsCollection.countDocuments();
      const totalUsers = await usersCollection.countDocuments();
      const totalProducts = await productsCollection.countDocuments();
      /* console.log(totalPending,totalAccepted,totalProducts,totalReviews,totalUsers); */
      

      // Last 7 Days Daily Stats
      const formatDate = (d) => d.toISOString().split('T')[0];

      const pipeline = [
        {
          $match: {
            createdAt: { $gte: last7Days }
          }
        },
        {
          $project: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt",timezone: "Asia/Dhaka" } },
            status: 1
          }
        },
        {
          $group: {
            _id: "$date",
            pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
            accepted: { $sum: { $cond: [{ $eq: ["$status", "accepted"] }, 1, 0] } },
            rejected: { $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] } },
            products: { $sum: 1 }
          }
        }
      ];

      const productStats = await productsCollection.aggregate(pipeline).toArray();
      console.log('productStarts',productStats);
      

      const reviewStats = await reviewsCollection.aggregate([
        {
          $match: { createdAt: { $gte: last7Days } }
        },
        {
          $project: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt",timezone: "Asia/Dhaka" } }
          }
        },
        {
          $group: {
            _id: "$date",
            reviews: { $sum: 1 }
          }
        }
      ]).toArray();

      const userStats = await usersCollection.aggregate([
        {
          $match: { createdAt: { $gte: last7Days } }
        },
        {
          $project: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" ,timezone: "Asia/Dhaka"} }
          }
        },
        {
          $group: {
            _id: "$date",
            users: { $sum: 1 }
          }
        }
      ]).toArray();

      // Merge daily stats
      const dailyMap = {};

      for (let i = 0; i < 7; i++) {
        const date = new Date(last7Days);
           date.setDate(date.getDate() + i);
           console.log("date",date);
           
           const key = formatDate(date);
           dailyMap[key] = { date: key, users: 0, products: 0, pending: 0, accepted: 0, reviews: 0,rejected:0 };
      }

      productStats.forEach(stat => {
        console.log('stat',stat._id);
        
        if (dailyMap[stat._id]) {
          dailyMap[stat._id].products = stat.products;
          dailyMap[stat._id].pending = stat.pending;
          dailyMap[stat._id].accepted = stat.accepted;
          dailyMap[stat._id].rejected = stat.rejected;
        }
      });

      reviewStats.forEach(stat => {
        if (dailyMap[stat._id]) {
          dailyMap[stat._id].reviews = stat.reviews;
        }
      });

      userStats.forEach(stat => {
        if (dailyMap[stat._id]) {
          dailyMap[stat._id].users = stat.users;
        }
      });

      const dailyTrend = Object.values(dailyMap).sort((a, b) => new Date(a.date) - new Date(b.date));

      res.send({
        total: {
          pendingProducts: totalPending,
          acceptedProducts: totalAccepted,
          totalRejected,
          totalReviews,
          totalUsers,
          totalProducts
        },
        dailyTrend
      });
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      res.status(500).send({ message: 'Internal server error' });
    }
  });

  return router;
}
