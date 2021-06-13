import React, { useState, useEffect, useRef } from "react";
import { Magic, RPCError } from "magic-sdk";
import { Suoli } from "@jfrancos/suoli";
const { MAGIC_PUBLISHABLE_KEY } = import.meta.env;

let magic;

if (MAGIC_PUBLISHABLE_KEY) {
  magic = new Magic(MAGIC_PUBLISHABLE_KEY, { testMode: false });
}

const Auth = () => {
  const [loginError, setLoginError] = useState(null);
  const [user, setUser] = useState(null);

  const handleEmail = async (email) => {
    setLoginError(null);
    try {
      await magic.auth.loginWithMagicLink({ email });
      setUser(await magic.user.getMetadata());
    } catch (err) {
      if (err instanceof RPCError) {
        setLoginError(err.rawMessage);
      } else {
        console.log("Unknown error");
        throw err;
      }
    }
  };

  useEffect(async () => {
    if (user) {
      const response = await fetch('/api/auth', {
        method: 'post',
        body: JSON.stringify(user),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const { secret } = await response.json();
      console.log(secret);
    }
  });


  // useEffect(() => {
  //   magic.user.logout()
  // })

  useEffect(async () => {
    try {
      setUser(await magic.user.getMetadata());
    } catch {
      setUser(null);
    }
  }, []);

  return user ? (
    <div className="top-0 right-0 mr-16 mt-8 fixed">{user.email}</div>
  ) : magic ? (
    <Suoli
      error={loginError}
      onEmail={handleEmail}
      className="top-0 right-0 mr-16 mt-8 fixed"
    />
  ) : null;
};
export { Auth };
