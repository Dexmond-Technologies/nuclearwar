function initGoogleBtnFast() {
              if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
                google.accounts.id.initialize({
                  client_id: "787878787390-opqat1n6on9vp0sk8ilkn4qv1t6je1tp.apps.googleusercontent.com",
                  callback: function(r) { handleGoogleCredentialResponse(r); },
                  auto_prompt: false
                });
                google.accounts.id.renderButton(
                  document.getElementById("google-btn-fast"),
                  { theme: "filled_black", size: "large", type: "standard", shape: "rectangular", text: "continue_with", logo_alignment: "left" }
                );
              } else {
                setTimeout(initGoogleBtnFast, 50);
              }
            }
            initGoogleBtnFast();