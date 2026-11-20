// Paste your JSONBin details here
const BIN_ID = "6b008f03ac6210605a9813c3";
const API_KEY = "$2a$10$QQ5FopAWkU0wYOGQQwrgxumAXtMA.SiN.TW3ldOXIR0lelnN0A1bK";

const BASE_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

// Read all data (users, requests, expenses) from JSONBin
async function getAllData() {
  const res = await fetch(`${BASE_URL}/latest`, {
    headers: {
      "X-Master-Key": API_KEY,
    },
  });

  if (!res.ok) {
    throw new Error("Could not load data from JSONBin.");
  }

  const json = await res.json();
  const record = json.record || {};

  return {
    users: record.users || [],
    requests: record.requests || [],
    expenses: record.expenses || [],
  };
}

// Save all data back to JSONBin
async function saveAllData(data) {
  const res = await fetch(BASE_URL, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-Master-Key": API_KEY,
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    throw new Error("Could not save data (check if bin exceeded 100 KB limit).");
  }
}

// --- SHARED CLOUD DATA (Synced across all laptops/phones) ---
export async function getUsers() {
  const data = await getAllData();
  return data.users;
}

export async function saveUsers(users) {
  const data = await getAllData();
  data.users = users;
  await saveAllData(data);
}

export async function getRequests() {
  const data = await getAllData();
  return data.requests;
}

export async function saveRequests(requests) {
  const data = await getAllData();
  data.requests = requests;
  await saveAllData(data);
}

export async function getExpenses() {
  const data = await getAllData();
  return data.expenses;
}

export async function saveExpenses(expenses) {
  const data = await getAllData();
  data.expenses = expenses;
  await saveAllData(data);
}

// --- DEVICE-ONLY LOGIN SESSION (Stays in localStorage) ---
export function getSession() {
  const data = localStorage.getItem("fp_session");
  return data ? JSON.parse(data) : null;
}

export function saveSession(user) {
  localStorage.setItem("fp_session", JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem("fp_session");
}