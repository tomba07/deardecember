import {betterAuth} from 'better-auth';
export function createAuth({db,baseURL,secret,sendEmail,afterDelete}){
 if(!secret||secret.length<32)throw Error('BETTER_AUTH_SECRET must contain at least 32 characters.');
 return betterAuth({
  appName:'Dear December',baseURL,secret,database:db,trustedOrigins:[new URL(baseURL).origin],
  emailAndPassword:{enabled:true,minPasswordLength:12,maxPasswordLength:128,requireEmailVerification:true,revokeSessionsOnPasswordReset:true,resetPasswordTokenExpiresIn:1800,
   sendResetPassword:async({user,url})=>sendEmail(user.email,'Reset your Dear December password',`Choose a new password. This link expires in 30 minutes.\n\n${url}`)},
  emailVerification:{sendOnSignUp:true,sendOnSignIn:true,autoSignInAfterVerification:true,expiresIn:3600,
   sendVerificationEmail:async({user,url})=>sendEmail(user.email,'Verify your Dear December email',`Confirm your email to start your journal. This link expires in one hour.\n\n${url}`)},
  user:{deleteUser:{enabled:true,afterDelete:async user=>afterDelete(user.id)}},
  session:{expiresIn:60*60*24*30,updateAge:60*60*24,freshAge:300},
  rateLimit:{enabled:true,storage:'database',window:60,max:60,customRules:{'/sign-in/email':{window:60,max:5},'/sign-up/email':{window:60,max:3},'/request-password-reset':{window:60,max:3},'/send-verification-email':{window:60,max:3}}},
  advanced:{ipAddress:{ipAddressHeaders:['x-real-ip']}}
 });
}
export async function sendProductionEmail(to,subject,text){
 if(!process.env.RESEND_API_KEY||!process.env.EMAIL_FROM)throw Error('Email delivery is not configured.');
 const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:process.env.EMAIL_FROM,to:[to],subject,text:text+'\n\nIf you did not request this, you can ignore this email.'}),signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error('Email delivery failed.');
}
