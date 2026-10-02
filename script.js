import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getFirestore,
  doc,
  onSnapshot,
  updateDoc,
  setDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCyW_fIfLs3wqoWViS9uPMzuRojvCJc7zk",
  authDomain: "table-tennis-0.firebaseapp.com",
  projectId: "table-tennis-0",
  storageBucket: "table-tennis-0.firebasestorage.app",
  messagingSenderId: "335736590594",
  appId: "1:335736590594:web:3459aaea73825e0720b21b"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);


// ============================================================
// 1. ПАРАМЕТРИ URL
// ============================================================

const urlParams = new URLSearchParams(window.location.search);

const role = urlParams.get("role");
const tableName = urlParams.get("table");

const isAdmin = role === "admin" || role === "superadmin";
const isSuperAdmin = role === "superadmin";


// ============================================================
// 2. ЕЛЕМЕНТИ СТОРІНКИ
// ============================================================

const board = document.getElementById("board");

const pA_point = document.querySelector(".player-a .point-val");
const pA_set = document.querySelector(".player-a .set-val");

const pB_point = document.querySelector(".player-b .point-val");
const pB_set = document.querySelector(".player-b .set-val");

const pA_name = document.querySelector(".player-a .name-input");
const pB_name = document.querySelector(".player-b .name-input");

const titleEl = document.getElementById("current-table-title");

const superadminPanel = document.getElementById("superadmin-panel");
const deleteTableBtn = document.getElementById("delete-this-table-btn");


// ============================================================
// 3. СТАН
// ============================================================

let matchRef = null;
let tableExists = false;


// ============================================================
// 4. ДОПОМІЖНІ ФУНКЦІЇ
// ============================================================

function showError(message) {
  console.error(message);

  if (titleEl) {
    titleEl.textContent = message;
  }
}


function setControlsDisabled(disabled) {
  document.querySelectorAll(".minus-btn").forEach(btn => {
    btn.disabled = disabled;
  });

  document.querySelectorAll(".name-input").forEach(input => {
    input.disabled = disabled;
  });

  const nextSetBtn = document.getElementById("next-set-btn");
  const resetBtn = document.getElementById("reset-btn");

  if (nextSetBtn) {
    nextSetBtn.disabled = disabled;
  }

  if (resetBtn) {
    resetBtn.disabled = disabled;
  }
}


function hideScoreControls() {
  document.querySelectorAll("button, .minus-btn").forEach(btn => {
    btn.classList.add("hidden");
  });

  document.querySelectorAll(".name-input").forEach(input => {
    input.disabled = true;
  });
}


async function safeUpdate(data) {
  if (!matchRef) {
    showError("Стіл не вибрано.");
    return false;
  }

  if (!tableExists) {
    showError("Цей стіл не існує або його вже видалили.");
    return false;
  }

  try {
    await updateDoc(matchRef, data);
    return true;

  } catch (error) {
    console.error("Помилка оновлення:", error);

    if (error.code === "permission-denied") {
      showError("Немає доступу до Firestore. Перевірте Rules.");
    } else if (error.code === "not-found") {
      tableExists = false;
      setControlsDisabled(true);
      showError("Цей стіл більше не існує.");
    } else {
      showError("Не вдалося оновити дані.");
    }

    return false;
  }
}


// ============================================================
// 5. ВИЗНАЧАЄМО, ЩО ВІДКРИТО
// ============================================================

// ------------------------------------------------------------
// SUPERADMIN БЕЗ СТОЛУ
// URL:
// ?role=superadmin
// ------------------------------------------------------------

if (isSuperAdmin && !tableName) {

  if (titleEl) {
    titleEl.textContent = "Керування столами";
  }

  if (superadminPanel) {
    superadminPanel.classList.remove("hidden");
  }

  if (deleteTableBtn) {
    deleteTableBtn.classList.add("hidden");
  }

}


// ------------------------------------------------------------
// SUPERADMIN ЗІ СТОЛОМ
// URL:
// ?table=table-1234&role=superadmin
// ------------------------------------------------------------

else if (isSuperAdmin && tableName) {

  if (titleEl) {
    titleEl.textContent = `Стіл: ${tableName}`;
  }

  if (superadminPanel) {
    superadminPanel.classList.remove("hidden");
  }

  if (deleteTableBtn) {
    deleteTableBtn.classList.remove("hidden");
  }

}


// ------------------------------------------------------------
// ADMIN
// URL:
// ?table=table-1234&role=admin
// ------------------------------------------------------------

else if (role === "admin" && tableName) {

  if (titleEl) {
    titleEl.textContent = `Стіл: ${tableName}`;
  }

}


// ------------------------------------------------------------
// ПУБЛІЧНЕ ТАБЛО
// URL:
// ?table=table-1234
// ------------------------------------------------------------

else if (!isAdmin && tableName) {

  if (titleEl) {
    titleEl.textContent = `Стіл: ${tableName}`;
  }

}


// ------------------------------------------------------------
// НЕМАЄ СТОЛУ В URL
// ------------------------------------------------------------

else {

  if (titleEl) {
    titleEl.textContent = isSuperAdmin
      ? "Керування столами"
      : "Стіл не вибрано";
  }

  if (!isSuperAdmin) {
    hideScoreControls();
  }

}


// ============================================================
// 6. ЛОГІКА СУПЕР-АДМІНА
// ============================================================

if (isSuperAdmin) {

  const createTableBtn = document.getElementById("create-table-btn");

  const linkContainer = document.getElementById("link-container");
  const generatedUrlInput = document.getElementById("generated-url");
  const copyLinkBtn = document.getElementById("copy-link-btn");


  // ----------------------------------------------------------
  // СТВОРЕННЯ НОВОГО СТОЛУ
  // ----------------------------------------------------------

  if (createTableBtn) {

    createTableBtn.addEventListener("click", async () => {

      createTableBtn.disabled = true;

      try {

        // Генеруємо номер столу
        const randomNum = Math.floor(1000 + Math.random() * 9000);

        const newTableName = `table-${randomNum}`;

        const newTableData = {
          isSwapped: false,

          playerA: {
            name: "Гравець 1",
            points: 0,
            sets: 0
          },

          playerB: {
            name: "Гравець 2",
            points: 0,
            sets: 0
          }
        };


        // Створюємо документ
        const newTableRef = doc(
          db,
          "matches",
          newTableName
        );

        await setDoc(
          newTableRef,
          newTableData
        );


        // Поточна адреса CodePen / сайту
        const currentUrl = window.location.href.split("?")[0];


        // Посилання для судді
        const judgeUrl =
          `${currentUrl}?table=${newTableName}&role=admin`;


        // Посилання для табло
        const scoreboardUrl =
          `${currentUrl}?table=${newTableName}`;


        // Виводимо посилання судді
        if (generatedUrlInput) {
          generatedUrlInput.value = judgeUrl;
        }

        if (linkContainer) {
          linkContainer.classList.remove("hidden");
        }

        if (copyLinkBtn) {
          copyLinkBtn.textContent = "📋 Скопіювати";
          copyLinkBtn.classList.remove("copied");
        }


        console.log("Створено стіл:", newTableName);
        console.log("Посилання судді:", judgeUrl);
        console.log("Посилання табло:", scoreboardUrl);

      } catch (error) {

        console.error(
          "Помилка створення столу:",
          error
        );

        if (error.code === "permission-denied") {

          alert(
            "Firebase не дозволив створити стіл.\n\n" +
            "Перевірте Firestore Rules."
          );

        } else {

          alert(
            "Не вдалося створити стіл.\n\n" +
            error.message
          );

        }

      } finally {

        createTableBtn.disabled = false;

      }

    });

  }


  // ----------------------------------------------------------
  // КОПІЮВАННЯ ПОСИЛАННЯ
  // ----------------------------------------------------------

  if (copyLinkBtn && generatedUrlInput) {

    copyLinkBtn.addEventListener("click", async () => {

      try {

        generatedUrlInput.select();
        generatedUrlInput.setSelectionRange(
          0,
          99999
        );

        await navigator.clipboard.writeText(
          generatedUrlInput.value
        );

        copyLinkBtn.textContent = "✅ Скопійовано!";
        copyLinkBtn.classList.add("copied");

      } catch (error) {

        console.error(
          "Не вдалося скопіювати:",
          error
        );

      }

    });

  }


  // ----------------------------------------------------------
  // ВИДАЛЕННЯ ПОТОЧНОГО СТОЛУ
  // ----------------------------------------------------------

  if (deleteTableBtn && tableName) {

    deleteTableBtn.addEventListener(
      "click",
      async () => {

        if (!matchRef) {
          alert("Стіл не знайдено.");
          return;
        }

        const confirmed = confirm(
          `Ви впевнені, що хочете НАЗАВЖДИ видалити ${tableName} з бази даних?`
        );

        if (!confirmed) {
          return;
        }


        deleteTableBtn.disabled = true;


        try {

          await deleteDoc(matchRef);

          tableExists = false;

          // Повертаємося на чисту сторінку супер-адміна
          window.location.search =
            "?role=superadmin";

        } catch (error) {

          console.error(
            "Помилка видалення столу:",
            error
          );

          if (error.code === "permission-denied") {

            alert(
              "Firebase заборонив видалення.\n\n" +
              "Перевірте Firestore Rules."
            );

          } else {

            alert(
              "Не вдалося видалити стіл."
            );

          }

          deleteTableBtn.disabled = false;

        }

      }
    );

  }

}


// ============================================================
// 7. ЯКЩО НЕ ADMIN — РОБИМО ТАБЛО READ ONLY
// ============================================================

if (!isAdmin) {
  hideScoreControls();
}


// ============================================================
// 8. ПІДКЛЮЧЕННЯ ДО КОНКРЕТНОГО СТОЛУ
// ============================================================

// ВАЖЛИВО:
// Якщо tableName немає — НЕ створюємо doc()
// і НЕ запускаємо onSnapshot().
//
// Саме це дозволяє нормально працювати,
// коли база повністю порожня.

if (tableName) {

  matchRef = doc(
    db,
    "matches",
    tableName
  );


  // ----------------------------------------------------------
  // REALTIME LISTENER
  // ----------------------------------------------------------

  onSnapshot(
    matchRef,

    (docSnap) => {

      // ----------------------------------------
      // СТОЛУ НЕМАЄ
      // ----------------------------------------

      if (!docSnap.exists()) {

        tableExists = false;

        if (titleEl) {
          titleEl.textContent =
            `Стіл "${tableName}" не існує або його видалили`;
        }

        // Забороняємо керування
        if (isAdmin) {
          setControlsDisabled(true);
        }

        return;
      }


      // ----------------------------------------
      // СТІЛ ІСНУЄ
      // ----------------------------------------

      tableExists = true;

      const data = docSnap.data();


      // Безпечне отримання даних
      const playerA = data.playerA || {};
      const playerB = data.playerB || {};


      // ----------------------------------------
      // РАХУНОК
      // ----------------------------------------

      if (pA_point) {
        pA_point.textContent =
          Number(playerA.points) || 0;
      }

      if (pA_set) {
        pA_set.textContent =
          Number(playerA.sets) || 0;
      }

      if (pB_point) {
        pB_point.textContent =
          Number(playerB.points) || 0;
      }

      if (pB_set) {
        pB_set.textContent =
          Number(playerB.sets) || 0;
      }


      // ----------------------------------------
      // ІМЕНА
      // ----------------------------------------

      if (pA_name) {
        pA_name.value =
          playerA.name || "Гравець 1";
      }

      if (pB_name) {
        pB_name.value =
          playerB.name || "Гравець 2";
      }


      // ----------------------------------------
      // ЗМІНА СТОРІН
      // ----------------------------------------

      if (board) {

        if (data.isSwapped === true) {
          board.classList.add("swapped");
        } else {
          board.classList.remove("swapped");
        }

      }


      // ----------------------------------------
      // ВМИКАЄМО КЕРУВАННЯ
      // ----------------------------------------

      if (isAdmin) {
        setControlsDisabled(false);
      }

    },


    // --------------------------------------------------------
    // ПОМИЛКА FIRESTORE LISTENER
    // --------------------------------------------------------

    (error) => {

      console.error(
        "Firestore listener error:",
        error
      );

      tableExists = false;


      if (error.code === "permission-denied") {

        showError(
          "Немає доступу до Firestore. Перевірте Rules."
        );

      } else {

        showError(
          "Не вдалося підключитися до столу."
        );

      }


      if (isAdmin) {
        setControlsDisabled(true);
      }

    }
  );

}


// ============================================================
// 9. ЛОГІКА КЕРУВАННЯ РАХУНКОМ
// ============================================================

if (isAdmin && tableName) {


  // ----------------------------------------------------------
  // ЗМІНА РАХУНКУ
  // ----------------------------------------------------------

  const updateScore = async (
    player,
    field,
    increment
  ) => {

    if (!tableExists) {

      showError(
        "Цей стіл не існує або його вже видалили."
      );

      return;
    }


    const selector =
      `.player-${player} .${field}-val`;

    const element =
      document.querySelector(selector);


    if (!element) {
      return;
    }


    const currentVal =
      parseInt(
        element.textContent,
        10
      ) || 0;


    const newVal =
      currentVal + increment;


    if (newVal < 0) {
      return;
    }


    const fieldName =
      `${field}s`;


    const playerName =
      `player${player.toUpperCase()}`;


    await safeUpdate({
      [`${playerName}.${fieldName}`]:
        newVal
    });

  };


  // ==========================================================
  // ГРАВЕЦЬ A
  // ==========================================================

  if (pA_point) {

    pA_point.addEventListener(
      "click",
      () => {
        updateScore(
          "a",
          "point",
          1
        );
      }
    );

  }


  const pA_pointMinus =
    document.querySelector(
      ".player-a .point-minus"
    );

  if (pA_pointMinus) {

    pA_pointMinus.addEventListener(
      "click",
      (e) => {

        e.stopPropagation();

        updateScore(
          "a",
          "point",
          -1
        );

      }
    );

  }


  if (pA_set) {

    pA_set.addEventListener(
      "click",
      () => {

        updateScore(
          "a",
          "set",
          1
        );

      }
    );

  }


  const pA_setMinus =
    document.querySelector(
      ".player-a .set-minus"
    );

  if (pA_setMinus) {

    pA_setMinus.addEventListener(
      "click",
      (e) => {

        e.stopPropagation();

        updateScore(
          "a",
          "set",
          -1
        );

      }
    );

  }


  // ==========================================================
  // ГРАВЕЦЬ B
  // ==========================================================

  if (pB_point) {

    pB_point.addEventListener(
      "click",
      () => {

        updateScore(
          "b",
          "point",
          1
        );

      }
    );

  }


  const pB_pointMinus =
    document.querySelector(
      ".player-b .point-minus"
    );

  if (pB_pointMinus) {

    pB_pointMinus.addEventListener(
      "click",
      (e) => {

        e.stopPropagation();

        updateScore(
          "b",
          "point",
          -1
        );

      }
    );

  }


  if (pB_set) {

    pB_set.addEventListener(
      "click",
      () => {

        updateScore(
          "b",
          "set",
          1
        );

      }
    );

  }


  const pB_setMinus =
    document.querySelector(
      ".player-b .set-minus"
    );

  if (pB_setMinus) {

    pB_setMinus.addEventListener(
      "click",
      (e) => {

        e.stopPropagation();

        updateScore(
          "b",
          "set",
          -1
        );

      }
    );

  }


  // ==========================================================
  // НАСТУПНА ПАРТІЯ
  // ==========================================================

  const nextSetBtn =
    document.getElementById(
      "next-set-btn"
    );


  if (nextSetBtn) {

    nextSetBtn.addEventListener(
      "click",
      async () => {

        if (!tableExists) {

          showError(
            "Цей стіл не існує або його вже видалили."
          );

          return;
        }


        const isCurrentlySwapped =
          board &&
          board.classList.contains(
            "swapped"
          );


        await safeUpdate({

          "playerA.points": 0,

          "playerB.points": 0,

          "isSwapped":
            !isCurrentlySwapped

        });

      }
    );

  }


  // ==========================================================
  // RESET
  // ==========================================================

  const resetBtn =
    document.getElementById(
      "reset-btn"
    );


  if (resetBtn) {

    resetBtn.addEventListener(
      "click",
      async () => {

        if (!tableExists) {

          showError(
            "Цей стіл не існує або його вже видалили."
          );

          return;
        }


        const confirmed =
          confirm(
            "Скинути матч до нуля?"
          );


        if (!confirmed) {
          return;
        }


        await safeUpdate({

          "playerA.points": 0,

          "playerA.sets": 0,

          "playerB.points": 0,

          "playerB.sets": 0,

          "isSwapped": false

        });

      }
    );

  }


  // ==========================================================
  // ІМЕНА ГРАВЦІВ
  // ==========================================================

  document
    .querySelectorAll(".name-input")
    .forEach((input, index) => {

      input.addEventListener(
        "change",
        async (e) => {

          if (!tableExists) {

            showError(
              "Цей стіл не існує або його вже видалили."
            );

            return;
          }


          const player =
            index === 0
              ? "playerA"
              : "playerB";


          const name =
            e.target.value.trim();


          await safeUpdate({

            [`${player}.name`]:
              name || (
                index === 0
                  ? "Гравець 1"
                  : "Гравець 2"
              )

          });

        }
      );

    });

}