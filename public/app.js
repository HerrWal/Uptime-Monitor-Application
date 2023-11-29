/*
 * Frontend Logic for application
 */

// Container for frontend application
const app = {};

// Config
app.config = {
  sessionToken: false,
};

// AJAX Client (for RESTful API)
app.client = {};

// Interface for making API calls
app.client.request = (headers, path, method, queryStringObject, payload, callback) => {
  // Set defaults
  headers = headers || {};
  path = typeof path === 'string' ? path : '/';
  method =
    typeof method === 'string' && ['POST', 'GET', 'PUT', 'DELETE'].indexOf(method.toUpperCase()) > -1
      ? method.toUpperCase()
      : 'GET';
  queryStringObject = queryStringObject || {};
  payload = payload || {};
  callback = typeof callback === 'function' ? callback : false;

  // For each query string parameter sent, add it to the path
  let requestUrl = `${path}?`;
  let counter = 0;
  for (const queryKey in queryStringObject) {
    if (queryStringObject.hasOwnProperty(queryKey)) {
      counter++;
      if (counter > 1) {
        requestUrl += '&';
      }
      requestUrl += `${queryKey}=${queryStringObject[queryKey]}`;
    }
  }

  // Form the http request as a JSON type
  const xhr = new XMLHttpRequest();
  xhr.open(method, requestUrl, true);
  xhr.setRequestHeader('Content-type', 'application/json');

  // For each header sent, add it to the request
  for (const headerKey in headers) {
    if (headers.hasOwnProperty(headerKey)) {
      xhr.setRequestHeader(headerKey, headers[headerKey]);
    }
  }

  // If there is a current session token set, add that as a header
  if (app.config.sessionToken) {
    xhr.setRequestHeader('token', app.config.sessionToken.id);
  }

  // When the request comes back, handle the response
  xhr.onreadystatechange = function () {
    if (xhr.readyState == XMLHttpRequest.DONE) {
      const statusCode = xhr.status;
      const responseReturned = xhr.responseText;

      // Callback if requested
      if (callback) {
        try {
          const parsedResponse = JSON.parse(responseReturned);
          callback(statusCode, parsedResponse);
        } catch (e) {
          callback(statusCode, false);
        }
      }
    }
  };

  // Send the payload as JSON
  const payloadString = JSON.stringify(payload);
  xhr.send(payloadString);
};

// Bind the logout button
app.bindLogoutButton = () => {
  document.getElementById('logoutButton').addEventListener('click', (e) => {
    e.preventDefault();
    app.logUserOut();
  });
};

// Log the user out then redirect them
app.logUserOut = (redirectUser = true) => {
  const tokenId = typeof app.config.sessionToken.id === 'string' ? app.config.sessionToken.id : false;

  const queryStringObject = {
    id: tokenId,
  };

  app.client.request(undefined, 'api/tokens', 'DELETE', queryStringObject, undefined, (statusCode, responsePayload) => {
    app.setSessionToken(false);

    if (redirectUser) {
      window.location = '/session/deleted';
    }
  });
};

// Bind the forms
app.bindForms = () => {
  if (document.querySelector('form')) {
    const allForms = document.querySelectorAll('form');
    for (let i = 0; i < allForms.length; i++) {
      allForms[i].addEventListener('submit', (e) => {
        e.preventDefault();
        const formId = allForms[i].id;
        const path = allForms[i].action;
        let method = allForms[i].method.toUpperCase();

        document.querySelector(`#${formId} .formError`).style.display = 'none';

        if (document.querySelector(`#${formId} .formSuccess`)) {
          document.querySelector(`#${formId} .formSuccess`).style.display = 'none';
        }

        const payload = {};
        const elements = allForms[i].elements;
        for (let j = 0; j < elements.length; j++) {
          if (elements[j].type !== 'submit') {
            const classOfElement = elements[j].classList.value || '';
            const valueOfElement =
              elements[j].type == 'checkbox' && classOfElement.indexOf('multiselect') == -1
                ? elements[j].checked
                : classOfElement.indexOf('intval') == -1
                ? elements[j].value
                : parseInt(elements[j].value);

            const elementIsChecked = elements[j].checked;
            let nameOfElement = elements[j].name;

            if (nameOfElement == '_method') {
              method = valueOfElement;
            } else {
              if (nameOfElement == 'httpmethod') {
                nameOfElement = 'method';
              }
              if (nameOfElement == 'uid') {
                nameOfElement = 'id';
              }

              if (classOfElement.indexOf('multiselect') > -1) {
                if (elementIsChecked) {
                  payload[nameOfElement] = payload[nameOfElement] instanceof Array ? payload[nameOfElement] : [];
                  payload[nameOfElement].push(valueOfElement);
                }
              } else {
                payload[nameOfElement] = valueOfElement;
              }
            }
          }
        }

        const queryStringObject = method == 'DELETE' ? payload : {};

        app.client.request(undefined, path, method, queryStringObject, payload, (statusCode, responsePayload) => {
          if (statusCode !== 200) {
            if (statusCode == 403) {
              app.logUserOut();
            } else {
              const error = typeof responsePayload.Error === 'string' ? responsePayload.Error : 'An error has occurred, please try again';
              document.querySelector(`#${formId} .formError`).innerHTML = error;
              document.querySelector(`#${formId} .formError`).style.display = 'block';
            }
          } else {
            app.formResponseProcessor(formId, payload, responsePayload);
          }
        });
      });
    }
  }
};

// Form response processor
app.formResponseProcessor = (formId, requestPayload, responsePayload) => {
  let functionToCall = false;

  if (formId == 'accountCreate') {
    const newPayload = {
      phone: requestPayload.phone,
      password: requestPayload.password,
    };

    app.client.request(undefined, 'api/tokens', 'POST', undefined, newPayload, (newStatusCode, newResponsePayload) => {
      if (newStatusCode !== 200) {
        document.querySelector(`#${formId} .formError`).innerHTML = 'Sorry, an error has occurred. Please try again.';
        document.querySelector(`#${formId} .formError`).style.display = 'block';
      } else {
        app.setSessionToken(newResponsePayload);
        window.location = '/checks/all';
      }
    });
  }

  if (formId == 'sessionCreate') {
    app.setSessionToken(responsePayload);
    window.location = '/checks/all';
  }

  const formsWithSuccessMessages = ['accountEdit1', 'accountEdit2', 'checksEdit1'];
  if (formsWithSuccessMessages.indexOf(formId) > -1) {
    document.querySelector(`#${formId} .formSuccess`).style.display = 'block';
  }

  if (formId == 'accountEdit3') {
    app.logUserOut(false);
    window.location = '/account/deleted';
  }

  if (formId == 'checksCreate') {
    window.location = '/checks/all';
  }

  if (formId == 'checksEdit2') {
    window.location = '/checks/all';
  }
};

// Get the session token from local storage and set it in the app.config object
app.getSessionToken = () => {
  const tokenString = localStorage.getItem('token');
  if (typeof tokenString === 'string') {
    try {
      const token = JSON.parse(tokenString);
      app.config.sessionToken = token;
      if (typeof token === 'object') {
        app.setLoggedInClass(true);
      } else {
        app.setLoggedInClass(false);
      }
    } catch (e) {
      app.config.sessionToken = false;
      app.setLoggedInClass(false);
    }
  }
};

// Set (or remove) the loggedIn class from the body
app.setLoggedInClass = (add) => {
  const target = document.querySelector('body');
  if (add) {
    target.classList.add('loggedIn');
  } else {
    target.classList.remove('loggedIn');
  }
};

// Set the session token in the app.config object as well as local storage
app.setSessionToken = (token) => {
  app.config.sessionToken = token;
  const tokenString = JSON.stringify(token);
  localStorage.setItem('token', tokenString);
  if (typeof token === 'object') {
    app.setLoggedInClass(true);
  } else {
    app.setLoggedInClass(false);
  }
};

// Renew the token
app.renewToken = (callback) => {
  const currentToken = app.config.sessionToken;

  if (currentToken) {
    const payload = {
      id: currentToken.id,
      extend: true,
    };

    app.client.request(undefined, 'api/tokens', 'PUT', undefined, payload, (statusCode, responsePayload) => {
      if (statusCode == 200) {
        const queryStringObject = { id: currentToken.id };

        app.client.request(undefined, 'api/tokens', 'GET', queryStringObject, undefined, (statusCode, responsePayload) => {
          if (statusCode == 200) {
            app.setSessionToken(responsePayload);
            callback(false);
          } else {
            app.setSessionToken(false);
            callback(true);
          }
        });
      } else {
        app.setSessionToken(false);
        callback(true);
      }
    });
  } else {
    app.setSessionToken(false);
    callback(true);
  }
};

// Load data on the page
app.loadDataOnPage = () => {
  const bodyClasses = document.querySelector('body').classList;
  const primaryClass = bodyClasses[0];

  if (primaryClass == 'accountEdit') {
    app.loadAccountEditPage();
  }

  if (primaryClass == 'checksList') {
    app.loadChecksListPage();
  }

  if (primaryClass == 'checksEdit') {
    app.loadChecksEditPage();
  }
};

// Load the account edit page specifically
app.loadAccountEditPage = () => {
  const phone = app.config.sessionToken.phone;

  if (phone) {
    const queryStringObject = {
      phone: phone,
    };

    app.client.request(undefined, 'api/users', 'GET', queryStringObject, undefined, (statusCode, responsePayload) => {
      if (statusCode == 200) {
        document.querySelector('#accountEdit1 .firstNameInput').value = responsePayload.firstName;
        document.querySelector('#accountEdit1 .lastNameInput').value = responsePayload.lastName;
        document.querySelector('#accountEdit1 .displayPhoneInput').value = responsePayload.phone;

        const hiddenPhoneInputs = document.querySelectorAll('input.hiddenPhoneNumberInput');
        hiddenPhoneInputs.forEach((input) => {
          input.value = responsePayload.phone;
        });
      } else {
        app.logUserOut();
      }
    });
  } else {
    app.logUserOut();
  }
};

// Load the dashboard page specifically
app.loadChecksListPage = () => {
  const phone = app.config.sessionToken.phone;

  if (phone) {
    const queryStringObject = {
      phone: phone,
    };

    app.client.request(undefined, 'api/users', 'GET', queryStringObject, undefined, (statusCode, responsePayload) => {
      if (statusCode == 200) {
        const allChecks = responsePayload.checks || [];

        if (allChecks.length > 0) {
          allChecks.forEach((checkId) => {
            const newQueryStringObject = {
              id: checkId,
            };

            app.client.request(undefined, 'api/checks', 'GET', newQueryStringObject, undefined, (statusCode, responsePayload) => {
              if (statusCode == 200) {
                const checkData = responsePayload;
                const table = document.getElementById('checksListTable');
                const tr = table.insertRow(-1);
                tr.classList.add('checkRow');

                const td0 = tr.insertCell(0);
                const td1 = tr.insertCell(1);
                const td2 = tr.insertCell(2);
                const td3 = tr.insertCell(3);
                const td4 = tr.insertCell(4);

                td0.innerHTML = responsePayload.method.toUpperCase();
                td1.innerHTML = responsePayload.protocol + '://';
                td2.innerHTML = responsePayload.url;
                const state = responsePayload.state || 'unknown';
                td3.innerHTML = state;
                td4.innerHTML = `<a href="/checks/edit?id=${responsePayload.id}">View / Edit / Delete</a>`;
              } else {
                console.log('Error trying to load check ID: ', checkId);
              }
            });
          });

          if (allChecks.length < 5) {
            document.getElementById('createCheckCTA').style.display = 'block';
          }
        } else {
          document.getElementById('noChecksMessage').style.display = 'table-row';
          document.getElementById('createCheckCTA').style.display = 'block';
        }
      } else {
        app.logUserOut();
      }
    });
  } else {
    app.logUserOut();
  }
};

// Load the checks edit page specifically
app.loadChecksEditPage = () => {
    // Get the check id from the query string, if none is found then redirect back to dashboard
    const id =
      typeof window.location.href.split('=')[1] === 'string' &&
      window.location.href.split('=')[1].length > 0
        ? window.location.href.split('=')[1]
        : false;
  
    if (id) {
      // Fetch the check data
      const queryStringObject = {
        id,
      };
  
      app.client.request(
        undefined,
        'api/checks',
        'GET',
        queryStringObject,
        undefined,
        (statusCode, responsePayload) => {
          if (statusCode === 200) {
            // Put the hidden id field into both forms
            const hiddenIdInputs = document.querySelectorAll("input.hiddenIdInput");
            hiddenIdInputs.forEach((input) => (input.value = responsePayload.id));
  
            // Put the data into the top form as values where needed
            document.querySelector("#checksEdit1 .displayIdInput").value = responsePayload.id;
            document.querySelector("#checksEdit1 .displayStateInput").value = responsePayload.state;
            document.querySelector("#checksEdit1 .protocolInput").value = responsePayload.protocol;
            document.querySelector("#checksEdit1 .urlInput").value = responsePayload.url;
            document.querySelector("#checksEdit1 .methodInput").value = responsePayload.method;
            document.querySelector("#checksEdit1 .timeoutInput").value = responsePayload.timeoutSeconds;
  
            const successCodeCheckboxes = document.querySelectorAll(
              "#checksEdit1 input.successCodesInput"
            );
  
            successCodeCheckboxes.forEach((checkbox) => {
              if (responsePayload.successCodes.indexOf(parseInt(checkbox.value)) > -1) {
                checkbox.checked = true;
              }
            });
          } else {
            // If the request comes back as something other than 200, redirect back to dashboard
            window.location = '/checks/all';
          }
        }
      );
    } else {
      window.location = '/checks/all';
    }
  };
  
  // Loop to renew token often
  app.tokenRenewalLoop = () => {
    setInterval(() => {
      app.renewToken((err) => {
        if (!err) {
          console.log(`Token renewed successfully @ ${Date.now()}`);
        }
      });
    }, 1000 * 60);
  };
  
  // Init (bootstrapping)
  app.init = () => {
    // Bind all form submissions
    app.bindForms();
  
    // Bind logout logout button
    app.bindLogoutButton();
  
    // Get the token from localstorage
    app.getSessionToken();
  
    // Renew token
    app.tokenRenewalLoop();
  
    // Load data on page
    app.loadDataOnPage();
  };
  
  // Call the init processes after the window loads
  window.onload = () => {
    app.init();
  };