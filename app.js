// BANANA test system v0.2
// Step 2：LIFF + Firebase Firestore 寫入測試

const LIFF_ID = "2010390017-LUqEPvCz";

let currentProfile = null;

document.addEventListener("DOMContentLoaded", () => {
  initLiff();
});

async function initLiff() {
  const statusText = document.getElementById("statusText");
  const testButton = document.getElementById("testButton");
  const resultText = document.getElementById("resultText");

  try {
    statusText.textContent = "LIFF 初始化中...";

    await liff.init({
      liffId: LIFF_ID,
    });

    statusText.textContent = "LIFF 初始化成功";

    if (!liff.isLoggedIn()) {
      resultText.textContent = "尚未登入 LINE，正在導向登入...";
      liff.login();
      return;
    }

    currentProfile = await liff.getProfile();

    resultText.innerHTML = `
      <strong>LINE 資料取得成功</strong><br>
      userId：${currentProfile.userId}<br>
      displayName：${currentProfile.displayName}<br><br>
      請按下按鈕測試寫入 Firestore
    `;

    testButton.textContent = "寫入 Firestore 測試資料";

    testButton.addEventListener("click", writeFirestoreTest);
  } catch (error) {
    console.error("LIFF 初始化失敗：", error);

    statusText.textContent = "LIFF 初始化失敗";
    resultText.textContent = `錯誤訊息：${error.message}`;
  }
}

async function writeFirestoreTest() {
  const statusText = document.getElementById("statusText");
  const resultText = document.getElementById("resultText");

  if (!currentProfile) {
    resultText.textContent = "尚未取得 LINE profile，無法寫入 Firestore";
    return;
  }

  try {
    statusText.textContent = "Firestore 寫入中...";

    await db.collection("test").doc("liffTest").set({
      lineUserId: currentProfile.userId,
      displayName: currentProfile.displayName,
      source: "BANANA test system",
      testStatus: "success",
      role: "admin",
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    statusText.textContent = "Firestore 寫入成功";

    resultText.innerHTML = `
      <strong>Firestore 寫入成功</strong><br>
      collection：test<br>
      document：liffTest<br>
      lineUserId：${currentProfile.userId}<br>
      displayName：${currentProfile.displayName}
    `;
  } catch (error) {
    console.error("Firestore 寫入失敗：", error);

    statusText.textContent = "Firestore 寫入失敗";
    resultText.textContent = `錯誤訊息：${error.message}`;
  }
}
