// utils/checkSubscription.js
const checkSubscriptionStatus = async (email, db) => {
  if (!email) {
    return { ok: false, status: 401, message: 'Unauthorized: No email provided' };
  }

  const user = await db.collection('subscribers').findOne({ email: email});

  const subscription = user ? user : null;

  if (!subscription || subscription.status !== 'active') {
    return { ok: false, status: 403, message: 'No active subscription found',subscription:subscription };
  }

  return { ok: true, status: 200, subscription };
};
export default checkSubscriptionStatus;
