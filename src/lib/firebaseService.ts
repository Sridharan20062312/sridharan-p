import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  onSnapshot,
  query,
  where,
  serverTimestamp,
  orderBy,
  limit,
  addDoc,
  deleteDoc
} from 'firebase/firestore';
import { db, auth } from './firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// User Profile
export async function getUserProfile(userId: string) {
  const path = `users/${userId}`;
  try {
    const docRef = doc(db, path);
    const docSnap = await getDoc(docRef);
    return docSnap.data();
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function createUserProfile(userId: string, data: any) {
  const path = `users/${userId}`;
  try {
    await setDoc(doc(db, path), {
      ...data,
      uid: userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateUserProfile(userId: string, data: any) {
  const path = `users/${userId}`;
  try {
    await updateDoc(doc(db, path), {
      ...data,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateLocation(userId: string, location: { latitude: number, longitude: number }) {
  const path = `users/${userId}`;
  try {
    await updateDoc(doc(db, path), {
      lastKnownLocation: {
        ...location,
        timestamp: new Date().toISOString()
      },
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// SOS Alerts
export async function createSOSAlert(data: { location: { latitude: number, longitude: number }, message?: string, targetGroup?: string }) {
  const path = 'alerts';
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');
    
    const userProfile = await getUserProfile(user.uid);
    
    return await addDoc(collection(db, path), {
      userId: user.uid,
      userName: user.displayName || 'Anonymous User',
      photoURL: userProfile?.photoURL || '',
      bio: userProfile?.bio || '',
      location: data.location,
      message: data.message || 'Emergency SOS Alert!',
      targetGroup: data.targetGroup || 'all',
      status: 'active',
      timestamp: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export function subscribeToActiveAlerts(callback: (alerts: any[]) => void) {
  const path = 'alerts';
  const q = query(collection(db, path), where('status', '==', 'active'), orderBy('timestamp', 'desc'), limit(50));
  
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
}

// Safe Zones
export async function addSafeZone(userId: string, data: any) {
  const path = `users/${userId}/safeZones`;
  try {
    return await addDoc(collection(db, path), {
      ...data,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export function subscribeToSafeZones(userId: string, callback: (zones: any[]) => void) {
  const path = `users/${userId}/safeZones`;
  return onSnapshot(collection(db, path), (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
}

export async function deleteSafeZone(userId: string, zoneId: string) {
  const path = `users/${userId}/safeZones/${zoneId}`;
  try {
    await deleteDoc(doc(db, path));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
