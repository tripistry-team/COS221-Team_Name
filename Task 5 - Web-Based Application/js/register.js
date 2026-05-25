<<<<<<< HEAD
function validateForm() {

    let name = document.getElementById("fname").value.trim();
    let surname = document.getElementById("lname").value.trim();
    let middle = document.getElementById("mname").value.trim();
    let country = document.getElementById("selCountry").value.trim();
    let agency = document.getElementById("agencyName").value.trim();
    let username = document.getElementById("username").value.trim();
    let email = document.getElementById("email").value.trim();
    let password = document.getElementById("pword").value;
    let cPassword = document.getElementById("cPword").value;
    let contactNum = document.getElementById("num").value.trim();
    let cbxAgree = document.getElementById("cbxAgree").value.trim();
    let desc = document.getElementById("agencyDesc").value.trim();

   if (!name || !surname) {
        console.log("Name and surname are required.");
        return false;
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i; 
    if (!emailRegex.test(email)) {
        console.log ("Enter a valid email.");
        return false;
    }

    const passRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[\W_]).{9,}$/;
    
    if (!passRegex.test(password)) {
        console.log("Password must be >8 chars, contain at least one of upper/lowercase letter, digit and symbol.");
        return false;
    }

    //const role = document.getElementById('role-agency').classList.contains('active') ? 'agency' : 'traveller';
    //window.location.href = role === 'agency' ? 'agency-dashboard.html' : 'traveller-dashboard.html';

    if (sessionStorage.getItem("userType") === 'agency') {
        agencyAPI("RegisterAgency", agency, email, desc);
    } else {
        travellerAPI("RegisterTraveller", name, middle, surname, email, country, username, password);
    }

    return false;  
}

function travellerAPI(apitype, name, mid, surname, email, country, username, password) {
    let body = {
        "type": apitype,
        "f_name": name,
        "mid_init": mid,
        "s_name": surname,
        "email": email,
        "country": country
    };

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "https://wheatley.cs.up.ac.za/u25011503/PA5/COS221Practical5/Task 5 - Web-Based Application/pages/api/api.php", true); 
    xhr.setRequestHeader("Content-Type", "application/json");


    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {   
            if (xhr.status === 200) {
                const data = JSON.parse(xhr.responseText);
                console.log("API RESPONSE:", data);
        
            } else {
          //      const data = JSON.parse(xhr.responseText);
          console.log(xhr.responseText);
               // console.log("XHR ERROR:", xhr.status);
            }
        } 
    };

    xhr.send(JSON.stringify(body));

    userAPI("RegisterUser", username, email, password, "traveller");

}

function agencyAPI(apitype, agency, email, desc, username, password) {
    let body = {
        "type": apitype,
        "name": agency,
        "email": email,
        "description": desc
    };

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "https://wheatley.cs.up.ac.za/u25011503/PA5/COS221Practical5/Task 5 - Web-Based Application/pages/api/api.php", true); 
    xhr.setRequestHeader("Content-Type", "application/json");


    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {   
            if (xhr.status === 200) {
                const data = JSON.parse(xhr.responseText);
                console.log("API RESPONSE:", data);
        
            } else {
              //  const data = JSON.parse(xhr.responseText);
              console.log(xhr.responseText);
               // console.log("XHR ERROR:", xhr.status);
            }
        } 
    };


    xhr.send(JSON.stringify(body));

    userAPI("RegisterUser", username, email, password, "agency_staff");

}

function userAPI(apitype, username, email, password, user_type) {
    let body = {
        "type": apitype,
        "username": username,
        "email": email,
        "password": password,
        "user_type": user_type
    };

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "https://wheatley.cs.up.ac.za/u25011503/PA5/COS221Practical5/Task 5 - Web-Based Application/pages/api/api.php", true); 
    xhr.setRequestHeader("Content-Type", "application/json");


    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {   
            if (xhr.status === 200) {
                const data = JSON.parse(xhr.responseText);
                console.log("API RESPONSE:", data);
                document.cookie = "username=" + username + "; logged_in=true; path=/";
        
            } else {
                // const data = JSON.parse(xhr.responseText);
                console.log(xhr.responseText);
               // console.log("XHR ERROR:", xhr.status);
            }
        } 
    };

    xhr.send(JSON.stringify(body));
    if (user_type == "agency_staff") {
        window.location.href = 'agency-dashboard.html';
    } else {
        window.location.href = 'traveller-dashboard.html';
    }
    
    

}

function setRole(role) {
  document.getElementById('role-traveller').classList.toggle('active', role==='traveller');
  document.getElementById('role-agency').classList.toggle('active', role==='agency');
  document.getElementById('traveller-fields').style.display = role==='traveller' ? 'block' : 'none';
  document.getElementById('agency-fields').style.display = role==='agency' ? 'block' : 'none';

  if (role === 'agency') {
    sessionStorage.setItem("userType", "agency");

  } else {
    sessionStorage.setItem("userType", "traveller");
  }
}




=======
const API_URL = '../api/api.php'; // CHANGED: fixed API path from /pages/*.html

async function callAPI(payload) {
  const res = await fetch(API_URL, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

function setRole(role) {
  document.getElementById('role-traveller').classList.toggle('active', role === 'traveller');
  document.getElementById('role-agency').classList.toggle('active', role === 'agency');
  document.getElementById('traveller-fields').style.display = role === 'traveller' ? 'block' : 'none';
  document.getElementById('agency-fields').style.display = role === 'agency' ? 'block' : 'none';
}

async function handleRegister() {
  const isAgency = document.getElementById('role-agency').classList.contains('active');

  const firstName = document.getElementById('reg-first-name')?.value.trim() || '';
  const surname = document.getElementById('reg-surname')?.value.trim() || '';
  const midInit = document.getElementById('reg-mid-init')?.value.trim() || 'X';
  const country = document.getElementById('reg-country')?.value.trim() || '';

  const agencyName = document.getElementById('reg-agency-name')?.value.trim() || '';
  const agencyDescription = document.getElementById('reg-agency-description')?.value.trim() || 'No description';

  const username = document.getElementById('reg-username')?.value.trim() || '';
  const email = document.getElementById('reg-email')?.value.trim() || '';
  const password = document.getElementById('reg-password')?.value || '';
  const confirm = document.getElementById('reg-confirm-password')?.value || '';

  if (!username || !email || !password || !confirm) return alert('Please complete all required account fields.');
  if (password !== confirm) return alert('Passwords do not match.');

  let r1;
  if (isAgency) {
    if (!agencyName) return alert('Please enter agency name.');
    r1 = await callAPI({ type: 'RegisterAgency', name: agencyName, email, description: agencyDescription });
  } else {
    if (!firstName || !surname || !country) return alert('Please complete traveller details.');
    r1 = await callAPI({
      type: 'RegisterTraveller',
      f_name: firstName,
      mid_init: midInit,
      s_name: surname,
      email,
      country
    });
  }

  if (r1.status !== 'success') return alert(r1.message || 'Registration failed at profile step.');

  const r2 = await callAPI({
    type: 'RegisterUser',
    username,
    email,
    password,
    user_type: isAgency ? 'agency_staff' : 'traveller'
  });
  if (r2.status !== 'success') return alert(r2.message || 'Registration failed at account step.');

  const loginRes = await callAPI({ type: 'Login', username, password });
  if (loginRes.status !== 'success') return alert('Account created. Please log in.');

  window.location.href = isAgency ? 'agency-dashboard.html' : 'traveller-dashboard.html';
}


>>>>>>> 70616848d52818f49cc3219a454e2a519fd2327f
