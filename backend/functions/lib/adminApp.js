"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const admin = __importStar(require("firebase-admin"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
admin.initializeApp();
const db = admin.firestore();
const adminApp = (0, express_1.default)();
adminApp.use((0, cors_1.default)({ origin: true }));
adminApp.use(express_1.default.json());
// --- Middleware: verify Firebase ID token & admin role ---
async function requireAdmin(req, res, next) {
    try {
        const authHeader = req.headers.authorization || '';
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
        if (!token)
            return res.status(401).json({ ok: false, error: 'NO_TOKEN' });
        const decoded = await admin.auth().verifyIdToken(token, true);
        if (!decoded.admin)
            return res.status(403).json({ ok: false, error: 'NOT_ADMIN' });
        req.uid = decoded.uid;
        req.claims = decoded;
        return next();
    }
    catch (e) {
        return res.status(401).json({ ok: false, error: 'BAD_TOKEN', detail: e.message });
    }
}
adminApp.use('/admin', requireAdmin);
// --- GET /admin/users (list + filters) ---
adminApp.get('/admin/users', async (req, res) => {
    const { q, role, status, sort = 'lastLoginAt', dir = 'desc', limit = '25', cursor } = req.query;
    let ref = db.collection('users');
    if (role)
        ref = ref.where('role', '==', role);
    if (status)
        ref = ref.where('status', '==', status);
    if (q)
        ref = ref.where('email', '>=', q).where('email', '<=', q + '\uf8ff');
    ref = ref.orderBy(sort, dir.toLowerCase() === 'asc' ? 'asc' : 'desc')
        .limit(parseInt(limit));
    if (cursor) {
        const snap = await db.collection('users').doc(cursor).get();
        if (snap.exists)
            ref = ref.startAfter(snap.get(sort) ?? null);
    }
    const snap = await ref.get();
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ ok: true, data });
});
// --- GET /admin/users/:uid ---
adminApp.get('/admin/users/:uid', async (req, res) => {
    const doc = await db.collection('users').doc(req.params.uid).get();
    if (!doc.exists)
        return res.status(404).json({ ok: false, error: 'NOT_FOUND' });
    res.json({ ok: true, data: { id: doc.id, ...doc.data() } });
});
// --- POST /admin/users (create admin & invite) ---
adminApp.post('/admin/users', async (req, res) => {
    const { email, displayName, role = 'admin' } = req.body || {};
    if (!email)
        return res.status(400).json({ ok: false, error: 'EMAIL_REQUIRED' });
    // Only super_admin may create/upgrade admins
    const caller = req.claims;
    if (caller.role !== 'super_admin')
        return res.status(403).json({ ok: false, error: 'NEED_SUPER_ADMIN' });
    // Create Auth user
    const user = await admin.auth().createUser({ email, displayName, emailVerified: false, disabled: false });
    await admin.auth().setCustomUserClaims(user.uid, { admin: true, role });
    // Seed Firestore doc
    await db.collection('users').doc(user.uid).set({
        email, displayName: displayName || '', role, status: 'active',
        reportCount: 0, mfaEnabled: false, createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    // Generate password reset invite link (you can email it via your provider)
    const link = await admin.auth().generatePasswordResetLink(email);
    // Audit log
    await db.collection('auditLogs').add({
        actorUid: caller.uid, actorEmail: caller.email || null,
        action: 'INVITE_ADMIN', targetUid: user.uid, createdAt: admin.firestore.FieldValue.serverTimestamp(),
        before: null, after: { email, role }
    });
    res.json({ ok: true, data: { uid: user.uid, inviteLink: link } });
});
// --- POST /admin/users/:uid/reset ---
adminApp.post('/admin/users/:uid/reset', async (req, res) => {
    const { revokeTokens = true, sendReset = true } = req.body || {};
    const uid = req.params.uid;
    const user = await admin.auth().getUser(uid);
    if (revokeTokens)
        await admin.auth().revokeRefreshTokens(uid);
    let resetLink = null;
    if (sendReset && user.email)
        resetLink = await admin.auth().generatePasswordResetLink(user.email);
    // Log
    const caller = req.claims;
    await db.collection('auditLogs').add({
        actorUid: caller.uid, action: 'USER_RESET', targetUid: uid,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    res.json({ ok: true, data: { resetLink } });
});
// --- POST /admin/users/:uid/role ---
adminApp.post('/admin/users/:uid/role', async (req, res) => {
    const { role } = req.body || {};
    const uid = req.params.uid;
    const caller = req.claims;
    if (caller.role !== 'super_admin')
        return res.status(403).json({ ok: false, error: 'NEED_SUPER_ADMIN' });
    // Guardrail: never demote last super_admin
    if (role !== 'super_admin') {
        const supers = await db.collection('users').where('role', '==', 'super_admin').where('status', '==', 'active').get();
        if (supers.size <= 1 && uid === supers.docs[0]?.id) {
            return res.status(400).json({ ok: false, error: 'LAST_SUPER_ADMIN' });
        }
    }
    await admin.auth().setCustomUserClaims(uid, { admin: true, role });
    await db.collection('users').doc(uid).set({ role, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    await db.collection('auditLogs').add({
        actorUid: caller.uid, action: 'ROLE_CHANGE', targetUid: uid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(), after: { role }
    });
    res.json({ ok: true });
});
// --- POST /admin/users/:uid/suspend ---
adminApp.post('/admin/users/:uid/suspend', async (req, res) => {
    const { reason = '' } = req.body || {};
    const uid = req.params.uid;
    await admin.auth().updateUser(uid, { disabled: true });
    await db.collection('users').doc(uid).set({ status: 'suspended', updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    const caller = req.claims;
    await db.collection('auditLogs').add({
        actorUid: caller.uid, action: 'SUSPEND', targetUid: uid, reason,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    res.json({ ok: true });
});
// --- POST /admin/users/:uid/reactivate ---
adminApp.post('/admin/users/:uid/reactivate', async (req, res) => {
    const uid = req.params.uid;
    await admin.auth().updateUser(uid, { disabled: false });
    await db.collection('users').doc(uid).set({ status: 'active', updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    const caller = req.claims;
    await db.collection('auditLogs').add({
        actorUid: caller.uid, action: 'REACTIVATE', targetUid: uid,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    res.json({ ok: true });
});
// --- GET /admin/metrics/active-admins?window=24h ---
adminApp.get('/admin/metrics/active-admins', async (req, res) => {
    const window = req.query.window || '24h';
    const hours = parseInt(window.replace('h', '')) || 24;
    const since = admin.firestore.Timestamp.fromMillis(Date.now() - hours * 3600 * 1000);
    const snap = await db.collection('users')
        .where('role', 'in', ['admin', 'super_admin'])
        .where('lastActiveAt', '>=', since)
        .get();
    res.json({ ok: true, data: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
});
// --- POST /me/heartbeat (update lastActiveAt/lastLoginAt) ---
adminApp.post('/me/heartbeat', async (req, res) => {
    const claims = req.claims;
    const uid = claims.uid;
    const isLogin = !!req.body?.login; // send login:true right after successful login
    const patch = { lastActiveAt: admin.firestore.FieldValue.serverTimestamp() };
    if (isLogin)
        patch.lastLoginAt = admin.firestore.FieldValue.serverTimestamp();
    await db.collection('users').doc(uid).set(patch, { merge: true });
    res.json({ ok: true });
});
// --- GET /admin/overview ---
// Counts done server-side with Admin SDK; bypasses Firestore client rules
adminApp.get('/admin/overview', async (_req, res) => {
    try {
        const reports = db.collection('reports');
        const users = db.collection('users');
        // Admin SDK aggregate count (Firebase Admin v12+)
        const [total, pending, verified, usersTotal] = await Promise.all([
            reports.count().get(),
            reports.where('status', '==', 'pending').count().get(),
            reports.where('status', '==', 'verified').count().get(),
            users.count().get(),
        ]);
        res.json({
            ok: true,
            data: {
                totalReports: total.data().count,
                pendingReviews: pending.data().count,
                verifiedReports: verified.data().count,
                activeUsers: usersTotal.data().count,
            },
        });
    }
    catch (e) {
        res.status(500).json({ ok: false, error: e.message || 'OVERVIEW_FAILED' });
    }
});
exports.app = functions.region('asia-southeast1').https.onRequest(adminApp);
