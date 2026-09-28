function config() {
  const userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID;
  const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID;
  if (!userPoolId || !clientId) throw new Error("O login ainda não está configurado nesta versão.");
  return { userPoolId, clientId };
}

async function callCognito<T>(target: string, body: object) {
  const { userPoolId } = config();
  const response = await fetch(`https://cognito-idp.${userPoolId.split("_")[0]}.amazonaws.com/`, {
    method: "POST",
    headers: { "content-type": "application/x-amz-json-1.1", "x-amz-target": `AWSCognitoIdentityProviderService.${target}` },
    body: JSON.stringify(body),
  });
  const data = await response.json() as T & { message?: string };
  if (!response.ok) throw new Error(data.message || "Não foi possível concluir a entrada.");
  return data;
}

export async function requestEmailCode(email: string) {
  const { clientId } = config();
  const result = await callCognito<{ ChallengeName?: string; Session?: string }>("InitiateAuth", {
    AuthFlow: "USER_AUTH",
    ClientId: clientId,
    AuthParameters: { USERNAME: email, PREFERRED_CHALLENGE: "EMAIL_OTP" },
  });
  if (result.ChallengeName !== "EMAIL_OTP" || !result.Session) throw new Error("Não foi possível enviar o código agora.");
  return result.Session;
}

export async function confirmEmailCode(email: string, code: string, session: string) {
  const { clientId } = config();
  const result = await callCognito<{ AuthenticationResult?: { IdToken?: string } }>("RespondToAuthChallenge", {
    ClientId: clientId,
    ChallengeName: "EMAIL_OTP",
    Session: session,
    ChallengeResponses: { USERNAME: email, EMAIL_OTP_CODE: code },
  });
  if (!result.AuthenticationResult?.IdToken) throw new Error("Código inválido ou expirado.");
  return result.AuthenticationResult;
}
