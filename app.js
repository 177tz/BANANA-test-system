// BANANA test system v0.4
// Step 4：會員查詢優化 + 建立 admins/{lineUserId}

const LIFF_ID = "2010390017-LUqEPvCz";
const ADMIN_LINE_USER_ID = "U670542844997a75c503123bf06f4cfeb";

let currentProfile = null;
let currentMember = null;

document.addEventListener("DOMContentLoaded", () => {
  initLiff();

  const bindMemberButton = document.getElementById("bindMemberButton");
  const editMemberButton = document.getElementById("editMemberButton");

  bindMemberButton.addEventListener("click", bindMember);
  editMemberButton.addEventListener("click", showEditForm);
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
    document.getElementById("lineDisplayName").textContent = currentProfile.displayName;

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

    const memberDoc = await db
      .collection("members")
      .doc(currentProfile.userId)
      .get();

    if (!memberDoc.exists) {
      currentMember = null;

      statusText.textContent = "尚未綁定會員";
      resultText.textContent = "請填寫會員資料並按下綁定會員";

      showBindForm();
      return;
    }

    currentMember = memberDoc.data();

    statusText.textContent = "已綁定會員";

    if (currentMember.role === "admin") {
      resultText.textContent = "會員資料讀取成功，目前為管理者模式";
      await syncAdminData(currentMember);
    } else {
      resultText.textContent = "會員資料讀取成功";
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
    currentProfile.userId === ADMIN_LINE_USER_ID
      ? "admin"
      : "member";

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
      memberData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
    }

    await memberRef.set(memberData, { merge: true });

    if (role === "admin") {
      await syncAdminData(memberData);
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

async function syncAdminData(member) {
  if (!member || member.role !== "admin") {
    return;
  }

  await db.collection("admins").doc(member.lineUserId).set(
    {
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

  document.getElementById("realNameInput").value = currentMember.realName || "";
  document.getElementById("nicknameInput").value = currentMember.nickname || "";
  document.getElementById("phoneInput").value = currentMember.phone || "";

  document.getElementById("resultText").textContent =
    "你可以修改資料後重新按下綁定會員";
}
