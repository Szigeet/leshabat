// === פונקציות עזר חדשות ===
async function validateLoginAttempts(email) {
  try {
    // בדיקה כמה ניסיונות כושלים היו ב-15 הדקות האחרונות
    const timeLimit = new Date();
    timeLimit.setMinutes(timeLimit.getMinutes() - 15);

    const attemptsRef = collection(window.db, "login_attempts");
    const q = query(
      attemptsRef,
      where("email", "==", email),
      where("success", "==", false),
      orderBy("timestamp", "desc")
    );

    const snapshot = await getDocs(q);
    // נסנן את הניסיונות לפי תאריך בקוד
    const failedAttempts = snapshot.docs.filter((doc) => {
      const timestamp = new Date(doc.data().timestamp);
      return timestamp >= timeLimit;
    }).length;

    // אם יש יותר מ-5 ניסיונות כושלים
    if (failedAttempts >= 5) {
      throw new Error(
        "נחסמת זמנית עקב ניסיונות כושלים מרובים. נסה שוב בעוד 15 דקות"
      );
    }

    return true;
  } catch (error) {
    throw error;
  }
}

import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  limit,
  orderBy,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  // === אלמנטים ===
  const loginForm = document.getElementById("loginForm");
  const emailInput = document.getElementById("loginEmail");
  const passwordInput = document.getElementById("loginPassword");
  const rememberMeCheckbox = document.getElementById("rememberMe");
  const submitButton = loginForm.querySelector(".submit-btn");
  const togglePasswordBtn = document.querySelector(".toggle-password");

  // === הגדרת משתמשים מורשים (גיבוי) ===
  const authorizedUsers = [
    { email: "admin@test.com", password: "123456" },
    { email: "user@test.com", password: "123456" },
  ];

  // === הוספת סטיילים דינאמיים ===
  const loaderStyles = `
   .loader-overlay {
       position: fixed;
       top: 0;
       left: 0;
       width: 100%;
       height: 100%;
       background: rgba(0, 0, 0, 0.7);
       backdrop-filter: blur(8px);
       display: flex;
       justify-content: center;
       align-items: center;
       z-index: 1000;
       opacity: 0;
       transition: opacity 0.3s ease;
   }

   .loader-content {
       background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
       padding: 2.5rem 3rem;
       border-radius: 24px;
       text-align: center;
       color: white;
       box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
   }

   .loader {
       width: 60px;
       height: 60px;
       border: 4px solid rgba(255, 255, 255, 0.3);
       border-radius: 50%;
       border-top-color: white;
       animation: spin 1s linear infinite;
       margin: 0 auto 1.5rem;
   }

   .loader-content h2 {
       margin-bottom: 0.5rem;
       font-size: 1.5rem;
   }

   .loader-content p {
       opacity: 0.8;
   }

   @keyframes spin {
       to {
           transform: rotate(360deg);
       }
   }
`;

  // הוספת הסטיילים לדף
  const styleSheet = document.createElement("style");
  styleSheet.textContent = loaderStyles;
  document.head.appendChild(styleSheet);

  // === הצגת/הסתרת סיסמה ===
  togglePasswordBtn.addEventListener("click", () => {
    const type = passwordInput.type === "password" ? "text" : "password";
    passwordInput.type = type;

    // שינוי האייקון
    const icon = togglePasswordBtn.querySelector("i");
    icon.className = `fas fa-eye${type === "password" ? "" : "-slash"}`;
  });

  // === פונקציות עזר ===
  function showToast(message, type = "success") {
    // הסרת טוסטים קודמים
    const existingToasts = document.querySelectorAll(".toast");
    existingToasts.forEach((toast) => toast.remove());

    // יצירת טוסט חדש
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;

    const icon = type === "success" ? "check-circle" : "exclamation-circle";
    toast.innerHTML = `
       <i class="fas fa-${icon}"></i>
       <span>${message}</span>
   `;

    document.querySelector(".toast-container").appendChild(toast);

    // הסרה אוטומטית
    setTimeout(() => {
      toast.remove();
    }, 3000);
  }

  function showLoader() {
    const loader = document.createElement("div");
    loader.className = "loader-overlay";
    loader.innerHTML = `
       <div class="loader-content">
           <div class="loader"></div>
           <h2>מתחבר למערכת...</h2>
           <p>אנא המתן</p>
       </div>
   `;
    document.body.appendChild(loader);

    // אנימציית הופעה
    setTimeout(() => (loader.style.opacity = "1"), 0);
  }

  function hideLoader() {
    const loader = document.querySelector(".loader-overlay");
    if (loader) {
      // אנימציית נעלמות
      loader.style.opacity = "0";
      setTimeout(() => loader.remove(), 300);
    }
  }

  function simulateLoading() {
    return new Promise((resolve) => setTimeout(resolve, 1500));
  }

  function validateForm() {
    let isValid = true;
    let errorMessage = "";

    // בדיקת אימייל
    if (!emailInput.value) {
      errorMessage = "נא להזין כתובת אימייל";
      isValid = false;
    } else if (!emailInput.value.includes("@")) {
      errorMessage = "נא להזין כתובת אימייל תקינה";
      isValid = false;
    }

    // בדיקת סיסמה
    if (!passwordInput.value) {
      errorMessage = "נא להזין סיסמה";
      isValid = false;
    } else if (passwordInput.value.length < 6) {
      errorMessage = "הסיסמה חייבת להכיל לפחות 6 תווים";
      isValid = false;
    }

    if (!isValid) {
      showToast(errorMessage, "error");
    }

    return isValid;
  }

  // === פונקציות Firebase ===
  async function checkUserInDatabase(email, password) {
    try {
      console.log("Checking user in database:", { email, password });

      const usersRef = collection(window.db, "users");
      const q = query(usersRef, where("email", "==", email));
      const snapshot = await getDocs(q);

      console.log("Initial user query:", snapshot);

      if (!snapshot.empty) {
        const userData = snapshot.docs[0].data();
        console.log("Found user, checking password:", userData);

        if (userData.password === password) {
          console.log("Password match - login successful");
          return { ...userData, id: snapshot.docs[0].id };
        } else {
          console.log("Password mismatch");
          return null;
        }
      }

      console.log("No user found with this email");
      return null;
    } catch (error) {
      console.error("Unexpected error in checkUserInDatabase:", error);
      return null;
    }
  }

  async function updateLastLogin(userId) {
    try {
      console.log("Updating last login for user:", userId);
      const userRef = doc(window.db, "users", userId);
      await updateDoc(userRef, {
        last_login: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error updating last login:", error);
    }
  }

  async function checkTablePermissions() {
    try {
      const usersRef = collection(window.db, "users");
      const q = query(usersRef, limit(1));
      await getDocs(q);
      return true;
    } catch (error) {
      console.error("Permissions test failed:", error);
      return false;
    }
  }

  async function logLoginAttempt(email, success) {
    try {
      const ipResponse = await fetch("https://api.ipify.org?format=json");
      const ipData = await ipResponse.json();

      await addDoc(collection(window.db, "login_attempts"), {
        email,
        success: success ? "true" : "false",
        ip_address: ipData.ip,
        user_agent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error logging attempt:", error);
    }
  }

  // === טיפול בהתחברות ===
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    const email = emailInput.value;
    const password = passwordInput.value;
    const rememberMe = rememberMeCheckbox.checked;

    try {
      // בדיקת ניסיונות כושלים לפני ניסיון ההתחברות
      await validateLoginAttempts(email);

      showLoader();
      await simulateLoading();

      // בדיקת משתמש במסד הנתונים
      const dbUser = await checkUserInDatabase(email, password);

      if (dbUser) {
        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("userRole", dbUser.role);
        localStorage.setItem("userName", dbUser.full_name);
        localStorage.setItem("userId", dbUser.id);

        if (rememberMe) {
          localStorage.setItem("rememberedEmail", email);
        } else {
          localStorage.removeItem("rememberedEmail");
        }

        await updateLastLogin(dbUser.id);
        await logLoginAttempt(email, true);

        showToast("ההתחברות בוצעה בהצלחה!", "success");

        setTimeout(() => {
          window.location.href = "dashboard.html";
        }, 500);
      } else {
        // בדיקה במשתמשים המקומיים
        const localUser = authorizedUsers.find(
          (u) => u.email === email && u.password === password
        );

        if (localUser) {
          localStorage.setItem("isLoggedIn", "true");
          if (rememberMe) {
            localStorage.setItem("rememberedEmail", email);
          }

          await logLoginAttempt(email, true);
          showToast("ההתחברות בוצעה בהצלחה!", "success");

          setTimeout(() => {
            window.location.href = "dashboard.html";
          }, 500);
        } else {
          await logLoginAttempt(email, false);
          showToast("שם משתמש או סיסמה שגויים", "error");
        }
      }

      hideLoader();
    } catch (error) {
      hideLoader();
      showToast(error.message, "error");
      console.error("Login Error:", error);
    }
  });

  // === בדיקת זכור אותי בטעינה ===
  const rememberedEmail = localStorage.getItem("rememberedEmail");
  if (rememberedEmail) {
    emailInput.value = rememberedEmail;
    rememberMeCheckbox.checked = true;
  }

  // === ביטול הודעות שגיאה מובנות של הדפדפן ===
  document.addEventListener(
    "invalid",
    (e) => {
      e.preventDefault();
    },
    true
  );

  // === מניעת שליחה כפולה של הטופס ===
  window.onbeforeunload = () => {
    if (document.querySelector(".loader-overlay")) {
      return "פעולת ההתחברות בתהליך. האם אתה בטוח שברצונך לצאת?";
    }
  };

  // === ניטור שגיאות גלובלי ===
  window.onerror = function (msg, url, line, col, error) {
    console.error("Error: ", { msg, url, line, col, error });
    showToast("אירעה שגיאה במערכת", "error");
    return false;
  };
});
