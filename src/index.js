<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Protected Site</title>
  <style>
    /* Style for the overlay */
    #passwordOverlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.8);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
    }

    /* Hidden content before password is entered */
    #mainContent {
      display: none;
    }

    /* Simple input style */
    input {
      padding: 10px;
      font-size: 16px;
    }

    button {
      padding: 10px;
      font-size: 16px;
      margin-left: 10px;
    }
  </style>
</head>
<body>
  <!-- The password overlay -->
  <div id="passwordOverlay">
    <div>
      <h2>Enter Password</h2>
      <input type="password" id="passwordInput" placeholder="Enter password" />
      <button onclick="checkPassword()">Submit</button>
      <p id="errorMessage" style="color: red;"></p>
    </div>
  </div>

  <!-- Hidden content that appears after correct password -->
  <div id="mainContent">
    <h1>Welcome to the site!</h1>
    <p>This content is hidden until the correct password is entered.</p>
    <!-- Add the rest of your site content here -->
  </div>

  <script>
    const correctPassword = '1234'; // The password variable (changeable)

    function checkPassword() {
      const input = document.getElementById('passwordInput').value;
      const errorMessage = document.getElementById('errorMessage');

      if (input === correctPassword) {
        // Hide the password overlay and show the main content
        document.getElementById('passwordOverlay').style.display = 'none';
        document.getElementById('mainContent').style.display = 'block';
      } else {
        errorMessage.textContent = 'Incorrect password.';
      }
    }
  </script>
</body>
</html>
