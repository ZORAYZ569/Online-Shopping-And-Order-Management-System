const { Builder, By, until } = require("selenium-webdriver");
const assert = require("assert");

(async function runTests() {
  const driver = await new Builder().forBrowser("chrome").build();
  try {
    await driver.get("http://localhost:3000");
    await driver.wait(until.elementLocated(By.id("loginForm")), 10000);

    // Admin login
    await driver.findElement(By.id("loginEmail")).sendKeys("admin@shop.test");
    await driver.findElement(By.id("loginPassword")).sendKeys("admin123");
    await driver.findElement(By.css("#loginForm button[type='submit']")).click();
    await driver.wait(until.elementLocated(By.id("catalogSection")), 10000);
    assert.strictEqual(await driver.findElement(By.id("catalogSection")).isDisplayed(), true);
    console.log("PASS: Admin login");

    // Product catalogue and search
    await driver.findElement(By.id("searchInput")).sendKeys("Notebook");
    await driver.findElement(By.css("#searchForm button")).click();
    await driver.wait(until.elementLocated(By.css("[data-add]")), 5000);
    console.log("PASS: Product search");

    // Admin product management
    await driver.findElement(By.id("adminNav")).click();
    await driver.findElement(By.id("productName")).sendKeys("Selenium Test Product");
    await driver.findElement(By.id("productDescription")).sendKeys("Created by automated test");
    await driver.findElement(By.id("productPrice")).sendKeys("99");
    await driver.findElement(By.id("productStock")).sendKeys("5");
    await driver.findElement(By.css("#productForm button")).click();
    await driver.wait(async () => (await driver.findElement(By.id("message")).getText()).includes("Product added"), 5000);
    console.log("PASS: Admin adds product");

    // Logout admin, register customer
    await driver.findElement(By.id("logoutBtn")).click();
    await driver.wait(until.elementLocated(By.id("registerForm")), 5000);
    const uniqueEmail = "selenium" + Date.now() + "@example.test";
    await driver.findElement(By.id("registerName")).sendKeys("Selenium Customer");
    await driver.findElement(By.id("registerEmail")).sendKeys(uniqueEmail);
    await driver.findElement(By.id("registerPassword")).sendKeys("test1234");
    await driver.findElement(By.css("#registerForm button")).click();
    await driver.wait(until.elementLocated(By.css("[data-add]")), 10000);
    console.log("PASS: Customer registration");

    // Add product to cart, update quantity, checkout and order history
    await driver.findElement(By.css("[data-add]")).click();
    await driver.findElement(By.id("cartNav")).click();
    await driver.wait(until.elementLocated(By.css("[data-qty]")), 5000);
    await driver.wait(async () => {
      try {
        const qty = await driver.findElement(By.css("[data-qty]"));
        await driver.executeScript(
          "const input = arguments[0]; input.value = '2'; input.dispatchEvent(new Event('change', { bubbles: true }));",
          qty
        );
        return true;
      } catch (error) {
        return false;
      }
    }, 5000);
    const checkoutButton = await driver.wait(async () => {
      try {
        const btn = await driver.findElement(By.id("checkoutBtn"));
        return (await btn.isDisplayed()) && (await btn.isEnabled()) ? btn : null;
      } catch (error) {
        return null;
      }
    }, 5000);
    await driver.executeScript("arguments[0].scrollIntoView({ block: 'center' }); arguments[0].click();", checkoutButton);
    await driver.wait(async () => (await driver.findElement(By.id("message")).getText()).includes("Order #"), 5000);
    console.log("PASS: Add to cart, update quantity and checkout");

    await driver.findElement(By.id("ordersNav")).click();
    await driver.wait(until.elementLocated(By.css(".order-card")), 5000);
    console.log("PASS: Order history");

    console.log("All Selenium tests completed successfully.");
  } catch (error) {
    console.error("Selenium test failed:", error);
    process.exitCode = 1;
  } finally {
    await driver.quit();
  }
})();
