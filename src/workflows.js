window.MUONGOZO_WORKFLOWS = [
  {
    id: "generic-login",
    name: "Login flow",
    match: { urlIncludes: ["login", "signin"] },
    steps: [
      { id: "username", text: "Enter your username in the username/email field.", selector: 'input[type="email"], input[name*="user"], input[name*="email"]' },
      { id: "password", text: "Enter your password.", selector: 'input[type="password"]' },
      { id: "submit", text: "Click Sign in / Login to continue.", selector: 'button[type="submit"], input[type="submit"], button' }
    ]
  }
];
