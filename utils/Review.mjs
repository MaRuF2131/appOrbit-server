import { ObjectId } from 'mongodb';
import mongo from '../MongoDB.mjs'; // Helper to get MongoDB connection

// ✅ PATCH /moderator/products/status/:id
export const updateProductStatus = async (req, res) => {
  try {
    const db = await mongo();
    const { id } = req.params;
    const { status } = req.body;

    if (!['accepted', 'pending', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const result = await db.collection('products').updateOne(
      { _id: new ObjectId(id) },
      { $set: { status } }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ message: 'Product not found or already updated' });
    }

    res.status(200).json({ message: 'Product status updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// 🌟 PATCH /moderator/products/feature/:id
export const markProductAsFeatured = async (req, res) => {
  try {
    const db = await mongo();
    const { id } = req.params;

    const result = await db.collection('products').updateOne(
      { _id: new ObjectId(id) },
      { $set: { isfeatured: true, status:'accepted'} }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ message: 'Product not found or already featured' });
    }

    res.status(200).json({ message: 'Product marked as featured' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
