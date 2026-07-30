const http = require("http");

function request(options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => resolve({ statusCode: res.statusCode, headers: res.headers, body: data }));
    });
    req.on("error", reject);
    if (body) req.write(typeof body === "string" ? body : JSON.stringify(body));
    req.end();
  });
}

function getLocalDateSeedServer() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function generate24HourDeterministicCodeServer(identifier) {
  let hash = 0;
  const str = `${identifier}:${getLocalDateSeedServer()}:inspire_2026_static_secret_key`;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const numericVal = Math.abs(hash);
  return (100000 + (numericVal % 900000)).toString();
}

async function runTests() {
  const authPin = generate24HourDeterministicCodeServer("pin_9059068384");
  const admin1Pin = generate24HourDeterministicCodeServer("pin_admin1");
  const accPin = generate24HourDeterministicCodeServer("pin_accountant");

  // 1. Authenticator login
  const authLogin = await request({
    hostname: "localhost", port: 3000, path: "/api/auth/login", method: "POST",
    headers: { "Content-Type": "application/json" }
  }, { identifier: "9059068384", password: "auth#2026-inspire", pin: authPin, loginContext: "authenticator" });
  const authData = JSON.parse(authLogin.body);
  const authToken = authData.token;

  // 2. Accountant login
  const accLogin = await request({
    hostname: "localhost", port: 3000, path: "/api/auth/login", method: "POST",
    headers: { "Content-Type": "application/json" }
  }, { identifier: "accountant", password: "AccE1#4102", pin: accPin, loginContext: "universal" });
  const accData = JSON.parse(accLogin.body);
  const accToken = accData.token;

  // 3. Admin1 login
  const admin1Login = await request({
    hostname: "localhost", port: 3000, path: "/api/auth/login", method: "POST",
    headers: { "Content-Type": "application/json" }
  }, { identifier: "admin1", password: "RectorPass#2026", pin: admin1Pin, loginContext: "universal" });
  const admin1Data = JSON.parse(admin1Login.body);
  const admin1Token = admin1Data.token;

  // 4. Admin2 login
  const admin2Pin = generate24HourDeterministicCodeServer("pin_admin2_erragattugutta_c1");
  const admin2Login = await request({
    hostname: "localhost", port: 3000, path: "/api/auth/login", method: "POST",
    headers: { "Content-Type": "application/json" }
  }, { identifier: "admin2_erragattugutta_c1", password: "DeanE1#8492", pin: admin2Pin, loginContext: "universal" });
  const admin2Data = JSON.parse(admin2Login.body);

  console.log("=== STEP 1 & 2: WIPE DATABASE PASSCODE & REDACTION ===");
  const testBypasses = ["9-0-5-9-0-6-8-3-8-4", "9#5#0#8#8#", "9059068384"];
  for (const bp of testBypasses) {
    const res = await request({
      hostname: "localhost", port: 3000, path: "/api/authenticator/wipe-database", method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${authToken}` }
    }, { securityPin: bp });
    console.log(`Bypass '${bp.replace(/./g, "•")}' -> HTTP ${res.statusCode}: ${res.body}`);
  }
  const realWipeRes = await request({
    hostname: "localhost", port: 3000, path: "/api/authenticator/wipe-database", method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${authToken}` }
  }, { securityPin: "auth#2026-inspire" });
  console.log(`Real Password ('••••••••••••') -> HTTP ${realWipeRes.statusCode}: ${realWipeRes.body}`);

  console.log("\n=== STEP 3: CORS REJECTION TEST ===");
  const evilCors = await request({
    hostname: "localhost", port: 3000, path: "/api/auth/verify-credentials", method: "POST",
    headers: { "Content-Type": "application/json", "Origin": "https://evil-example.com" }
  }, { identifier: "admin1", password: "••••••••" });
  console.log(`Evil origin (https://evil-example.com) -> HTTP ${evilCors.statusCode}: ${evilCors.body}`);

  const goodCors = await request({
    hostname: "localhost", port: 3000, path: "/api/auth/verify-credentials", method: "POST",
    headers: { "Content-Type": "application/json", "Origin": "http://localhost:3000" }
  }, { identifier: "admin1", password: "RectorPass#2026" });
  console.log(`Allowed origin (http://localhost:3000) -> HTTP ${goodCors.statusCode}: ${goodCors.body}`);

  console.log("\n=== STEP 4: RATE LIMITER COLD START / FAIL CLOSED TEST ===");
  const rlRes = await request({
    hostname: "localhost", port: 3000, path: "/api/auth/login", method: "POST",
    headers: { "Content-Type": "application/json" }
  }, { identifier: "spammer", password: "wrong", pin: "000000" });
  console.log(`Rate limit check when DB offline -> HTTP ${rlRes.statusCode}: ${rlRes.body}`);

  console.log("\n=== STEP 5: SYSTEM ROUTES AUTHENTICATION ===");
  const sysRoutes = ["/api/system/verify-drive", "/api/system/run-backup"];
  for (const r of sysRoutes) {
    const noTok = await request({ hostname: "localhost", port: 3000, path: r, method: "GET" });
    console.log(`${r} (No token) -> HTTP ${noTok.statusCode}: ${noTok.body}`);
    const nonAuthTok = await request({
      hostname: "localhost", port: 3000, path: r, method: "GET",
      headers: { "Authorization": `Bearer ${accToken}` }
    });
    console.log(`${r} (Accountant token) -> HTTP ${nonAuthTok.statusCode}: ${nonAuthTok.body}`);
    const withAuthTok = await request({
      hostname: "localhost", port: 3000, path: r, method: "GET",
      headers: { "Authorization": `Bearer ${authToken}` }
    });
    console.log(`${r} (Authenticator token) -> HTTP ${withAuthTok.statusCode}: ${withAuthTok.body}`);
  }

  console.log("\n=== STEP 6: CSP 'unsafe-eval' CHECK ===");
  const headRes = await request({ hostname: "localhost", port: 3000, path: "/", method: "GET" });
  const csp = headRes.headers["content-security-policy"] || "";
  console.log("CSP Header:", csp);
  console.log("Contains 'unsafe-eval':", csp.includes("unsafe-eval"));

  console.log("\n=== STEP 7: REAL ACCOUNTS LOGIN VERIFICATION ===");
  console.log("admin1 login status:", admin1Login.statusCode, "role:", admin1Data.user?.role, "token received:", Boolean(admin1Token));
  console.log("admin2_erragattugutta_c1 login status:", admin2Login.statusCode, "role:", admin2Data.user?.role, "token received:", Boolean(admin2Data.token));
  console.log("accountant login status:", accLogin.statusCode, "role:", accData.user?.role, "token received:", Boolean(accToken));
}

runTests();
