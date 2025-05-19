import app from "./config";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getDatabase, ref, get, set, remove,update } from "firebase/database";
import { User } from "./User";

const auth = getAuth(app);
const db = getDatabase(app);

const ADMIN_EMAIL = "admin@admin.com";

async function loginUser(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    if (userCredential.user.email === ADMIN_EMAIL) {
      console.log("Admin login successful");
      return true;
    }
    console.log("Not an admin user");
    return false;
  } catch (error) {
    console.error("Error logging in:", error.message);
    return false;
  }
}

async function readUserData(validateOnly = false) {
  try {
    const snapshot = await get(ref(db, "users/"));
    const users = [];
    
    const targetValidState = validateOnly;
    
    snapshot.forEach((childSnapshot) => {
      const userData = childSnapshot.val();
      
      if (userData.isUserValid === targetValidState) {
        const user = new User(
          userData.email,
          userData.firstName,
          userData.lastName,
          userData.phoneNumber,
          userData.licenseNumber,
          userData.isUserValid
        );
        users.push(user);
      }
    });
    
    return users;
    
  } catch (error) {
    console.error("Error in readUserData:", error);
    return [];
  }
}

async function readUserLocation() {
  try {
    const snapshot = await get(ref(db, "usersLocation/"));
    const usersLocation = [];
    snapshot.forEach((childSnapshot) => {
      const userLocation = {
        phoneNumber: childSnapshot.key,
        latitude: childSnapshot.val().latitude,
        longitude: childSnapshot.val().longitude,
      };
      usersLocation.push(userLocation);
    });
    return usersLocation;
  } catch (error) {
    console.error("Error in readUserLocation:", error);
    return [];
  }
}

async function validateUser(phoneNumber) {
  try {
    await set(ref(db, `users/${phoneNumber}/isUserValid`), true);
  } catch (error) {
    console.error("Error validating user:", error);
    throw error;
  }
}

async function deleteUserInDB(phoneNumber, email) {
  try {
    // First, ensure the admin is logged in
    const currentUser = auth.currentUser;
    if (!currentUser || currentUser.email !== ADMIN_EMAIL) {
      throw new Error("Unauthorized deletion attempt");
    }
    await remove(ref(db, `users/${phoneNumber}`));
    await remove(ref(db, `usersLocation/${phoneNumber}`));
    console.log("Successfully deleted user data from database");
  } catch (error) {
    console.error("Error deleting user:", error);
    throw error;
  }
}

async function writeEventLocation(latitude, longitude) {
  try {
    await set(ref(db, "eventLocation/"), {
      latitude: latitude,
      longitude: longitude,
    });
  } catch (error) {
    console.error("Error writing emergency location:", error);
    throw error;
  }
}
async function writeEventLocationByUser(phoneNumber, latitude, longitude) {
  try {
    const updates = {};
    updates['/eventlatitude'] = latitude;
    updates['/eventlongitude'] = longitude;
    update(ref(db,'usersLocation/' + phoneNumber), updates);

  } catch (error) {
    console.error("Error writing event location:", error);
    throw error;
  }
}
async function readEventLoaction() {
  try {
    const snapshot = await get(ref(db, "eventLocation/"));
    return snapshot.val();
  } catch (error) {
    console.error("Error reading event location:", error);
    return null;
  }
}

async function removeEventFromDB() {
  try {
    // First remove the eventLocation
    const eventLocationRef = ref(db, "eventLocation/");
    const updates = {
      latitude: 0,
      longitude: 0,
    };
    await update(eventLocationRef, updates);
    
    // Get all users
    const usersSnapshot = await get(ref(db, 'usersLocation/'));
    
    // For each user (phone number), update their coordinates
    const updatePromises = [];
    usersSnapshot.forEach((userSnapshot) => {
      const phoneNumber = userSnapshot.key;
      const userRef = ref(db, `usersLocation/${phoneNumber}`);
      
      const updates = {
        eventlatitude: 0,
        eventlongitude: 0
      };
      
      updatePromises.push(update(userRef, updates));
    });
    
    await Promise.all(updatePromises);
    
  } catch (error) {
    console.error("Error removing event location:", error);
    throw error;
  }
}

export {
  loginUser,
  readUserData,
  validateUser,
  deleteUserInDB,
  readUserLocation,
  writeEventLocation,
  writeEventLocationByUser,
  readEventLoaction,
  removeEventFromDB,
};
