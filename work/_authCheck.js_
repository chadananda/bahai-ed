

/**
 * Checks if the database is connected.
 * @returns {Promise<boolean>} A promise that resolves with a boolean indicating if the database is connected.
 */
// export async function checkDatabase() {
//   // Actual implementation to check if the database is connected
//   try {
//     const response = await fetch('/api/check-admin-setup'); // Using check-admin-setup.js as the database status endpoint
//     if (response.ok && response.status === 200) {
//       const data = await response.json();
//       return data.databaseConnected; // Assuming the endpoint returns a JSON object with a boolean databaseConnected property
//     }
//     return false;
//   } catch (error) {
//     return false;
//   }
// }

/**
 * Checks if the authentication system is set up.
 * @returns {Promise<boolean>} A promise that resolves with a boolean indicating if authentication is set up.
 */
// export async function checkAuthentication() {
//   // Actual implementation to check if the authentication system is set up
//   try {
//     const response = await fetch('/api/verify-token'); // Using verify-token.js as the authentication status endpoint
//     if (response.ok && response.status === 200) {
//       const data = await response.json();
//       return data.authenticationSetup; // Assuming the endpoint returns a JSON object with a boolean authenticationSetup property
//     }
//     return false;
//   } catch (error) {
//     return false;
//   }
// }

// src/utils/checkUser.js
export async function checkUser(request) {
  // console.log('checking user')
  const failedUser = {authenticated: false, role: "guest", email:null, error:null};
  const cookies = request.headers.get('cookie');
  if (!cookies) return failedUser;
  const sessionCookie = cookies.split('; ').find(row => row.startsWith('session='));
  if (!sessionCookie) return failedUser;
  try {
      const sessionData = decodeURIComponent(sessionCookie.split('=')[1]);
      const user = JSON.parse(sessionData);
      // Assuming the existence of a user object indicates authentication
    //  console.log('user authentication confirmed')
      return { authenticated: true, ...user };
  } catch (error) {
      console.error('Error parsing session data:', error);
      return failedUser;
  }
}

export async function userLogout() {
  //console.log('userLogout')
  await fetch('/api/logout');
  location.reload(); // Refresh the current page
}
