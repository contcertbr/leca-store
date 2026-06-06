const { Firestore } = require('@google-cloud/firestore');
const db = new Firestore({
  projectId: process.env.GCP_PROJECT_ID,
});

const LEADS_COLLECTION = 'leads';
const PRODUCTS_CACHE_COLLECTION = 'products_cache';
const POST_HISTORY_COLLECTION = 'instagram_post_history';

async function addLead(leadData) {
  const docRef = await db.collection(LEADS_COLLECTION).add({
    ...leadData,
    timestamp: Firestore.FieldValue.serverTimestamp(),
  });
  return docRef.id;
}

async function getLeads() {
  const snapshot = await db.collection(LEADS_COLLECTION).orderBy('timestamp', 'desc').get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function cacheProduct(productId, productData) {
  await db.collection(PRODUCTS_CACHE_COLLECTION).doc(productId).set({
    ...productData,
    lastUpdated: Firestore.FieldValue.serverTimestamp(),
  });
}

async function getCachedProduct(productId) {
  const doc = await db.collection(PRODUCTS_CACHE_COLLECTION).doc(productId).get();
  return doc.exists ? doc.data() : null;
}

async function logInstagramPost(productId, instagramPostId, postUrl) {
  await db.collection(POST_HISTORY_COLLECTION).add({
    productId,
    instagramPostId,
    postUrl,
    timestamp: Firestore.FieldValue.serverTimestamp(),
  });
}

module.exports = {
  addLead,
  getLeads,
  cacheProduct,
  getCachedProduct,
  logInstagramPost,
};
