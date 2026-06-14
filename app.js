// BANANA test system v0
// Step 1：LIFF 初始化測試

const LIFF_ID = "2010390017-LUqEPvCz";

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

    const profile = await liff.getProfile();

    resultText.innerHTML = `
      <strong>LINE 資料取得成功</strong><br>
      userId：${profile.userId}<br>
      displayName：${profile.displayName}
    `;

    testButton.textContent = "重新取得 LINE 資料";

    testButton.addEventListener("click", async () => {
      const newProfile = await liff.getProfile();

      resultText.innerHTML = `
        <strong>LINE 資料重新取得成功</strong><br>
        userId：${newProfile.userId}<br>
        displayName：${newProfile.displayName}
      `;
    });
  } catch (error) {
    console.error("LIFF 初始化失敗：", error);

    statusText.textContent = "LIFF 初始化失敗";
    resultText.textContent = `錯誤訊息：${error.message}`;
  }
}
