import {
  collection,
  query,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// === ניהול מצב ===
const state = {
  products: [],
  isLoading: false,
  editingProductId: null,
};

// === בדיקת התחברות ===
function checkAuth() {
  if (!localStorage.getItem("isLoggedIn")) {
    window.location.href = "login.html";
    return false;
  }
  return true;
}

// === טעינת מוצרים ===
async function loadProducts() {
  try {
    console.log("טוען מוצרים...");
    showLoader();

    const q = query(collection(window.db, "products"));
    const snapshot = await getDocs(q);

    state.products = [];
    snapshot.forEach((doc) => {
      state.products.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    console.log(`נטענו ${state.products.length} מוצרים`);
    renderProducts();
    updateStats();
  } catch (error) {
    console.error("שגיאה בטעינת מוצרים:", error);
    showToast("שגיאה בטעינת המוצרים", "error");
  } finally {
    hideLoader();
  }
}

// === רינדור מוצרים ===
function renderProducts() {
  const tableBody = document.querySelector(".products-table tbody");
  if (!tableBody) return;

  tableBody.innerHTML = state.products.length
    ? state.products
        .map(
          (product) => `
          <tr>
              <td>
                  <div class="product-image">
                      <i class="fas fa-box"></i>
                  </div>
              </td>
              <td>${product.name || ""}</td>
              <td>${product.sku || "-"}</td>
              <td>₪${product.price || 0}</td>
              <td>${product.stock || 0}</td>
              <td>
                  <span class="status-badge ${
                    product.stock > 0 ? "active" : "inactive"
                  }">
                      ${product.stock > 0 ? "פעיל" : "אזל"}
                  </span>
              </td>
              <td class="actions">
                  <button class="action-btn edit" onclick="editProduct('${
                    product.id
                  }')">
                      <i class="fas fa-edit"></i>
                  </button>
                  <button class="action-btn delete" onclick="deleteProduct('${
                    product.id
                  }')">
                      <i class="fas fa-trash"></i>
                  </button>
              </td>
          </tr>
      `
        )
        .join("")
    : '<tr><td colspan="7" class="text-center">לא נמצאו מוצרים</td></tr>';
}

// === עדכון סטטיסטיקות ===
function updateStats() {
  const totalProducts = state.products.length;
  const outOfStock = state.products.filter((p) => p.stock === 0).length;
  const inStock = totalProducts - outOfStock;

  document.querySelector("#total-products .stats-number").textContent =
    totalProducts;
  document.querySelector("#out-of-stock .stats-number").textContent =
    outOfStock;
  document.querySelector("#in-stock .stats-number").textContent = inStock;
}

// === טיפול במוצר ===
async function handleProductSubmit(event) {
  event.preventDefault();
  showLoader();

  try {
    const formData = new FormData(event.target);
    const productData = {
      name: formData.get("name"),
      sku: formData.get("sku"),
      price: Number(formData.get("price")),
      stock: Number(formData.get("stock")),
      description: formData.get("description"),
      updatedAt: new Date().toISOString(),
    };

    if (state.editingProductId) {
      await updateDoc(
        doc(window.db, "products", state.editingProductId),
        productData
      );
      showToast("המוצר עודכן בהצלחה");
    } else {
      await addDoc(collection(window.db, "products"), productData);
      showToast("המוצר נוסף בהצלחה");
    }

    closeModal();
    await loadProducts();
  } catch (error) {
    console.error("שגיאה בשמירת המוצר:", error);
    showToast("שגיאה בשמירת המוצר", "error");
  } finally {
    hideLoader();
    state.editingProductId = null;
  }
}

// === פונקציות עזר ===
function showLoader() {
  const loader = document.createElement("div");
  loader.className = "loading-overlay";
  loader.innerHTML = `
      <div class="loader-content">
          <div class="loader"></div>
          <h2>טוען...</h2>
      </div>
  `;
  document.body.appendChild(loader);
}

function hideLoader() {
  const loader = document.querySelector(".loading-overlay");
  if (loader) loader.remove();
}

function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `
      <i class="fas fa-${
        type === "success" ? "check-circle" : "exclamation-circle"
      }"></i>
      <span>${message}</span>
  `;

  const container = document.querySelector(".toast-container");
  if (container) {
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }
}

function openModal(productId = null) {
  state.editingProductId = productId;
  const modal = document.getElementById("productModal");
  const form = modal.querySelector(".product-form");

  if (productId) {
    const product = state.products.find((p) => p.id === productId);
    if (product) {
      form.name.value = product.name || "";
      form.sku.value = product.sku || "";
      form.price.value = product.price || "";
      form.stock.value = product.stock || "";
      form.description.value = product.description || "";
      modal.querySelector("h2").textContent = "עריכת מוצר";
    }
  } else {
    form.reset();
    modal.querySelector("h2").textContent = "הוספת מוצר חדש";
  }

  modal.style.display = "flex";
}

function closeModal() {
  const modal = document.getElementById("productModal");
  if (modal) {
    modal.style.display = "none";
    modal.querySelector(".product-form").reset();
    state.editingProductId = null;
  }
}

// === אתחול אירועים ===
function initEventListeners() {
  // תפריט
  document.querySelector(".menu-toggle")?.addEventListener("click", () => {
    document.querySelector(".sidebar")?.classList.add("active");
  });

  document.querySelector(".mobile-close")?.addEventListener("click", () => {
    document.querySelector(".sidebar")?.classList.remove("active");
  });

  // מודל
  document
    .querySelector(".add-product-btn")
    ?.addEventListener("click", () => openModal());
  document.querySelector(".close-modal")?.addEventListener("click", closeModal);
  document.querySelector(".cancel-btn")?.addEventListener("click", closeModal);
  document
    .querySelector(".product-form")
    ?.addEventListener("submit", handleProductSubmit);

  // חיפוש
  document.querySelector(".search-input")?.addEventListener("input", (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const filtered = state.products.filter(
      (product) =>
        product.name?.toLowerCase().includes(searchTerm) ||
        product.sku?.toLowerCase().includes(searchTerm)
    );
    renderProducts(filtered);
  });

  // התנתקות
  document.querySelector(".logout-btn")?.addEventListener("click", () => {
    localStorage.clear();
    window.location.href = "login.html";
  });

  // סגירת מודל בלחיצה מחוץ
  window.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal")) {
      closeModal();
    }
  });
}

// === פונקציות גלובליות ===
window.editProduct = (productId) => {
  openModal(productId);
};

window.deleteProduct = async (productId) => {
  if (!confirm("האם אתה בטוח שברצונך למחוק מוצר זה?")) return;

  try {
    showLoader();
    await deleteDoc(doc(window.db, "products", productId));
    showToast("המוצר נמחק בהצלחה");
    await loadProducts();
  } catch (error) {
    console.error("שגיאה במחיקת המוצר:", error);
    showToast("שגיאה במחיקת המוצר", "error");
  } finally {
    hideLoader();
  }
};

// === אתחול האפליקציה ===
document.addEventListener("DOMContentLoaded", () => {
  if (!checkAuth()) return;

  // עדכון פרטי משתמש
  document.querySelector(".user-name").textContent =
    localStorage.getItem("userName") || "משתמש";
  document.querySelector(".user-role").textContent =
    localStorage.getItem("userRole") || "מנהל";

  initEventListeners();
  loadProducts();
});
