// Default demo accounts so you can log in right away
const DEFAULT_USERS = [
  { id: 1, 
    fullName: "Rahul Verma", 
    username: "rahul", 
    password: "123", 
    role: "manager" },
  { id: 2, 
    fullName: "Hima Varshini", 
    username: "hima", 
    password: "123", 
    role: "auditor" },
  { id: 3, 
    fullName: "Meena Iyer", 
    username: "meena", 
    password: "123", 
    role: "employee" },
  {id: 4,
   fullName: "Priya Sharma",
   username: "priya",
   password: "123",
   role: "employee"
  },
  { id: 5, 
  fullName: "Raghu Kumar", 
  username: "raghu", 
  password: "123", 
  role: "employee" }
];

export function getUsers() {
  const data = localStorage.getItem("fp_users");
  if (!data) {
    localStorage.setItem("fp_users", JSON.stringify(DEFAULT_USERS));
    return DEFAULT_USERS;
  }
  return JSON.parse(data);
}

export function saveUsers(users) {
  localStorage.setItem("fp_users", JSON.stringify(users));
}

export function getRequests() {
  const data = localStorage.getItem("fp_requests");
  return data ? JSON.parse(data) : [];
}

export function saveRequests(requests) {
  localStorage.setItem("fp_requests", JSON.stringify(requests));
}

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





export function getExpenses() {
  const data = localStorage.getItem("fp_expenses");
  return data ? JSON.parse(data) : [];
}

export function saveExpenses(expenses) {
  localStorage.setItem("fp_expenses", JSON.stringify(expenses));
}