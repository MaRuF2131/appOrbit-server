// utils/checkSubscription.js
const ProductSubmissionCheck = async (email, db) => {
  if (!email) {
    return { ok: false, status: 401, message: 'Unauthorized: No email provided' };
  }

  const product = await db.collection('products').findOne({ owner_mail: email });
  if (!product) {
    return { ok: false, status: 402, message: 'Product not found' };
  }

  return { ok: true, status: 200, product };
};
export default ProductSubmissionCheck;
