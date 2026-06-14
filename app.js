// BANANA-test-system v0
// Step 0-1：GitHub Pages 前端骨架測試

document.addEventListener("DOMContentLoaded", () => {
  const statusText = document.getElementById("statusText");
  const testButton = document.getElementById("testButton");
  const resultText = document.getElementById("resultText");

  statusText.textContent = "GitHub Pages 前端骨架已建立";

  testButton.addEventListener("click", () => {
    resultText.textContent = "測試成功：前端 JavaScript 可以正常執行";
  });
});
