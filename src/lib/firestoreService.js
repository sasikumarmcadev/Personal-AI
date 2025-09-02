// lib/firestoreService.js - FIXED VERSION
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';

// User management - FIXED VERSION
export const createOrUpdateUser = async (user) => {
  const userRef = doc(db, 'users', user.uid); // Use user.uid as document ID
  const userDoc = await getDoc(userRef);
  
  const userData = {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    updatedAt: serverTimestamp()
  };

  if (!userDoc.exists()) {
    userData.createdAt = serverTimestamp();
  }

  // Use setDoc with merge option instead of updateDoc
  await setDoc(userRef, userData, { merge: true });
  
  return {
    id: user.uid,
    ...userData
  };
};

// Get user data
export const getUserData = async (userId) => {
  const userRef = doc(db, 'users', userId);
  const userDoc = await getDoc(userRef);
  
  if (userDoc.exists()) {
    const data = userDoc.data();
    return {
      id: userDoc.id,
      uid: data.uid,
      email: data.email,
      displayName: data.displayName,
      photoURL: data.photoURL,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
      updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt
    };
  }
  return null;
};

// Chat session management
export const createChatSession = async (userId, title) => {
  const sessionData = {
    userId,
    title,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    messageCount: 0
  };

  const docRef = await addDoc(collection(db, 'chatSessions'), sessionData);
  
  return {
    id: docRef.id,
    userId,
    title,
    messageCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
};

export const getUserChatSessions = async (userId) => {
  const q = query(
    collection(db, 'chatSessions'),
    where('userId', '==', userId),
    orderBy('updatedAt', 'desc'),
    limit(50)
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      userId: data.userId,
      title: data.title,
      messageCount: data.messageCount || 0,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
      updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt
    };
  });
};

export const updateChatSessionTitle = async (sessionId, title) => {
  const sessionRef = doc(db, 'chatSessions', sessionId);
  await updateDoc(sessionRef, {
    title,
    updatedAt: serverTimestamp()
  });
};

export const updateChatSessionMessageCount = async (sessionId, messageCount) => {
  const sessionRef = doc(db, 'chatSessions', sessionId);
  await updateDoc(sessionRef, {
    messageCount,
    updatedAt: serverTimestamp()
  });
};

export const deleteChatSession = async (sessionId) => {
  // Delete all messages in the session first
  const messagesQuery = query(
    collection(db, 'messages'),
    where('sessionId', '==', sessionId)
  );
  
  const messagesSnapshot = await getDocs(messagesQuery);
  const deletePromises = messagesSnapshot.docs.map(doc => deleteDoc(doc.ref));
  await Promise.all(deletePromises);

  // Delete the session
  await deleteDoc(doc(db, 'chatSessions', sessionId));
};

// Message management - FIXED VERSION
export const addMessage = async (sessionId, message) => {
  const messageData = {
    sessionId,
    role: message.role,
    content: message.content,
    timestamp: message.timestamp ? new Date(message.timestamp) : serverTimestamp(),
    isStreaming: message.isStreaming || false
  };

  const docRef = await addDoc(collection(db, 'messages'), messageData);
  
  // Update session's updatedAt timestamp and increment message count
  const sessionRef = doc(db, 'chatSessions', sessionId);
  const sessionDoc = await getDoc(sessionRef);
  
  if (sessionDoc.exists()) {
    const currentMessageCount = sessionDoc.data().messageCount || 0;
    await updateDoc(sessionRef, {
      updatedAt: serverTimestamp(),
      messageCount: currentMessageCount + 1
    });
  }
  
  return {
    id: docRef.id,
    sessionId,
    role: message.role,
    content: message.content,
    timestamp: message.timestamp || new Date().toISOString(),
    isStreaming: message.isStreaming || false
  };
};

// FIXED updateMessage function to handle both string and object updates
export const updateMessage = async (messageId, updateData) => {
  const messageRef = doc(db, 'messages', messageId);
  
  let updateObj;
  
  if (typeof updateData === 'string') {
    // Legacy support: if updateData is a string, treat it as content
    updateObj = {
      content: updateData,
      timestamp: serverTimestamp(),
      isStreaming: false
    };
  } else {
    // New format: updateData is an object
    updateObj = {
      ...updateData,
      timestamp: updateData.timestamp ? new Date(updateData.timestamp) : serverTimestamp()
    };
  }
  
  console.log('Updating message:', messageId, updateObj); // Debug log
  
  await updateDoc(messageRef, updateObj);
  
  console.log('Message updated successfully in Firestore'); // Debug log
};

export const deleteMessage = async (messageId) => {
  await deleteDoc(doc(db, 'messages', messageId));
};

export const getSessionMessages = async (sessionId) => {
  const q = query(
    collection(db, 'messages'),
    where('sessionId', '==', sessionId),
    orderBy('timestamp', 'asc')
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      role: data.role,
      content: data.content,
      timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate().toISOString() : data.timestamp,
      isStreaming: data.isStreaming || false
    };
  });
};

// Real-time subscriptions - ENHANCED VERSION
export const subscribeToUserSessions = (userId, callback) => {
  const q = query(
    collection(db, 'chatSessions'),
    where('userId', '==', userId),
    orderBy('updatedAt', 'desc'),
    limit(50)
  );

  return onSnapshot(q, (querySnapshot) => {
    const sessions = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        title: data.title,
        messageCount: data.messageCount || 0,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt
      };
    });
    
    console.log('Sessions updated:', sessions.length); // Debug log
    callback(sessions);
  }, (error) => {
    console.error('Error in subscribeToUserSessions:', error);
    callback([]);
  });
};

export const subscribeToSessionMessages = (sessionId, callback) => {
  const q = query(
    collection(db, 'messages'),
    where('sessionId', '==', sessionId),
    orderBy('timestamp', 'asc')
  );

  return onSnapshot(q, (querySnapshot) => {
    const messages = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        role: data.role,
        content: data.content,
        timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate().toISOString() : data.timestamp,
        isStreaming: data.isStreaming || false
      };
    });
    
    console.log('Messages updated for session', sessionId, ':', messages.length); // Debug log
    callback(messages);
  }, (error) => {
    console.error('Error in subscribeToSessionMessages:', error);
    callback([]);
  });
};

// Subscribe to user data changes
export const subscribeToUserData = (userId, callback) => {
  const userRef = doc(db, 'users', userId);
  
  return onSnapshot(userRef, (doc) => {
    if (doc.exists()) {
      const data = doc.data();
      const userData = {
        id: doc.id,
        uid: data.uid,
        email: data.email,
        displayName: data.displayName,
        photoURL: data.photoURL,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt
      };
      callback(userData);
    } else {
      callback(null);
    }
  }, (error) => {
    console.error('Error in subscribeToUserData:', error);
    callback(null);
  });
};

// Analytics and user statistics
export const getUserStats = async (userId) => {
  const sessionsQuery = query(
    collection(db, 'chatSessions'),
    where('userId', '==', userId)
  );
  
  const sessionsSnapshot = await getDocs(sessionsQuery);
  const sessionCount = sessionsSnapshot.size;
  
  let totalMessages = 0;
  for (const sessionDoc of sessionsSnapshot.docs) {
    const sessionData = sessionDoc.data();
    totalMessages += sessionData.messageCount || 0;
  }
  
  return {
    sessionCount,
    totalMessages,
    avgMessagesPerSession: sessionCount > 0 ? Math.round(totalMessages / sessionCount * 100) / 100 : 0
  };
};

// Utility functions
export const generateSessionTitle = (message) => {
  const content = message.content.trim();
  if (content.length <= 50) {
    return content;
  }
  
  // Try to break at a word boundary
  const truncated = content.substring(0, 50);
  const lastSpaceIndex = truncated.lastIndexOf(' ');
  
  if (lastSpaceIndex > 30) {
    return truncated.substring(0, lastSpaceIndex) + '...';
  }
  
  return truncated + '...';
};

// Search functionality
export const searchUserSessions = async (userId, searchTerm) => {
  const q = query(
    collection(db, 'chatSessions'),
    where('userId', '==', userId),
    orderBy('updatedAt', 'desc')
  );
  
  const querySnapshot = await getDocs(q);
  const allSessions = querySnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      userId: data.userId,
      title: data.title,
      messageCount: data.messageCount || 0,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
      updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt
    };
  });
  
  // Filter sessions based on search term
  return allSessions.filter(session =>
    session.title.toLowerCase().includes(searchTerm.toLowerCase())
  );
};

export const searchMessages = async (userId, searchTerm, limit = 20) => {
  // First get all user sessions
  const userSessions = await getUserChatSessions(userId);
  const sessionIds = userSessions.map(session => session.id);
  
  if (sessionIds.length === 0) return [];
  
  // Search messages in batches (Firestore 'in' queries are limited to 10 values)
  const batchSize = 10;
  const batches = [];
  
  for (let i = 0; i < sessionIds.length; i += batchSize) {
    const batchSessionIds = sessionIds.slice(i, i + batchSize);
    const q = query(
      collection(db, 'messages'),
      where('sessionId', 'in', batchSessionIds),
      orderBy('timestamp', 'desc'),
      limit(limit)
    );
    batches.push(getDocs(q));
  }
  
  const batchResults = await Promise.all(batches);
  const allMessages = [];
  
  batchResults.forEach(querySnapshot => {
    querySnapshot.docs.forEach(doc => {
      const data = doc.data();
      allMessages.push({
        id: doc.id,
        sessionId: data.sessionId,
        role: data.role,
        content: data.content,
        timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate().toISOString() : data.timestamp,
        isStreaming: data.isStreaming || false
      });
    });
  });
  
  // Filter messages based on search term and sort by timestamp
  return allMessages
    .filter(message =>
      message.content.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
};