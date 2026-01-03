import { Amplify } from "aws-amplify";

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: "us-east-2_yv9hw55Qg",
      userPoolClientId: "1mfa753fq78nd9n28vgpmul08b",
      loginWith: {
        email: true,
      },
      signUpVerificationMethod: "code",
    },
  },
});
