import { CognitoJwtVerifier } from "aws-jwt-verify";

let verifier: ReturnType<typeof CognitoJwtVerifier.create> | undefined;

function getVerifier() {
  const userPoolId = process.env.COGNITO_USER_POOL_ID;
  const clientId = process.env.COGNITO_CLIENT_ID;

  if (!userPoolId || !clientId) {
    throw new Error("COGNITO_USER_POOL_ID and COGNITO_CLIENT_ID are required for auth.");
  }

  verifier ??= CognitoJwtVerifier.create({
    userPoolId,
    tokenUse: "access",
    clientId,
  });

  return verifier;
}

export async function verifyCognitoToken(token: string) {
  return getVerifier().verify(token);
}
