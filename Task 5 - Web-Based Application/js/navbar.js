  let navOut = document.getElementById("navLoggedOut");
  let navIn = document.getElementById("navLoggedIn");
  let userNav = document.getElementById("navUsername");
  console.log("test");

  async function callAPI(payload) {
  const res = await fetch('/api/api.php', {
    method: 'POST',
    credentials: 'same-origin',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(payload)
  });
  return res.json();
}
  const data = callAPI({type: "CheckAuthorisation"});
  if (data.logged_in === true) {
    navOut.style.visibility = "hidden";
    navIn.style.visibility = "block";
    userNav.textContent = data.username;
  } else {
    navOut.style.visibility = "block";
    navIn.style.visibility = "hidden";
  }