// BANANA test system v0.6
// Step 6：memberId 自動編號 + brands/products/counters

const LIFF_ID = "2010390017-LUqEPvCz";
const ADMIN_LINE_USER_ID = "U670542844997a75c503123bf06f4cfeb";

let currentProfile = null;
let currentMember = null;

document.addEventListener("DOMContentLoaded", () => {
  initLiff();

  document
    .getElementById("bindMemberButton")
    .addEventListener("click", bindMember);

  document
    .getElementById("editMemberButton")
    .addEventListener("click", showEditForm);

  document
    .getElementById("systemStatusButton")
    .addEventListener("click", showSystemStatus);

  document
    .getElementById("fixMemberIdButton")
    .addEventListener("click", fixCurrentMemberId);

  document
    .getElementById("createTestBrandButton")
    .addEventListener("click", createTestBrand);

  document
    .getElementById("createTestProductButton")
    .addEventListener("click", createTestProduct);

  document
    .getElementById("viewMembersButton")
    .addEventListener("click", viewCurrentMemberData);
});

async function initLiff() {
  const statusText = document.getElementById("statusText");
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

    document.getElementById("lineUserId").textContent = currentProfile.userId;
    document.getElementById("lineDisplayName").textContent =
      currentProfile.displayName;

    resultText.textContent = "LINE 資料取得成功，正在查詢會員資料...";

    await loadMember();
  } catch (error) {
    console.error("LIFF 初始化失敗：", error);

    statusText.textContent = "LIFF 初始化失敗";
    resultText.textContent = `錯誤訊息：${error.message}`;
  }
}

async function loadMember() {
  const statusText = document.getElementById("statusText");
  const resultText = document.getElementById("resultText");

  if (!currentProfile) {
    resultText.textContent = "尚未取得 LINE profile，無法查詢會員資料";
    return;
  }

  try {
    statusText.textContent = "查詢會員資料中...";

    const memberRef = db.collection("members").doc(currentProfile.userId);
    const memberDoc = await memberRef.get();

    if (!memberDoc.exists) {
      currentMember = null;

      statusText.textContent = "尚未綁定會員";
      resultText.textContent = "請填寫會員資料並按下綁定會員";

      showBindForm();
      hideAdminArea();
      return;
    }

    currentMember = memberDoc.data();

    if (!currentMember.memberId) {
      resultText.textContent = "會員尚未有編號，正在自動補上...";
      await ensureMemberId(currentProfile.userId);
      const refreshedDoc = await memberRef.get();
      currentMember = refreshedDoc.data();
    }

    statusText.textContent = "已綁定會員";

    if (currentMember.role === "admin") {
      resultText.textContent = "會員資料讀取成功，目前為管理者模式";
      await syncAdminData(currentMember);
      showAdminArea();
    } else {
      resultText.textContent = "會員資料讀取成功";
      hideAdminArea();
    }

    showMemberInfo(currentMember);
  } catch (error) {
    console.error("查詢會員資料失敗：", error);

    statusText.textContent = "查詢會員資料失敗";
    resultText.textContent = `錯誤訊息：${error.message}`;
  }
}

async function bindMember() {
  const statusText = document.getElementById("statusText");
  const resultText = document.getElementById("resultText");

  if (!currentProfile) {
    resultText.textContent = "尚未取得 LINE profile，無法綁定會員";
    return;
  }

  const realName = document.getElementById("realNameInput").value.trim();
  const nickname = document.getElementById("nicknameInput").value.trim();
  const phone = document.getElementById("phoneInput").value.trim();

  if (!realName) {
    resultText.textContent = "請輸入本名";
    return;
  }

  if (!phone) {
    resultText.textContent = "請輸入電話";
    return;
  }

  const role =
    currentProfile.userId === ADMIN_LINE_USER_ID ? "admin" : "member";

  try {
    statusText.textContent = "會員資料寫入中...";

    const memberRef = db.collection("members").doc(currentProfile.userId);
    const existingDoc = await memberRef.get();

    const memberData = {
      lineUserId: currentProfile.userId,
      displayName: currentProfile.displayName,
      realName: realName,
      nickname: nickname,
      phone: phone,
      role: role,
      status: "active",
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    };

    if (!existingDoc.exists) {
      memberData.memberId = await getNextId("members", "MB", 6);
      memberData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
    } else {
      const existingData = existingDoc.data();
      if (!existingData.memberId) {
        memberData.memberId = await getNextId("members", "MB", 6);
      }
    }

    await memberRef.set(memberData, { merge: true });

    if (role === "admin") {
      await syncAdminData({
        ...memberData,
        lineUserId: currentProfile.userId,
        displayName: currentProfile.displayName,
      });
    }

    statusText.textContent = "會員綁定成功";
    resultText.textContent = "會員資料已寫入 Firestore";

    await loadMember();
  } catch (error) {
    console.error("會員綁定失敗：", error);

    statusText.textContent = "會員綁定失敗";
    resultText.textContent = `錯誤訊息：${error.message}`;
  }
}

async function ensureMemberId(lineUserId) {
  const memberRef = db.collection("members").doc(lineUserId);

  await db.runTransaction(async (transaction) => {
    const memberDoc = await transaction.get(memberRef);

    if (!memberDoc.exists) {
      throw new Error("找不到會員資料，無法補上 memberId");
    }

    const memberData = memberDoc.data();

    if (memberData.memberId) {
      return;
    }

    const counterRef = db.collection("counters").doc("members");
    const counterDoc = await transaction.get(counterRef);

    let nextNumber = 1;

    if (counterDoc.exists) {
      const counterData = counterDoc.data();
      nextNumber = Number(counterData.currentNumber || 0) + 1;
    }

    const memberId = `MB-${String(nextNumber).padStart(6, "0")}`;

    transaction.set(
      counterRef,
      {
        counterName: "members",
        prefix: "MB",
        currentNumber: nextNumber,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    transaction.set(
      memberRef,
      {
        memberId: memberId,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  });
}

async function fixCurrentMemberId() {
  const statusText = document.getElementById("statusText");
  const resultText = document.getElementById("resultText");

  if (!assertAdmin()) {
    return;
  }

  try {
    statusText.textContent = "補上會員編號中...";

    await ensureMemberId(currentProfile.userId);
    await loadMember();

    statusText.textContent = "會員編號補上成功";
    resultText.textContent = `目前會員編號：${currentMember.memberId}`;
  } catch (error) {
    console.error("補上會員編號失敗：", error);

    statusText.textContent = "補上會員編號失敗";
    resultText.textContent = `錯誤訊息：${error.message}`;
  }
}

async function syncAdminData(member) {
  if (!member || member.role !== "admin") {
    return;
  }

  await db.collection("admins").doc(member.lineUserId).set(
    {
      memberId: member.memberId || "",
      lineUserId: member.lineUserId,
      displayName: member.displayName,
      realName: member.realName || "",
      nickname: member.nickname || "",
      phone: member.phone || "",
      role: "admin",
      status: "active",
      source: "BANANA test system",
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

function showBindForm() {
  document.getElementById("memberFormArea").style.display = "block";
  document.getElementById("memberInfoArea").style.display = "none";
}

function showMemberInfo(member) {
  document.getElementById("memberFormArea").style.display = "none";
  document.getElementById("memberInfoArea").style.display = "block";

  document.getElementById("savedMemberId").textContent =
    member.memberId || "尚未建立";
  document.getElementById("savedRealName").textContent = member.realName || "";
  document.getElementById("savedNickname").textContent = member.nickname || "";
  document.getElementById("savedPhone").textContent = member.phone || "";
  document.getElementById("savedRole").textContent = member.role || "member";
  document.getElementById("savedStatus").textContent = member.status || "active";
}

function showEditForm() {
  document.getElementById("memberFormArea").style.display = "block";
  document.getElementById("memberInfoArea").style.display = "none";

  if (!currentMember) {
    return;
  }

  document.getElementById("realNameInput").value =
    currentMember.realName || "";
  document.getElementById("nicknameInput").value =
    currentMember.nickname || "";
  document.getElementById("phoneInput").value = currentMember.phone || "";

  document.getElementById("resultText").textContent =
    "你可以修改資料後重新按下綁定會員";
}

function showAdminArea() {
  document.getElementById("adminArea").style.display = "block";
}

function hideAdminArea() {
  document.getElementById("adminArea").style.display = "none";
}

function assertAdmin() {
  if (!currentMember || currentMember.role !== "admin") {
    document.getElementById("resultText").textContent = "你沒有管理者權限";
    return false;
  }

  return true;
}

function showSystemStatus() {
  const resultText = document.getElementById("resultText");

  resultText.innerHTML = `
    <strong>系統狀態</strong><br>
    LIFF：正常<br>
    Firestore：正常<br>
    目前版本：BANANA test system v0.6<br>
    目前使用者：${currentProfile.displayName}<br>
    會員編號：${currentMember.memberId || "尚未建立"}<br>
    目前角色：${currentMember.role}<br>
    目前資料結構：members / admins / brands / products / counters
  `;
}

async function getNextId(counterName, prefix, padLength) {
  const counterRef = db.collection("counters").doc(counterName);

  return db.runTransaction(async (transaction) => {
    const counterDoc = await transaction.get(counterRef);

    let nextNumber = 1;

    if (counterDoc.exists) {
      const data = counterDoc.data();
      nextNumber = Number(data.currentNumber || 0) + 1;
    }

    transaction.set(
      counterRef,
      {
        counterName: counterName,
        prefix: prefix,
        currentNumber: nextNumber,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return `${prefix}-${String(nextNumber).padStart(padLength, "0")}`;
  });
}

async function createTestBrand() {
  const statusText = document.getElementById("statusText");
  const resultText = document.getElementById("resultText");

  if (!assertAdmin()) {
    return;
  }

  try {
    statusText.textContent = "建立測試品牌中...";

    const brandId = await getNextId("brands", "BR", 4);

    const brandData = {
      brandId: brandId,
      brandCode: "BANANA",
      brandName: "BANANA Test Brand",
      country: "Thailand",
      status: "active",
      source: "BANANA test system",
      createdBy: currentProfile.userId,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection("brands").doc(brandId).set(brandData);

    statusText.textContent = "測試品牌建立成功";

    resultText.innerHTML = `
      <strong>測試品牌建立成功</strong><br>
      collection：brands<br>
      document：${brandId}<br>
      brandCode：BANANA<br>
      brandName：BANANA Test Brand
    `;
  } catch (error) {
    console.error("建立測試品牌失敗：", error);

    statusText.textContent = "建立測試品牌失敗";
    resultText.textContent = `錯誤訊息：${error.message}`;
  }
}

async function getOrCreateBananaBrand() {
  const existingBrandQuery = await db
    .collection("brands")
    .where("brandCode", "==", "BANANA")
    .limit(1)
    .get();

  if (!existingBrandQuery.empty) {
    const doc = existingBrandQuery.docs[0];
    return doc.data();
  }

  const brandId = await getNextId("brands", "BR", 4);

  const brandData = {
    brandId: brandId,
    brandCode: "BANANA",
    brandName: "BANANA Test Brand",
    country: "Thailand",
    status: "active",
    source: "BANANA test system",
    createdBy: currentProfile.userId,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  };

  await db.collection("brands").doc(brandId).set(brandData);

  return brandData;
}

async function createTestProduct() {
  const statusText = document.getElementById("statusText");
  const resultText = document.getElementById("resultText");

  if (!assertAdmin()) {
    return;
  }

  try {
    statusText.textContent = "建立測試商品中...";

    const brand = await getOrCreateBananaBrand();
    const productId = await getNextId("products", "PD", 6);

    const productData = {
      productId: productId,
      brandId: brand.brandId,
      brandCode: brand.brandCode,
      brandName: brand.brandName,
      productName: "BANANA 測試商品",
      color: "Yellow",
      size: "Free",
      price: 100,
      currency: "TWD",
      status: "active",
      source: "BANANA test system",
      createdBy: currentProfile.userId,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection("products").doc(productId).set(productData);

    statusText.textContent = "測試商品建立成功";

    resultText.innerHTML = `
      <strong>測試商品建立成功</strong><br>
      collection：products<br>
      document：${productId}<br>
      brandId：${brand.brandId}<br>
      brandName：${brand.brandName}<br>
      商品名稱：BANANA 測試商品
    `;
  } catch (error) {
    console.error("建立測試商品失敗：", error);

    statusText.textContent = "建立測試商品失敗";
    resultText.textContent = `錯誤訊息：${error.message}`;
  }
}

function viewCurrentMemberData() {
  const resultText = document.getElementById("resultText");

  if (!currentMember) {
    resultText.textContent = "目前沒有會員資料";
    return;
  }

  resultText.innerHTML = `
    <strong>目前會員資料</strong><br>
    memberId：${currentMember.memberId || "尚未建立"}<br>
    lineUserId：${currentMember.lineUserId}<br>
    displayName：${currentMember.displayName}<br>
    realName：${currentMember.realName}<br>
    nickname：${currentMember.nickname}<br>
    phone：${currentMember.phone}<br>
    role：${currentMember.role}<br>
    status：${currentMember.status}
  `;
}